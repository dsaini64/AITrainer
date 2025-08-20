import React, { useState, useEffect, useRef } from 'react';

export default function ChatInterface({ messages, setMessages }) {
  const [query, setQuery] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [hiddenRecs, setHiddenRecs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [userGoals, setUserGoals] = useState([]);
  const [currentGoal, setCurrentGoal] = useState('');

  const longevityQuickPrompts = [
    "🏃‍♂️ Help me create an exercise routine for longevity",
    "🥗 What foods should I eat to live longer?",
    "😴 How can I optimize my sleep for better health?",
    "🧘‍♂️ Teach me stress management techniques",
    "💪 What are the best strength exercises for aging well?",
    "🧠 How can I keep my brain sharp as I age?",
    "❤️ What heart-healthy habits should I adopt?",
    "🦴 How can I maintain strong bones and joints?",
  ];

  const motivationalCheckins = [
    "🌟 How are you feeling about your health journey today?",
    "💪 What healthy habit are you most proud of this week?",
    "🎯 What's one small step you can take today for your longevity?",
    "🌱 What area of your health would you like to focus on?",
  ];

  // Pre-warm the conversation thread on component mount
  useEffect(() => {
    const scores = {
      "Age": parseInt(sessionStorage.getItem("age")) || 25,
      "VO2 Max": parseInt(sessionStorage.getItem("vo2")) || 45,
      "Preferred Activity": sessionStorage.getItem("activity") || "Running",
      "Heart Rate": parseInt(sessionStorage.getItem("heartrate")) || 60,
      "Sleep": parseInt(sessionStorage.getItem("sleep")) || 7,
      "Weakest Area": sessionStorage.getItem("focus") || "Mobility",
      "Mobility": parseInt(sessionStorage.getItem("Mobility")) || 60,
      "Endurance": parseInt(sessionStorage.getItem("Endurance")) || 50,
      "Strength": parseInt(sessionStorage.getItem("Strength")) || 70,
      "Nutrition": parseInt(sessionStorage.getItem("Nutrition")) || 55,
      "Mindfulness": parseInt(sessionStorage.getItem("Mindfulness")) || 40,
      "Sleep Score": parseInt(sessionStorage.getItem("Sleep")) || 65
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

  // Set up Server-Sent Events stream for real-time chat
  useEffect(() => {
    const connectSSE = () => {
      // Use relative URL instead of hardcoded localhost to work with proxy
      const es = new EventSource('/stream/testuser');
      
      es.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data);
          setMessages(prev => [...prev, { 
            role: 'bot', 
            text: messageData.content || messageData.text || event.data 
          }]);
        } catch (err) {
          console.error('Error parsing SSE message', err);
        }
      };
      
      es.onerror = (err) => {
        console.error('SSE connection error:', err);
        es.close();
        // Try to reconnect after 5 seconds
        setTimeout(connectSSE, 5000);
      };
      
      return es;
    };

    const eventSource = connectSSE();
    return () => eventSource.close();
  }, [setMessages]);

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
      "Age": parseInt(sessionStorage.getItem("age")) || 25,
      "VO2 Max": parseInt(sessionStorage.getItem("vo2")) || 4,
      "Preferred Activity": sessionStorage.getItem("activity") || "Running",
      "Heart Rate": parseInt(sessionStorage.getItem("heartrate")) || 6,
      "Sleep": parseInt(sessionStorage.getItem("sleep")) || 7,
      "Weakest Area": sessionStorage.getItem("focus") || "Mobility",
      "Mobility": parseInt(sessionStorage.getItem("Mobility")) || 6,
      "Endurance": parseInt(sessionStorage.getItem("Endurance")) || 5,
      "Strength": parseInt(sessionStorage.getItem("Strength")) || 70,
      "Nutrition": parseInt(sessionStorage.getItem("Nutrition")) || 5,
      "Mindfulness": parseInt(sessionStorage.getItem("Mindfulness")) || 4,
      "Sleep Score": parseInt(sessionStorage.getItem("Sleep")) || 6
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



  const handleQuickPrompt = (prompt) => {
    setQuery(prompt);
    setShowQuickPrompts(false);
    handleSend();
  };

  const addGoal = () => {
    if (currentGoal.trim()) {
      setUserGoals([...userGoals, { 
        id: Date.now(), 
        text: currentGoal.trim(), 
        completed: false,
        createdAt: new Date().toLocaleDateString()
      }]);
      setCurrentGoal('');
    }
  };

  const toggleGoal = (goalId) => {
    setUserGoals(goals => 
      goals.map(goal => 
        goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const deleteGoal = (goalId) => {
    setUserGoals(goals => goals.filter(goal => goal.id !== goalId));
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Welcome Message */}
      {messages.length === 0 && (
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "25px",
          borderRadius: "15px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "1.4rem" }}>
            🌟 Welcome to Your Longevity Coach!
          </h3>
          <p style={{ margin: 0, fontSize: "1rem", opacity: 0.9 }}>
            I'm here to help you build healthy habits that increase longevity. 
            Ask me anything about nutrition, exercise, sleep, stress management, and more!
          </p>
        </div>
      )}

      {/* Quick Prompts */}
      {showQuickPrompts && messages.length === 0 && (
        <div style={{ marginBottom: "25px" }}>
          <h4 style={{ 
            color: "#2c3e50", 
            marginBottom: "15px",
            textAlign: "center"
          }}>
            🚀 Quick Start - Choose a topic:
          </h4>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "10px",
            marginBottom: "20px"
          }}>
            {longevityQuickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt)}
                style={{
                  padding: "12px 16px",
                  backgroundColor: "#f8f9fa",
                  border: "2px solid #e9ecef",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  textAlign: "left",
                  transition: "all 0.3s ease",
                  color: "#2c3e50"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "#3498db";
                  e.target.style.color = "white";
                  e.target.style.borderColor = "#3498db";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "#f8f9fa";
                  e.target.style.color = "#2c3e50";
                  e.target.style.borderColor = "#e9ecef";
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goal Setting Section */}
      <div style={{
        background: "white",
        padding: "20px",
        borderRadius: "15px",
        marginBottom: "20px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        border: "2px solid #e8f8f5"
      }}>
        <h4 style={{ color: "#27ae60", marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
          🎯 My Longevity Goals
        </h4>
        
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <input
            type="text"
            value={currentGoal}
            onChange={(e) => setCurrentGoal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            placeholder="Add a new health goal..."
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "2px solid #e8f8f5",
              fontSize: "0.9rem"
            }}
          />
          <button
            onClick={addGoal}
            style={{
              padding: "10px 20px",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "500"
            }}
          >
            Add Goal
          </button>
        </div>

        {userGoals.length > 0 && (
          <div style={{ maxHeight: "150px", overflowY: "auto" }}>
            {userGoals.map((goal) => (
              <div key={goal.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0"
              }}>
                <input
                  type="checkbox"
                  checked={goal.completed}
                  onChange={() => toggleGoal(goal.id)}
                  style={{ transform: "scale(1.2)" }}
                />
                <span style={{
                  flex: 1,
                  textDecoration: goal.completed ? "line-through" : "none",
                  color: goal.completed ? "#7f8c8d" : "#2c3e50",
                  fontSize: "0.9rem"
                }}>
                  {goal.text}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#95a5a6" }}>
                  {goal.createdAt}
                </span>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#e74c3c",
                    cursor: "pointer",
                    fontSize: "1.2rem"
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {userGoals.length === 0 && (
          <p style={{ 
            color: "#7f8c8d", 
            fontSize: "0.9rem", 
            fontStyle: "italic",
            margin: 0,
            textAlign: "center"
          }}>
            Set your first longevity goal to start tracking your progress!
          </p>
        )}
      </div>

      {/* Chat Messages */}
      <div style={{
        background: "white",
        borderRadius: "15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        overflow: "hidden",
        border: "2px solid #e8f8f5"
      }}>
        <div 
          ref={chatContainerRef}
          style={{
            height: "400px",
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "15px"
          }}
        >
          {messages.length === 0 && (
            <div style={{
              textAlign: "center",
              color: "#7f8c8d",
              fontSize: "1rem",
              padding: "40px 20px"
            }}>
              <p>👋 Hi there! I'm your personal longevity coach.</p>
              <p>Ask me anything about healthy habits, or choose a quick topic above to get started!</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === 'user' ? "flex-end" : "flex-start",
              alignItems: "flex-start",
              gap: "10px"
            }}>
              {msg.role === 'bot' && (
                <div style={{
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #3498db, #2980b9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  flexShrink: 0
                }}>
                  🤖
                </div>
              )}
              <div style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: msg.role === 'user' ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                backgroundColor: msg.role === 'user' ? "#3498db" : "#f8f9fa",
                color: msg.role === 'user' ? "white" : "#2c3e50",
                fontSize: "0.95rem",
                lineHeight: "1.4",
                wordWrap: "break-word"
              }}>
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div style={{
                  width: "35px",
                  height: "35px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #27ae60, #229954)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                  flexShrink: 0
                }}>
                  👤
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "flex-start",
              gap: "10px"
            }}>
              <div style={{
                width: "35px",
                height: "35px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #3498db, #2980b9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem"
              }}>
                🤖
              </div>
              <div style={{
                padding: "12px 16px",
                borderRadius: "18px 18px 18px 4px",
                backgroundColor: "#f8f9fa",
                color: "#2c3e50",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>Thinking...</span>
                <div style={{
                  display: "flex",
                  gap: "2px"
                }}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#3498db",
                        animation: `bounce 1.4s infinite ease-in-out ${i * 0.16}s both`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div style={{
          padding: "20px",
          borderTop: "1px solid #e8f8f5",
          background: "#f8f9fa"
        }}>
          {messages.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <p style={{ 
                fontSize: "0.9rem", 
                color: "#7f8c8d", 
                margin: "0 0 10px 0",
                textAlign: "center"
              }}>
                💡 Try asking about:
              </p>
              <div style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "center"
              }}>
                {motivationalCheckins.slice(0, 2).map((checkin, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickPrompt(checkin)}
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "white",
                      border: "1px solid #e9ecef",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: "#3498db",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#3498db";
                      e.target.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "white";
                      e.target.style.color = "#3498db";
                    }}
                  >
                    {checkin}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about nutrition, exercise, sleep, or any health topic..."
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: "25px",
                border: "2px solid #e8f8f5",
                fontSize: "0.95rem",
                outline: "none",
                transition: "border-color 0.3s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#3498db"}
              onBlur={(e) => e.target.style.borderColor = "#e8f8f5"}
            />
            <button
              onClick={handleSend}
              disabled={!query.trim() || isLoading}
              style={{
                padding: "12px 24px",
                backgroundColor: (!query.trim() || isLoading) ? "#bdc3c7" : "#3498db",
                color: "white",
                border: "none",
                borderRadius: "25px",
                cursor: (!query.trim() || isLoading) ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
                fontWeight: "500",
                transition: "all 0.3s ease",
                minWidth: "80px"
              }}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          } 40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
