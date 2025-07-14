import React, { useState, useEffect, useRef } from 'react';


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

  // Pre-warm the conversation thread on component mount
  useEffect(() => {
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
    fetch('/prepare-thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: 'testuser', health_data: scores })
    })
      .then(res => res.json())
      .then(data => {
        if (data.thread_id) {
          setThreadId(data.thread_id);
        }
      })
      .catch(err => console.error('Failed to prepare thread:', err));
  }, []);

  // Load user facts into ChatInterface for display
  useEffect(() => {
    fetch('/facts/testuser')
      .then(res => res.json())
      .then(data => setUserFacts(data))
      .catch(err => console.error('Failed to load user facts:', err));
  }, []);

  // Listen for assistant messages via SSE
  useEffect(() => {
    // Use absolute backend URL for SSE
    const es = new EventSource('http://localhost:5000/stream/testuser');
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
      await fetch('/facts', {
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
        const prepRes = await fetch('/prepare-thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'testuser', health_data: health_data })
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
      const ctxRes = await fetch('/facts/testuser');
      contextFacts = await ctxRes.json();
    } catch (err) {
      console.error('Failed to load context facts:', err);
    }

    try {
      try {
        const factRes = await fetch('/extract-fact', {
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
        thread_id: tid
      };

      const response = await fetch('/generate-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('generate-line response data:', data);
      if (data.thread_id) setThreadId(data.thread_id);
      // Fetch and display any queued assistant messages (main + follow‑up)
      try {
        const pendRes = await fetch(`/pending/testuser`);
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
        const prepRes = await fetch('/prepare-thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'testuser', health_data: `Age: ${sessionStorage.getItem("age") || "25"}\nVO2 Max: ${sessionStorage.getItem("vo2") || "45"}\nPreferred Activity: ${sessionStorage.getItem("activity") || "Running"}\nHeart Rate: ${sessionStorage.getItem("heartrate") || "60"}\nSleep: ${sessionStorage.getItem("sleep") || "7"}\nWeakest Area: ${sessionStorage.getItem("focus") || "Mobility"}\nMobility: ${sessionStorage.getItem("Mobility") || "60"}\nEndurance: ${sessionStorage.getItem("Endurance") || "50"}\nStrength: ${sessionStorage.getItem("Strength") || "70"}\nNutrition: ${sessionStorage.getItem("Nutrition") || "55"}\nMindfulness: ${sessionStorage.getItem("Mindfulness") || "40"}\nSleep Score: ${sessionStorage.getItem("Sleep") || "65"}` })
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
      health_data: `Age: ${sessionStorage.getItem('age') || 'N/A'}
VO2 Max: ${sessionStorage.getItem('vo2') || 'N/A'}
Preferred activity: ${sessionStorage.getItem('activity') || 'N/A'}
Heart Rate: ${sessionStorage.getItem('heartrate') || 'N/A'}
Sleep: ${sessionStorage.getItem('sleep') ? sessionStorage.getItem('sleep') + 'h/night' : 'N/A'}`,
      thread_id: tid
    };
    try {
      const response = await fetch('/generate-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.thread_id) setThreadId(data.thread_id);
      // Fetch and display any queued assistant messages (main + follow‑up)
      try {
        const pendRes = await fetch(`/pending/testuser`);
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
    <>
      <h2 style={{ textAlign: 'center' }}>Have questions? Ask the Health Chatbot!</h2>
      <div className="chat-layout">
        <div className="chat-interface-container">
          <div className="chat-area">
            <div id="chatMessages" ref={chatContainerRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role}`}>
                  <div className="message-bubble">
                    {msg.text}
                  </div>
                </div>
              ))}
              {/* Suggested questions rendering block */}
              {!isLoading && (() => {
                const scoresObj = categoryScores;
                const weakestThree = Object.entries(scoresObj)
                  .sort((a, b) => a[1] - b[1])
                  .slice(0, 3)
                  .map(([area]) => area);
                const templates = [
                  (area) => `What creative ways can I weave improvements in ${area} into my daily routine?`,
                  (area) => `Can you explain why ${area} matters for my long-term health and share a surprising tip?`,
                  (area) => `What fun challenge could I try this week to boost my ${area}?`
                ];
                const remaining = weakestThree
                  .map((area, i) => templates[i % templates.length](area))
                  .filter(q => !hiddenRecs.includes(q));
                return remaining.length > 0 ? (
                  <div className="recommendations-container">
                    {remaining.map((prompt, i) => (
                      <div
                        key={i}
                        className="recommendation-button"
                        onClick={() => handlePreset(prompt)}
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
              {isLoading && (
                <div className="message-row bot">
                  <div className="message-bubble loading">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Generating response...
                      <span className="dot-typing">
                        <span></span><span></span><span></span>
                      </span>
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
              <button
                className="send-button"
                onClick={handleSend}
              >
                Send
              </button>
            </div>
          </div>  {/* end of chat-area */}
        </div>  {/* end of chat-interface-container */}
      </div>
    </>
  );
}
