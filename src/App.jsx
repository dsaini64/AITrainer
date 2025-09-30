import React, { useState, useEffect, useMemo } from "react";
const API = 'http://localhost:5000';
import HealthSummary from "./HealthSummary";
import ProgressTracking from "./ProgressTracking";
import LongevityInsights from "./LongevityInsights";
import Chatbot from "./Chatbot";
import Suggestions from "./Suggestions";

// --- Helpers for Progress/History UI ---
const USER_ID = 'testuser';
const STATUS_EMOJI = { done: '✓', miss: '✗', unknown: '•' };
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
}

export default function App() {
  const [recommendationData, setRecommendationData] = useState(null);
  const [healthScores, setHealthScores] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [chatMessages, setChatMessages] = useState([]);

  // Progress & History state (from backend SQLite via new endpoints)
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]); // [{date,status,focus_area,task,difficulty,createdAt}]
  const [reloadFlag, setReloadFlag] = useState(0); // bump to refetch

  // === Goals state (multi-goal) ===
  const [goals, setGoals] = useState([]); // [{id,title,category,cadence,active,createdAt,source}]
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("activity");
  const [goalCadence, setGoalCadence] = useState("daily");
  const [healthPlanKey, setHealthPlanKey] = useState(0); // Force HealthPlan to re-render
  const [isRefreshing, setIsRefreshing] = useState(false); // Prevent multiple rapid refreshes
  const [lastRefreshTime, setLastRefreshTime] = useState(0); // Track last refresh to prevent rapid calls
  const [isLocalChange, setIsLocalChange] = useState(false); // Flag to prevent backend sync during local changes
  const [isAddingGoals, setIsAddingGoals] = useState(false); // Flag to prevent multiple goal additions
  const [deletedGoals, setDeletedGoals] = useState(new Set()); // Track deleted goal titles to prevent recreation

  // localStorage persistence
  const GOALS_KEY = "hf_goals_v1";
  const saveGoals = (arr) => {
    setGoals(arr);
    try { localStorage.setItem(GOALS_KEY, JSON.stringify(arr)); } catch {}
  };
  const loadGoals = () => {
    try {
      const raw = localStorage.getItem(GOALS_KEY);
      if (raw) setGoals(JSON.parse(raw));
    } catch {}
  };
  useEffect(() => { loadGoals(); }, []);

  // === Open Activity Tracker (from ScoreForm button) ===
  useEffect(() => {
    const handler = () => {
      try { sessionStorage.removeItem('openActivityTracker'); } catch {}
      setActiveTab('goals');
    };
    // if a flag is already set (e.g., user clicked before mount), honor it
    try {
      if (sessionStorage.getItem('openActivityTracker') === '1') {
        handler();
      }
    } catch {}
    window.addEventListener('openActivityTracker', handler);
    return () => window.removeEventListener('openActivityTracker', handler);
  }, []);

  // Fetch progress stats
  useEffect(() => {
    (async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const res = await fetch(`${API}/api/stats?user_id=${USER_ID}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          // Validate the stats data to prevent UI issues
          if (data && typeof data === 'object') {
            // Ensure all values are valid numbers
            const validatedStats = {
              total_done: Math.max(0, parseInt(data.total_done) || 0),
              consecutive_done: Math.max(0, parseInt(data.consecutive_done) || 0),
              best_streak: Math.max(0, parseInt(data.best_streak) || 0),
              this_week_done: Math.max(0, parseInt(data.this_week_done) || 0),
              this_week_total: Math.max(1, parseInt(data.this_week_total) || 7),
              total_goals: Math.max(0, parseInt(data.total_goals) || 0),
              last_7: Array.isArray(data.last_7) ? data.last_7 : []
            };
            setStats(validatedStats);
          } else {
            setStats(null);
          }
        } else {
          setStats(null);
        }
      } catch (e) { 
        if (e.name === 'AbortError') {
          console.warn('stats fetch timed out');
        } else {
          console.warn('stats fetch failed', e);
        }
        setStats(null);
      }
    })();
  }, [reloadFlag]);

  // Fetch recent check-ins (last 30 days)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/checkins?user_id=${USER_ID}&days=30`);
        if (res.ok) setHistory(await res.json()); else setHistory([]);
      } catch (e) { console.warn('checkins fetch failed', e); setHistory([]); }
    })();
  }, [reloadFlag]);

  const addGoal = async (goal) => {
    const payload = {
      user_id: 'testuser',
      title: goal.title,
      category: goal.category || 'other',
      cadence: goal.cadence || 'daily',
      active: goal.active !== undefined ? goal.active : true
    };
    try {
      const res = await fetch(`${API}/api/goals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      saveGoals([ { ...created, source: goal.source || 'custom' }, ...goals ]);
      setHealthPlanKey(x => x + 1); // Trigger health plan refresh
    } catch (e) {
      console.error('addGoal failed, falling back to local only', e);
      const g = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), active: goal.active !== undefined ? goal.active : true, createdAt: new Date().toISOString(), source: goal.source || 'custom', ...goal };
      saveGoals([g, ...goals]);
      setHealthPlanKey(x => x + 1); // Trigger health plan refresh
    }
  };

  const removeGoal = async (id) => {
    const goalToRemove = goals.find(g => g.id === id);
    if (!goalToRemove) {
      console.warn('removeGoal: Goal not found', id);
      return;
    }
    
    console.log('removeGoal: Deleting goal', goalToRemove.title, 'with source', goalToRemove.source);
    
    // Show confirmation for important goals
    const isImportant = goalToRemove.source === 'plan' || goalToRemove.source === 'suggested';
    if (isImportant) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${goalToRemove.title}"? This will remove it from your progress tracking.`
      );
      if (!confirmed) return;
    }
    
    // Set flag to prevent backend sync from overriding our changes
    setIsLocalChange(true);
    
    // Track deleted goal title to prevent recreation
    setDeletedGoals(prev => new Set([...prev, goalToRemove.title.toLowerCase().trim()]));
    
    // Optimistically update UI first
    const updatedGoals = goals.filter(g => g.id !== id);
    saveGoals(updatedGoals);
    console.log('removeGoal: Updated local goals, now have', updatedGoals.length, 'goals');
    // Don't trigger health plan refresh when deleting - this prevents goal recreation
    
    try {
      // Delete from backend
      console.log('removeGoal: Sending DELETE request to backend for goal', id);
      const res = await fetch(`${API}/api/goals/${id}?user_id=testuser`, { method: 'DELETE' });
      if (!res.ok) {
        // If backend deletion fails, revert the UI change
        console.warn('removeGoal: Backend deletion failed, reverting UI change. Status:', res.status);
        saveGoals(goals); // Revert to original goals
        setIsLocalChange(false);
        return;
      }
      
      console.log('removeGoal: Backend deletion successful');
      // Reset the local change flag after a delay to prevent immediate sync
      setTimeout(() => {
        setIsLocalChange(false);
      }, 500);
    } catch (e) { 
      console.warn('removeGoal: Backend error, reverting UI change:', e);
      // Revert UI change if backend call fails
      saveGoals(goals);
      setIsLocalChange(false);
    }
  };

  const toggleGoal = async (id) => {
    const g = goals.find(x => x.id === id);
    if (!g) return;
    const next = !g.active;
    
    // Show helpful message for pausing goals
    if (!next && g.active) {
      const confirmed = window.confirm(
        `Pause "${g.title}"? You can reactivate it anytime. Your progress will be preserved.`
      );
      if (!confirmed) return;
    }
    
    // Set flag to prevent backend sync from overriding our changes
    setIsLocalChange(true);
    
    saveGoals(goals.map(x => x.id === id ? { ...x, active: next } : x));
    setHealthPlanKey(x => x + 1); // Trigger health plan refresh
    
    try {
      const res = await fetch(`${API}/api/goals/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', active: next })
      });
      
      if (!res.ok) {
        // If backend update fails, revert the UI change
        console.warn('Backend toggle failed, reverting UI change');
        saveGoals(goals); // Revert to original goals
        setIsLocalChange(false);
        return;
      }
      
      // Refresh progress data to ensure consistency
      setTimeout(() => {
        setReloadFlag(x => x + 1);
        setIsLocalChange(false); // Allow backend sync again
      }, 100);
    } catch (e) { 
      console.warn('toggleGoal backend error, reverting UI change:', e);
      // Revert UI change if backend call fails
      saveGoals(goals);
      setIsLocalChange(false);
    }
  };

  const updateGoal = async (id, patch) => {
    saveGoals(goals.map(g => g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g));
    setHealthPlanKey(x => x + 1); // Trigger health plan refresh
    try {
      await fetch(`${API}/api/goals/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', ...patch })
      });
    } catch (e) { console.warn('updateGoal backend error (ignored):', e); }
  };

  // Accept multiple goals (e.g., from HealthPlan) and merge into state/localStorage
  const addGoalsFromPlan = async (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return;
    if (isAddingGoals) {
      console.log('Already adding goals, skipping to prevent loops');
      return;
    }
    
    setIsAddingGoals(true);
    console.log('addGoalsFromPlan called with:', items.length, 'items');
    
    try {
      // Get current goal titles to prevent duplicates
      const existingTitles = new Set(goals.map(g => String(g.title).toLowerCase().trim()));
      const newGoals = [];
      
      for (const it of items) {
        if (!it || !it.title) continue;
        const normalizedTitle = String(it.title).toLowerCase().trim();
        
        // Skip if goal already exists or was previously deleted
        if (existingTitles.has(normalizedTitle)) {
          console.log(`Skipping duplicate goal: "${it.title}"`);
          continue;
        }
        if (deletedGoals.has(normalizedTitle)) {
          console.log(`Skipping previously deleted goal: "${it.title}"`);
          continue;
        }
        
        newGoals.push({ 
          title: it.title, 
          category: it.category || 'other', 
          cadence: it.cadence || 'daily', 
          source: 'plan',
          active: false // Default to inactive for plan goals
        });
      }
      
      if (newGoals.length === 0) {
        console.log('No new goals to add - all already exist');
        return;
      }
      
      console.log(`Adding ${newGoals.length} new goals from plan`);
      
      // Add all new goals at once without triggering multiple health plan refreshes
      const addedGoals = [];
      for (const goal of newGoals) {
        try {
          const payload = {
            user_id: 'testuser',
            title: goal.title,
            category: goal.category || 'other',
            cadence: goal.cadence || 'daily',
            active: goal.active !== undefined ? goal.active : false
          };
          const res = await fetch(`${API}/api/goals`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
          });
          if (res.ok) {
            const created = await res.json();
            addedGoals.push({ ...created, source: goal.source || 'plan' });
          }
        } catch (e) {
          console.error('Failed to add goal:', goal.title, e);
        }
      }
      
      // Update goals list once with all new goals
      if (addedGoals.length > 0) {
        saveGoals([...addedGoals, ...goals]);
        setHealthPlanKey(x => x + 1); // Single health plan refresh
      }
    } finally {
      setIsAddingGoals(false);
    }
  };
  // Sync canonical goals from backend and merge with local
  useEffect(() => {
    // Don't sync if we're making local changes
    if (isLocalChange) return;
    
    (async () => {
      try {
        const res = await fetch(`${API}/api/goals?user_id=testuser`);
        if (res.ok) {
          const serverGoals = await res.json();
          console.log('Backend sync: Server has', serverGoals.length, 'goals, local has', goals.length, 'goals');
          
          // Only sync if we have no local goals OR if server has significantly more goals
          // This prevents server from overriding local deletions
          if (goals.length === 0 || serverGoals.length > goals.length + 1) {
            console.log('Syncing goals from server:', serverGoals.length, 'goals');
            const merged = serverGoals.map(g => ({ 
              ...g, 
              source: goals.find(x => x.id === g.id)?.source || 'server' 
            }));
            saveGoals(merged);
          } else {
            console.log('Skipping sync - local goals are more recent or similar to server');
          }
        }
      } catch (e) {
        console.warn('Could not fetch canonical goals (offline?)', e);
      }
    })();
  }, [isLocalChange]);

  // Generate suggestions when health scores are available (controlled to prevent loops)
  useEffect(() => {
    if (healthScores || sessionStorage.getItem('healthScores')) {
      generateSuggestions();
    }
  }, [healthScores]);

  // === Suggestions (from health data) ===
  const [suggestions, setSuggestions] = useState([]);
  const generateSuggestions = () => {
    const hs = healthScores ?? JSON.parse(sessionStorage.getItem('healthScores') || '{}');
    const recs = Array.isArray(recommendationData) ? recommendationData : (recommendationData?.topRecommendations || []);
    const out = [];
    // Sleep
    const sleepHrs = Number(hs?.Sleep || hs?.sleep || sessionStorage.getItem('sleep')) || 0;
    if (sleepHrs && sleepHrs < 7) out.push({ title: 'Lights out by 11:00 PM', category: 'sleep', cadence: 'daily', rationale: `Current sleep ≈ ${sleepHrs}h (< 7h)` });
    // Activity
    const vo2 = Number(hs?.["VO2 Max"] || sessionStorage.getItem('vo2')) || 0;
    const pref = hs?.["Preferred Activity"] || sessionStorage.getItem('activity') || 'Walking';
    if (vo2 && vo2 < 45) out.push({ title: `Do ${pref} for 20 minutes`, category: 'activity', cadence: 'daily', rationale: `VO2 Max ${vo2} is below target` });
    else out.push({ title: 'Walk 20 minutes', category: 'activity', cadence: 'daily', rationale: 'Baseline movement goal' });
    // Nutrition focus
    const weakest = (hs?.["Weakest Area"] || sessionStorage.getItem('focus') || '').toString().toLowerCase();
    if (weakest.includes('nutrition')) out.push({ title: 'Add one veggie to lunch', category: 'nutrition', cadence: 'daily', rationale: 'Weakest area: nutrition' });
    // Pull one rec title if available
    if (recs?.[0]?.title) out.push({ title: `Complete: ${recs[0].title}`, category: 'other', cadence: 'weekly', rationale: 'Top recommendation' });

    // De-dupe against existing goals and deleted goals by title
    const existing = new Set(goals.map(g=>g.title.toLowerCase()));
    const newSuggestions = out.filter(s => {
      const title = s.title.toLowerCase();
      return !existing.has(title) && !deletedGoals.has(title);
    });
    setSuggestions(newSuggestions);
    
    // Don't auto-add suggestions - let HealthPlan component handle this
    // This prevents duplicate goal creation
  };

  const last7Compact = useMemo(() => {
    if (!stats?.last_7) return '';
    const arr = Array.isArray(stats.last_7) ? stats.last_7 : [];
    if (arr.length === 0) return '';
    
    const symbols = arr.map(d => STATUS_EMOJI[d.status] || STATUS_EMOJI.unknown).join(' ');
    // Only return if we have meaningful data (more than just one unknown symbol)
    return symbols.length > 1 ? symbols : '';
  }, [stats]);

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh"
    }}>
      <div style={{
        padding: "12px",
        width: "90%",
        maxWidth: "800px",
        margin: "0 auto",
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: "2rem",
          margin: 0,
          textAlign: "center",
          maxWidth: "100%",
          whiteSpace: "normal"
        }}>
          HelloFam AI Personal Trainer
        </h1>
        {goals.some(g=>g.active) && (
          <div style={{ fontSize: "0.9rem", color: "#065f46", marginTop: 6 }}>
            Active goals: <strong>{goals.filter(g=>g.active).map(g=>g.title).join(', ')}</strong>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px" }}>
          <button
            className={`special-button ${activeTab === "summary" ? "active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            Health Summary
          </button>
          <button
            className={`special-button ${activeTab === "plan" ? "active" : ""}`}
            onClick={() => setActiveTab("plan")}
          >
            Suggestions
          </button>
          <button
            className={`special-button ${activeTab === "goals" ? "active" : ""}`}
            onClick={() => setActiveTab("goals")}
          >
            Goals
          </button>
          <button
            className={`special-button ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chatbot
          </button>
          {/* Longevity Insights tab commented out
          <button
            className={`special-button ${activeTab === "longevity" ? "active" : ""}`}
            onClick={() => setActiveTab("longevity")}
          >
            Longevity Insights
          </button>
          */}
        </div>
      </div>

      <div style={{
        background: "#fafbfc",
        padding: "16px",
        borderRadius: "10px",
        width: "600px",
        margin: "0 auto",
        flexGrow: 1,
        overflowY: "auto"
      }}>
        {/* Health Summary Tab */}
        <div style={{ display: activeTab === "summary" ? "block" : "none" }}>
          {/* Health Profile Display */}
          <div style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: 16, marginBottom: 12
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem' }}>Your Health Profile</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
              <div style={{ flex: 1, flexShrink: 0 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li>Age: {sessionStorage.getItem('age') || 25}</li>
                  <li>VO2 Max: {sessionStorage.getItem('vo2') || 30}</li>
                  <li>Preferred Activity: {sessionStorage.getItem('activity') || 'Running'}</li>
                  <li>Heart Rate: {sessionStorage.getItem('heartrate') || 70} bpm</li>
                  <li>Sleep: {sessionStorage.getItem('sleep') || 7}h/night</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Progress widget */}
          <div style={{
            background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8,
            padding: 16, marginBottom: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Your Progress</h2>
              <button 
                className="special-button" 
                disabled={isRefreshing}
                onClick={async () => {
                  const now = Date.now();
                  if (isRefreshing || (now - lastRefreshTime) < 2000) return; // Prevent calls within 2 seconds
                  
                  setIsRefreshing(true);
                  setLastRefreshTime(now);
                  try {
                    // Only refresh progress data, not health plan
                    setReloadFlag(x => x + 1);
                    // Add a longer delay to ensure backend has time to process
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {stats ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div>Total Check-ins: <strong>{stats.total_done ?? 0}</strong></div>
                  <div>Current Streak: <strong>{stats.consecutive_done ?? 0}</strong></div>
                  <div>Best Streak: <strong>{stats.best_streak ?? 0}</strong></div>
                </div>
                
                {/* Visual Progress Indicators */}
                <div style={{ 
                  marginBottom: 16, 
                  opacity: isRefreshing ? 0.6 : 1, 
                  transition: 'opacity 0.3s ease, transform 0.2s ease',
                  transform: isRefreshing ? 'scale(0.98)' : 'scale(1)'
                }}>
                  {/* Weekly Progress Bar */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>This Week's Progress</span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {stats.this_week_done || 0} / {stats.this_week_total || 7} days
                      </span>
                    </div>
                    <div style={{
                      width: '100%', height: 8, backgroundColor: '#f3f4f6', borderRadius: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, ((stats.this_week_done || 0) / Math.max(1, stats.this_week_total || 7)) * 100)}%`,
                        height: '100%', backgroundColor: '#10b981', transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Monthly Progress Circle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ position: 'relative', width: 60, height: 60 }}>
                      <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="30" cy="30" r="25"
                          fill="none" stroke="#f3f4f6" strokeWidth="6"
                        />
                        <circle
                          cx="30" cy="30" r="25"
                          fill="none" stroke="#10b981" strokeWidth="6"
                          strokeDasharray={`${2 * Math.PI * 25}`}
                          strokeDashoffset={`${2 * Math.PI * 25 * (1 - Math.min(1, (stats.this_week_done || 0) / Math.max(1, stats.this_week_total || 7)))}`}
                          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        fontSize: '0.7rem', fontWeight: 'bold', color: '#10b981'
                      }}>
                        {Math.round((stats.this_week_done || 0) / Math.max(1, stats.this_week_total || 7) * 100)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: 2 }}>Weekly Progress</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {stats.this_week_done || 0} of {stats.this_week_total || 7} days this week
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Timeline */}
                {last7Compact && last7Compact.length > 3 ? (
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: 8 }}>Recent Activity</div>
                    <div style={{ 
                      display: 'flex', gap: 4, fontSize: 18, 
                      background: '#f9fafb', padding: 8, borderRadius: 6,
                      justifyContent: 'center'
                    }}>
                      {last7Compact}
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem', color: '#6b7280', textAlign: 'center', marginTop: 4,
                      display: 'flex', justifyContent: 'space-between', maxWidth: 200, margin: '4px auto 0'
                    }}>
                      <span>7 days ago</span>
                      <span>Today</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', 
                    background: '#f9fafb', padding: 8, borderRadius: 6,
                    fontStyle: 'italic'
                  }}>
                    Complete your first check-in to see activity history
                  </div>
                )}
              </div>
            ) : (
              <div style={{ 
                color: '#6b7280', 
                textAlign: 'center', 
                padding: '20px',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px dashed #d1d5db'
              }}>
                {isRefreshing ? 'Loading progress data...' : 'Complete your first check-in to see progress tracking.'}
              </div>
            )}
          </div>
        </div>
        {/* Longevity Insights Tab - commented out
        <div style={{ display: activeTab === "longevity" ? "block" : "none" }}>
          <LongevityInsights />
        </div>
        */}
        {/* Goals Tab */}
        <div style={{ display: activeTab === "goals" ? "block" : "none" }}>
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Your Goals</h2>
              <button 
                className="special-button" 
                onClick={generateSuggestions}
                style={{ fontSize: '0.8rem' }}
              >
                Generate Suggestions
              </button>
            </div>
            <p style={{ marginTop: 0, color: "#555" }}>
              Create custom goals, toggle them active/inactive, or delete. Active goals drive chat accountability.
              <br />
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 500 }}>
                💡 Your progress is preserved when pausing goals - no data loss!
              </span>
            </p>
            {suggestions.length > 0 && (
              <div style={{ 
                background: '#f0f9ff', 
                border: '1px solid #0ea5e9', 
                borderRadius: 6, 
                padding: 12, 
                marginBottom: 16 
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>💡 Suggested Goals:</div>
                {suggestions.map((s, i) => (
                  <div key={i} style={{ fontSize: '0.9rem', marginBottom: 4 }}>
                    • {s.title} <span style={{ color: '#666' }}>({s.category})</span>
                  </div>
                ))}
                <button 
                  className="special-button" 
                  onClick={() => addGoalsFromPlan(suggestions)}
                  style={{ marginTop: 8, fontSize: '0.8rem' }}
                >
                  Add All Suggestions as Goals
                </button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={goalTitle}
                onChange={(e)=>setGoalTitle(e.target.value)}
                placeholder="e.g., Walk 20 minutes"
                style={{ flex: '1 1 260px', minWidth: 220, padding: 10, borderRadius: 6, border: '1px solid #d1d5db' }}
              />
              <select value={goalCategory} onChange={(e)=>setGoalCategory(e.target.value)} style={{ padding: 10 }}>
                <option value="activity">Activity</option>
                <option value="sleep">Sleep</option>
                <option value="nutrition">Nutrition</option>
                <option value="mindfulness">Mindfulness</option>
                <option value="recovery">Recovery</option>
                <option value="other">Other</option>
              </select>
              <select value={goalCadence} onChange={(e)=>setGoalCadence(e.target.value)} style={{ padding: 10 }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <button className="special-button" onClick={()=>{ const t = goalTitle.trim(); if(!t) return; addGoal({ title: t, category: goalCategory, cadence: goalCadence, source: 'custom' }); setGoalTitle(''); }}>Add Goal</button>
            </div>

            {goals.length > 0 && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {goals.map(g => (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    border: g.active ? '1px solid #10b981' : '1px solid #d1d5db', 
                    borderRadius: 8, padding: 12,
                    background: g.active ? '#f0fdf4' : '#f8fafc',
                    transition: 'all 0.2s ease',
                    transform: g.active ? 'scale(1)' : 'scale(0.98)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        <div style={{ 
                          fontWeight: 600, 
                          color: g.active ? '#065f46' : '#6b7280',
                          textDecoration: g.active ? 'none' : 'line-through'
                        }}>
                          {g.title}
                        </div>
                        <div style={{ 
                          fontSize: 12, 
                          color: g.active ? '#047857' : '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <span>{g.category} • {g.cadence}</span>
                          {g.source && <span style={{ 
                            background: g.source === 'plan' ? '#dbeafe' : '#fef3c7',
                            color: g.source === 'plan' ? '#1e40af' : '#92400e',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10
                          }}>
                            {g.source}
                          </span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        className="special-button" 
                        onClick={()=>updateGoal(g.id, { active: !g.active })}
                        style={{
                          background: g.active ? '#fef3c7' : '#dbeafe',
                          color: g.active ? '#92400e' : '#1e40af',
                          border: g.active ? '1px solid #f59e0b' : '1px solid #3b82f6'
                        }}
                      >
                        {g.active ? 'Pause' : 'Activate'}
                      </button>
                      <button 
                        className="special-button" 
                        onClick={()=>removeGoal(g.id)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #f87171'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginTop: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Recent Check-ins</h2>
              <button className="special-button" onClick={() => setReloadFlag(x => x + 1)}>Refresh</button>
            </div>
            {history && history.length > 0 ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px', gap: 8, fontWeight: 600, color: '#374151' }}>
                  <div>Date</div>
                  <div>Task</div>
                  <div>Status</div>
                </div>
                <div style={{ height: 8 }} />
                {history.slice(0, 14).map((row) => (
                  <div key={row.date} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px', gap: 8, padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
                    <div>{fmtDate(row.date)}</div>
                    <div>{row.task || <span style={{ color: '#6b7280' }}>—</span>}</div>
                    <div>{STATUS_EMOJI[row.status] || STATUS_EMOJI.unknown} {row.status || 'unknown'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#6b7280', marginTop: 8 }}>No history yet.</div>
            )}
          </div>
        </div>
        {/* Chatbot Tab */}
        <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
          {goals.some(g=>g.active) && (
            <div style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#7c2d12",
              padding: 10,
              borderRadius: 6,
              marginBottom: 10
            }}>
              Tracking goals: <strong>{goals.filter(g=>g.active).map(g=>g.title).join(', ')}</strong>
            </div>
          )}
          <Chatbot 
            messages={chatMessages} 
            setMessages={setChatMessages} 
            healthScores={healthScores}
            goals={goals}
          />
        </div>
        {/* Suggestions (formerly Health Plan) Tab */}
        <div style={{ display: activeTab === "plan" ? "block" : "none" }}>
          <Suggestions key={healthPlanKey} healthScores={healthScores} onAddGoals={addGoalsFromPlan} />
        </div>
      </div>
    </div>
  );
}
