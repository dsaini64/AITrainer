
import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:5000';
const GOALS_API = `${API}/api/goals`;


export default function ChatInterface({ messages, setMessages, healthScores }) {
  // Populate sessionStorage with defaults for both general and health-related scores
  useEffect(() => {
    sessionStorage.setItem("age", "25");
    sessionStorage.setItem("vo2", "45");
    sessionStorage.setItem("activity", "Running");
    sessionStorage.setItem("heartrate", "60");
    sessionStorage.setItem("sleep", "7");
    sessionStorage.setItem("focus", "Mobility");

    sessionStorage.setItem("Mobility", "60");
    sessionStorage.setItem("Endurance", "50");
    sessionStorage.setItem("Strength", "70");
    sessionStorage.setItem("Nutrition", "55");
    sessionStorage.setItem("Mindfulness", "40");
    sessionStorage.setItem("Sleep", "65");
  }, []);

  const [query, setQuery] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [hiddenRecs, setHiddenRecs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [userFacts, setUserFacts] = useState([]);

  // === Goals: state & persistence (API-backed) ===
  const [goals, setGoals] = useState([]); // [{id, title, category, cadence, active, createdAt}]
  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("activity");
  const [goalCadence, setGoalCadence] = useState("daily");
  const [goalsLoaded, setGoalsLoaded] = useState(false);

  const loadGoals = async () => {
    try {
      const res = await fetch(`${GOALS_API}?user_id=testuser`);
      const data = await res.json();
      setGoals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load goals', e);
      setGoals([]);
    } finally {
      setGoalsLoaded(true);
    }
  };
  useEffect(() => { loadGoals(); }, []);

  const addGoal = async (goal) => {
    try {
      const res = await fetch(GOALS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', ...goal })
      });
      if (!res.ok) throw new Error('Failed to create goal');
      const created = await res.json();
      setGoals(prev => [created, ...prev]);
    } catch (e) {
      console.error('addGoal error', e);
    }
  };

  const removeGoal = async (id) => {
    try {
      const res = await fetch(`${GOALS_API}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser' })
      });
      if (!res.ok) throw new Error('Failed to delete goal');
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (e) {
      console.error('removeGoal error', e);
    }
  };

  const toggleGoal = async (id) => {
    try {
      const current = goals.find(g => g.id === id);
      const res = await fetch(`${GOALS_API}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', active: !(current?.active) })
      });
      if (!res.ok) throw new Error('Failed to toggle goal');
      const updated = await res.json();
      setGoals(prev => prev.map(g => g.id === id ? updated : g));
    } catch (e) {
      console.error('toggleGoal error', e);
    }
  };

  const updateGoal = async (id, patch) => {
    try {
      const res = await fetch(`${GOALS_API}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', ...patch })
      });
      if (!res.ok) throw new Error('Failed to update goal');
      const updated = await res.json();
      setGoals(prev => prev.map(g => g.id === id ? updated : g));
    } catch (e) {
      console.error('updateGoal error', e);
    }
  };

  // === Check-in preferences ===
  const [tz, setTz] = useState('America/Los_Angeles');
  const [checkinTime, setCheckinTime] = useState('09:00');
  const [prefsSaved, setPrefsSaved] = useState(null); // null | 'ok' | 'err'
  const [schedState, setSchedState] = useState(null);
  const [debugMsg, setDebugMsg] = useState("");

  // Guard to avoid double-seeding goals automatically
  const autoSeededRef = useRef(false);

  // 12-hour UI state and helpers
  const [checkinTime12, setCheckinTime12] = useState('09:00'); // HH:MM in 12-hour
  const [meridiem, setMeridiem] = useState('AM'); // 'AM' | 'PM'
  const [nextCheckIn, setNextCheckIn] = useState('');

  function to24Hour(hhmm12, ampm){
    try {
      let [h,m] = hhmm12.split(':').map(x=>parseInt(x,10));
      if (Number.isNaN(h) || Number.isNaN(m)) return '09:00';
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    } catch { return '09:00'; }
  }

  function to12Hour(hhmm24){
    try {
      let [h,m] = hhmm24.split(':').map(x=>parseInt(x,10));
      if (Number.isNaN(h) || Number.isNaN(m)) return { t:'09:00', p:'AM' };
      const p = h >= 12 ? 'PM' : 'AM';
      h = h % 12; if (h === 0) h = 12;
      return { t: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`, p };
    } catch { return { t:'09:00', p:'AM' }; }
  }

  function computeNextCheckInText(tzName, hhmm24){
    try {
      const now = new Date();
      const [H,M] = hhmm24.split(':').map(n=>parseInt(n,10));
      const target = new Date(now);
      target.setHours(H, M, 0, 0);
      // If already past for today, say Tomorrow
      const isToday = now.getHours() < H || (now.getHours() === H && now.getMinutes() <= M);
      const { t, p } = to12Hour(hhmm24);
      return `${isToday ? 'Today' : 'Tomorrow'} at ${t} ${p} (${tzName})`;
    } catch { return ''; }
  }

  useEffect(() => {
    // Detect browser timezone once and then load saved prefs
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
      setTz(browserTz);
    } catch {}
    fetch(`http://localhost:5000/prefs?user_id=testuser`)
      .then(r => r.json())
      .then(p => {
        if (p && typeof p === 'object') {
          if (p.tz) setTz(p.tz);
          if (p.checkin_time) {
            setCheckinTime(p.checkin_time);
            const { t, p:ampm } = to12Hour(p.checkin_time);
            setCheckinTime12(t);
            setMeridiem(ampm);
            setNextCheckIn(computeNextCheckInText(p.tz || tz, p.checkin_time));
          }
        }
      })
      .catch(() => {});
  }, []);

  const savePrefs = async () => {
    setPrefsSaved(null);
    try {
      const hhmm24 = to24Hour(checkinTime12, meridiem);
      const res = await fetch('http://localhost:5000/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', tz, checkin_time: hhmm24, channels: ['in_app'] })
      });
      const data = await res.json();
      if (data && data.success) {
        setCheckinTime(hhmm24);
        setNextCheckIn(computeNextCheckInText(tz, hhmm24));
        setPrefsSaved('ok');
        refreshSchedulerState();
      } else {
        setPrefsSaved('err');
      }
    } catch (e) {
      console.error('Failed to save prefs', e);
      setPrefsSaved('err');
    }
    setTimeout(() => setPrefsSaved(null), 3000);
  };

  // === Diagnostics helpers ===
  const refreshSchedulerState = async () => {
    try {
      const res = await fetch(`${API}/debug/scheduler-state?user_id=testuser`);
      const data = await res.json();
      setSchedState(data);
      setDebugMsg("");
    } catch (e) {
      console.error('Failed to load scheduler state', e);
      setDebugMsg('Failed to load scheduler state');
    }
  };

  const triggerCheckinNow = async () => {
    try {
      const res = await fetch(`${API}/debug/trigger-checkin-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser' })
      });
      const data = await res.json();
      if (data && data.success) {
        setDebugMsg('Triggered a check-in. It should appear in the chat area.');
      } else {
        setDebugMsg(data && data.error ? `Error: ${data.error}` : 'Unknown error triggering check-in');
      }
    } catch (e) {
      console.error('Failed to trigger check-in', e);
      setDebugMsg('Failed to trigger check-in');
    }
  };
  // Auto-refresh scheduler state when goals finish loading and when prefs are saved
  useEffect(() => {
    if (goalsLoaded) refreshSchedulerState();
  }, [goalsLoaded]);

  // Auto-seed suggested goals after goals load if none exist, so backend always has at least one active goal
  useEffect(() => {
    if (!goalsLoaded) return;
    if (goals.length === 0 && !autoSeededRef.current) {
      autoSeededRef.current = true;
      // Seed from health suggestions so scheduler has something to check
      try { suggestGoalsFromHealth(); } catch (e) { console.error('auto-seed failed', e); }
      // Refresh scheduler state a moment later so panel shows new goals
      setTimeout(() => { refreshSchedulerState(); }, 400);
    }
  }, [goalsLoaded, goals]);

  // Suggest goals based on health data currently in sessionStorage/props
  const suggestGoalsFromHealth = () => {
    const hs = healthScores ?? JSON.parse(sessionStorage.getItem('healthScores') || '{}');
    const suggestions = [];
    const sleepHrs = Number(hs["Sleep"]) || Number(sessionStorage.getItem("sleep")) || 0;
    if (sleepHrs && sleepHrs < 7) {
      suggestions.push({ title: "Lights out by 11:00 PM", category: "sleep", cadence: "daily" });
    }
    const vo2 = Number(hs["VO2 Max"]) || Number(sessionStorage.getItem("vo2")) || 0;
    const prefAct = hs["Preferred Activity"] || sessionStorage.getItem("activity") || "Walking";
    if (vo2 && vo2 < 45) {
      suggestions.push({ title: `Do ${prefAct} for 20 minutes`, category: "activity", cadence: "daily" });
    } else {
      suggestions.push({ title: `Walk 20 minutes`, category: "activity", cadence: "daily" });
    }
    const weakest = hs["Weakest Area"] || sessionStorage.getItem("focus");
    if (weakest && String(weakest).toLowerCase().includes("nutrition")) {
      suggestions.push({ title: "Add one veggie to lunch", category: "nutrition", cadence: "daily" });
    }
    // De‑dupe new suggestions by title vs existing goals
    const existingTitles = new Set(goals.map(g => g.title.toLowerCase()));
    suggestions
      .filter(s => !existingTitles.has(s.title.toLowerCase()))
      .forEach(s => addGoal({ ...s, source: "suggested" }));
  };

  // Pre-warm the conversation thread once goals have loaded
  useEffect(() => {
    if (threadId || !goalsLoaded) return;
    const scores = {
      "Age": sessionStorage.getItem("age") || "25",
      "VO2 Max": sessionStorage.getItem("vo2") || "45",
      "Preferred Activity": sessionStorage.getItem("activity") || "Running",
      "Heart Rate": sessionStorage.getItem("heartrate") || "60",
      "Sleep": sessionStorage.getItem("sleep") || "7",
      "Weakest Area": sessionStorage.getItem("focus") || "Mobility",
      "Mobility": sessionStorage.getItem("Mobility") || "60",
      "Endurance": sessionStorage.getItem("Endurance") || "50",
      "Strength": sessionStorage.getItem("Strength") || "70",
      "Nutrition": sessionStorage.getItem("Nutrition") || "55",
      "Mindfulness": sessionStorage.getItem("Mindfulness") || "40",
      "Sleep Score": sessionStorage.getItem("Sleep") || "65"
    };

    const activeGoalsAtInit = goals
      .filter(g => g && g.active)
      .map(g => ({ title: g.title, category: g.category, cadence: g.cadence }));

    fetch(`${API}/prepare-thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'testuser', health_data: scores, goals: activeGoalsAtInit })
    })
      .then(res => res.json())
      .then(data => { if (data.thread_id) setThreadId(data.thread_id); })
      .catch(err => console.error('Failed to prepare thread:', err));
  }, [goalsLoaded, goals, threadId]);

  // Load user facts into ChatInterface for display
  useEffect(() => {
    fetch(`${API}/facts/testuser`)
      .then(res => res.json())
      .then(data => setUserFacts(data))
      .catch(err => console.error('Failed to load user facts:', err));
  }, []);

  // Listen for assistant messages via SSE
  useEffect(() => {
    // Use absolute backend URL for SSE
    const es = new EventSource('http://localhost:5000/stream/testuser');
    // Drain any queued messages that were enqueued before SSE connected
    fetch(`${API}/pending/testuser`).then(r=>r.json()).then(pend=>{
      if (Array.isArray(pend)) {
        setMessages(prev => [
          ...prev,
          ...pend.map(msg => ({ role: msg.role === 'assistant' ? 'bot' : msg.role, text: msg.text }))
        ]);
      }
    }).catch(()=>{});
    es.onopen = () => {
      console.log('SSE connected');
    };
    es.onmessage = e => {
      try {
        const incoming = JSON.parse(e.data);
        const msg = {
          role: incoming.role === 'assistant' ? 'bot' : incoming.role,
          text: incoming.text
        };
        setMessages(prev => [...prev, msg]);
      } catch (err) {
        console.error('Error parsing SSE message', err);
      }
    };
    es.onerror = err => {
      console.error('SSE connection error:', err);
      es.close();
    };
    return () => {
      es.close();
    };
  }, []);

  // Poll for pending messages every 10 seconds to catch scheduled check-ins
  useEffect(() => {
    const pollPendingMessages = async () => {
      try {
        const res = await fetch(`${API}/pending/testuser`);
        const pendingMessages = await res.json();
        if (Array.isArray(pendingMessages) && pendingMessages.length > 0) {
          setMessages(prev => [
            ...prev,
            ...pendingMessages.map(msg => ({ role: msg.role === 'assistant' ? 'bot' : msg.role, text: msg.text }))
          ]);
        }
      } catch (e) {
        console.error('Failed to poll pending messages:', e);
      }
    };

    // Poll immediately and then every 10 seconds (faster for better UX)
    pollPendingMessages();
    const interval = setInterval(pollPendingMessages, 10000);

    return () => clearInterval(interval);
  }, []);

  const health = healthScores ?? JSON.parse(sessionStorage.getItem('healthScores') || '{}');

  const categoryScores = {
    "Physical Health": 5,
    "Nutrition": 7,
    "Sleep & Recovery": 8,
    "Emotional Health": 9,
    "Social Connection": 4,
    "Habits": 3,
    "Medical History": 10
  };

  const chatContainerRef = useRef(null);

  // Helper to persist a new fact to backend store
  const addFact = async (fact) => {
    try {
      await fetch(`${API}/facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', fact }),
      });
    } catch (err) {
      console.error('Failed to save fact:', err);
    }
  };

  const handleSend = async () => {
    let tid = threadId;
    setIsLoading(true);
    const message = query.trim();
    if (!message) {
      setIsLoading(false);
      return;
    }

    // Build the scores object with all health-related scores from sessionStorage (all 12 fields)
    const scoresForHealth = {
      "Age": sessionStorage.getItem("age") || "25",
      "VO2 Max": sessionStorage.getItem("vo2") || "4",
      "Preferred Activity": sessionStorage.getItem("activity") || "Running",
      "Heart Rate": sessionStorage.getItem("heartrate") || "6",
      "Sleep": sessionStorage.getItem("sleep") || "7",
      "Weakest Area": sessionStorage.getItem("focus") || "Mobility",
      "Mobility": sessionStorage.getItem("Mobility") || "6",
      "Endurance": sessionStorage.getItem("Endurance") || "5",
      "Strength": sessionStorage.getItem("Strength") || "70",
      "Nutrition": sessionStorage.getItem("Nutrition") || "5",
      "Mindfulness": sessionStorage.getItem("Mindfulness") || "4",
      "Sleep Score": sessionStorage.getItem("Sleep") || "6"
    };
    // Convert the scores object to a string for health_data
    const health_data = Object.entries(scoresForHealth)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    // Ensure a conversation thread exists, capturing the returned tid
    if (!tid) {
      try {
        const prepRes = await fetch(`${API}/prepare-thread`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'testuser',
            health_data: health_data,
            goals: goals.filter(g => g.active).map(g => ({ title: g.title, category: g.category, cadence: g.cadence }))
          })
        });
        const prepData = await prepRes.json();
        if (prepData.thread_id) {
          setThreadId(prepData.thread_id);
          tid = prepData.thread_id;
        }
      } catch (prepErr) {
        console.error('Failed to prepare thread in handleSend:', prepErr);
      }
    }

    setMessages(prev => [...prev, { role: 'user', text: message }]);
    setQuery('');

    // Load current facts to use as context for extraction
    let contextFacts = {};
    try {
      const ctxRes = await fetch(`${API}/facts/testuser`);
      contextFacts = await ctxRes.json();
    } catch (err) {
      console.error('Failed to load context facts:', err);
    }

    try {
      try {
        const factRes = await fetch(`${API}/extract-fact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            context: contextFacts,
          }),
        });

        const factData = await factRes.json();
        if (factData && factData.fact) {
          const newFact = typeof factData.fact === "string"
            ? JSON.parse(factData.fact)
            : factData.fact;

          // Persist or update this fact and notify the UI
          await addFact(newFact);
          window.dispatchEvent(new Event('userFactsUpdated'));
        }
      } catch (err) {
        console.error("Error extracting fact:", err);
      }

      const payload = {
  query: message,
  health_data,
  goals: goals.filter(g => g.active).map(g => ({ title: g.title, category: g.category, cadence: g.cadence })),
  thread_id: tid
};

      const response = await fetch(`${API}/generate-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('generate-line response data:', data);
      if (data.thread_id) setThreadId(data.thread_id);
      // Fetch and display any queued assistant messages (main + follow‑up)
      try {
        const pendRes = await fetch(`${API}/pending/testuser`);
        const pendData = await pendRes.json();
        pendData.forEach(msg => {
          setMessages(prev => [
            ...prev,
            { role: msg.role === 'assistant' ? 'bot' : msg.role, text: msg.text }
          ]);
        });
      } catch (pendErr) {
        console.error('Failed to load pending messages:', pendErr);
      }
      // Display the main answer
      // (Removed direct insertion of main; handled by SSE stream)

      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', text: 'Error contacting server.' }]);
      setIsLoading(false);
    }
  };

  const handlePreset = async (preset) => {
    let tid = threadId;
    setIsLoading(true);
    setHiddenRecs(prev => [...prev, preset]);
    setMessages(prev => [...prev, { role: 'user', text: preset }]);
    // Ensure a conversation thread exists, capturing the returned tid
    if (!tid) {
      try {
        const prepRes = await fetch(`${API}/prepare-thread`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'testuser',
            health_data: `Age: ${sessionStorage.getItem("age") || "25"}\nVO2 Max: ${sessionStorage.getItem("vo2") || "45"}\nPreferred Activity: ${sessionStorage.getItem("activity") || "Running"}\nHeart Rate: ${sessionStorage.getItem("heartrate") || "60"}\nSleep: ${sessionStorage.getItem("sleep") || "7"}\nWeakest Area: ${sessionStorage.getItem("focus") || "Mobility"}\nMobility: ${sessionStorage.getItem("Mobility") || "60"}\nEndurance: ${sessionStorage.getItem("Endurance") || "50"}\nStrength: ${sessionStorage.getItem("Strength") || "70"}\nNutrition: ${sessionStorage.getItem("Nutrition") || "55"}\nMindfulness: ${sessionStorage.getItem("Mindfulness") || "40"}\nSleep Score: ${sessionStorage.getItem("Sleep") || "65"}`,
            goals: goals.filter(g => g.active).map(g => ({ title: g.title, category: g.category, cadence: g.cadence }))
          })
        });
        const prepData = await prepRes.json();
        if (prepData.thread_id) {
          setThreadId(prepData.thread_id);
          tid = prepData.thread_id;
        }
      } catch (prepErr) {
        console.error('Failed to prepare thread in handlePreset:', prepErr);
      }
    }
    const payload = {
  query: preset,
  health_data: `Age: ${sessionStorage.getItem('age') || 'N/A'}\nVO2 Max: ${sessionStorage.getItem('vo2') || 'N/A'}\nPreferred activity: ${sessionStorage.getItem('activity') || 'N/A'}\nHeart Rate: ${sessionStorage.getItem('heartrate') || 'N/A'}\nSleep: ${sessionStorage.getItem('sleep') ? sessionStorage.getItem('sleep') + 'h/night' : 'N/A'}`,
  goals: goals.filter(g => g.active).map(g => ({ title: g.title, category: g.category, cadence: g.cadence })),
  thread_id: tid
};
    try {
      const response = await fetch(`${API}/generate-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.thread_id) setThreadId(data.thread_id);
      // Fetch and display any queued assistant messages (main + follow‑up)
      try {
        const pendRes = await fetch(`${API}/pending/testuser`);
        const pendData = await pendRes.json();
        pendData.forEach(msg => {
          setMessages(prev => [
            ...prev,
            { role: msg.role === 'assistant' ? 'bot' : msg.role, text: msg.text }
          ]);
        });
      } catch (pendErr) {
        console.error('Failed to load pending messages:', pendErr);
      }
      // Display the main answer
      // (Removed direct insertion of main; handled by SSE stream)

      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', text: 'Error contacting server.' }]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);



  return (
    <div className="chat-interface-container">
      <div className="chat-area">
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #ececec', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>Check-in time</strong>
          <input
            type="text"
            value={checkinTime12}
            onChange={(e)=>setCheckinTime12(e.target.value)}
            placeholder="hh:mm"
            style={{ width: 80, padding: 8, border: '1px solid #d1d5db', borderRadius: 6, textAlign: 'center' }}
          />
          <select value={meridiem} onChange={(e)=>setMeridiem(e.target.value)} style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          <strong style={{ marginLeft: 8 }}>Timezone</strong>
          <input type="text" value={tz} onChange={(e)=>setTz(e.target.value)} style={{ width: 260, padding: 8, border: '1px solid #d1d5db', borderRadius: 6 }} />
          <button className="send-button" onClick={savePrefs}>Save Check-in Preferences</button>
          {prefsSaved === 'ok' && (<span style={{fontSize:12,color:'#065f46'}}>Saved!</span>)}
          {prefsSaved === 'err' && (<span style={{fontSize:12,color:'#7c2d12'}}>Save failed</span>)}
          {nextCheckIn && (<div style={{ fontSize: 12, color: '#374151', width: '100%' }}>Next check-in: {nextCheckIn}</div>)}
          <div style={{ fontSize: 12, color: '#6b7280', width: '100%' }}>(The bot will proactively check in when you have at least one active goal.)</div>
        </div>
        <h2 style={{ textAlign: 'center' }}>Have questions? Ask the Health Chatbot!</h2>

        <div id="chatMessages" ref={chatContainerRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`message-row ${msg.role}`}>
              <div className="message-bubble">{msg.text}</div>
            </div>
          ))}

          {!isLoading ? null : (
            <div className="message-row bot">
              <div className="message-bubble loading">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Generating response...
                  <span className="dot-typing"><span></span><span></span><span></span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-row">
          <input
            id="queryInput"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask something..."
            className="chat-input"
          />
          <button className="send-button" onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}
