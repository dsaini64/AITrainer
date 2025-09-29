import React, { useState, useEffect, useMemo } from "react";
const API = 'http://localhost:5000';
import ScoreForm from "./ScoreForm";
import FeedbackPanel from "./FeedbackPanel";
import LongevityTip from "./LongevityTip";
import ChatInterface from "./ChatInterface";
import HealthPlan from "./HealthPlan";

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
        const res = await fetch(`${API}/api/stats?user_id=${USER_ID}`);
        if (res.ok) setStats(await res.json());
      } catch (e) { console.warn('stats fetch failed', e); }
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
    saveGoals(goals.filter(g => g.id !== id));
    setHealthPlanKey(x => x + 1); // Trigger health plan refresh
    try {
      await fetch(`${API}/api/goals/${id}?user_id=testuser`, { method: 'DELETE' });
    } catch (e) { console.warn('removeGoal backend error (ignored):', e); }
  };

  const toggleGoal = async (id) => {
    const g = goals.find(x => x.id === id);
    if (!g) return;
    const next = !g.active;
    saveGoals(goals.map(x => x.id === id ? { ...x, active: next } : x));
    setHealthPlanKey(x => x + 1); // Trigger health plan refresh
    try {
      await fetch(`${API}/api/goals/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', active: next })
      });
    } catch (e) { console.warn('toggleGoal backend error (ignored):', e); }
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
    const titles = new Set(goals.map(g => String(g.title).toLowerCase()));
    const newGoals = [];
    
    for (const it of items) {
      if (!it || !it.title) continue;
      if (titles.has(String(it.title).toLowerCase())) continue;
      newGoals.push({ title: it.title, category: it.category || 'other', cadence: it.cadence || 'daily', source: 'plan' });
    }
    
    // Add all new goals at once
    for (const goal of newGoals) {
      await addGoal(goal);
    }
  };
  // Sync canonical goals from backend and merge with local
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/goals?user_id=testuser`);
        if (res.ok) {
          const serverGoals = await res.json();
          // Prefer server as source of truth; preserve local-only metadata like `source`
          const map = new Map(serverGoals.map(g => [g.id, g]));
          const merged = serverGoals.map(g => ({ ...g, source: goals.find(x => x.id === g.id)?.source || 'server' }));
          // Also include any local goals that don’t exist on server (attempt to push them up)
          const localsOnly = goals.filter(g => !map.has(g.id));
          for (const lg of localsOnly) {
            try { await addGoal(lg); } catch {}
          }
          saveGoals(merged.length ? merged : goals);
        }
      } catch (e) {
        console.warn('Could not fetch canonical goals (offline?)', e);
      }
    })();
  }, []);

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

    // De-dupe against existing goals by title
    const existing = new Set(goals.map(g=>g.title.toLowerCase()));
    setSuggestions(out.filter(s => !existing.has(s.title.toLowerCase())));
  };

  const last7Compact = useMemo(() => {
    if (!stats?.last_7) return '';
    const arr = Array.isArray(stats.last_7) ? stats.last_7 : [];
    return arr.map(d => STATUS_EMOJI[d.status] || STATUS_EMOJI.unknown).join(' ');
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
              <button className="special-button" onClick={() => {
                setReloadFlag(x => x + 1);
                setHealthPlanKey(x => x + 1);
              }}>Refresh</button>
            </div>
            {stats ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div>Goals Completed: <strong>{stats.total_done ?? 0}</strong></div>
                  <div>Current Streak: <strong>{stats.consecutive_done ?? 0}</strong></div>
                  <div>Best Streak: <strong>{stats.best_streak ?? 0}</strong></div>
                </div>
                
                {/* Visual Progress Indicators */}
                <div style={{ marginBottom: 16 }}>
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
                          strokeDashoffset={`${2 * Math.PI * 25 * (1 - Math.min(1, (stats.total_done || 0) / Math.max(1, stats.total_goals || 10)))}`}
                          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        fontSize: '0.7rem', fontWeight: 'bold', color: '#10b981'
                      }}>
                        {Math.round((stats.total_done || 0) / Math.max(1, stats.total_goals || 10) * 100)}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500', marginBottom: 2 }}>Overall Progress</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {stats.total_done || 0} of {stats.total_goals || 10} goals completed
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Timeline */}
                {last7Compact && (
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
                )}
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>Complete your health profile to get personalized suggestions.</div>
            )}
          </div>
        </div>
        {/* Longevity Insights Tab - commented out
        <div style={{ display: activeTab === "longevity" ? "block" : "none" }}>
          <LongevityTip />
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
            <h2 style={{ marginTop: 0 }}>Your Goals</h2>
            <p style={{ marginTop: 0, color: "#555" }}>Create custom goals, toggle them active/inactive, or delete. Active goals drive chat accountability.</p>
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
                    border: '1px solid #e5e7eb', borderRadius: 8, padding: 10,
                    background: g.active ? '#f0fdf4' : '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" checked={g.active} onChange={()=>toggleGoal(g.id)} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{g.title}</div>
                        <div style={{ fontSize: 12, color: '#555' }}>{g.category} • {g.cadence}{g.source ? ` • ${g.source}` : ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="special-button" onClick={()=>updateGoal(g.id, { active: !g.active })}>{g.active ? 'Pause' : 'Activate'}</button>
                      <button className="special-button" onClick={()=>removeGoal(g.id)}>Delete</button>
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
          <ChatInterface 
            messages={chatMessages} 
            setMessages={setChatMessages} 
            healthScores={healthScores}
            goals={goals}
          />
        </div>
        {/* Suggestions (formerly Health Plan) Tab */}
        <div style={{ display: activeTab === "plan" ? "block" : "none" }}>
          <HealthPlan key={healthPlanKey} healthScores={healthScores} />
        </div>
      </div>
    </div>
  );
}
