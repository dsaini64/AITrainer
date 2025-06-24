import React, { useState, useEffect, useRef } from 'react';

export default function ChatInterface({ messages, setMessages, healthScores }) {
  const [query, setQuery] = useState('');
  const [threadId, setThreadId] = useState(null);
  const [hiddenRecs, setHiddenRecs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSend = async () => {
    setIsLoading(true);
    const message = query.trim();
    if (!message) {
      setIsLoading(false);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', text: message }]);
    setQuery('');

    try {
      const payload = {
        query: message,
        health_data: `Age: ${sessionStorage.getItem('age') || 'N/A'}
VO2 Max: ${sessionStorage.getItem('vo2') || 'N/A'}
Preferred activity: ${sessionStorage.getItem('activity') || 'N/A'}
Heart Rate: ${sessionStorage.getItem('heartrate') || 'N/A'}
Sleep: ${sessionStorage.getItem('sleep') ? sessionStorage.getItem('sleep') + 'h/night' : 'N/A'}`,
        thread_id: threadId
      };

      const response = await fetch('/generate-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.thread_id) setThreadId(data.thread_id);
      setMessages(prev => [...prev, { role: 'bot', text: data.response.trim() || 'No valid response.' }]);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'bot', text: 'Error contacting server.' }]);
      setIsLoading(false);
    }
  };

  const handlePreset = async (preset) => {
    setIsLoading(true);
    setHiddenRecs(prev => [...prev, preset]);
    setMessages(prev => [...prev, { role: 'user', text: preset }]);
    const payload = {
      query: preset,
      health_data: `Age: ${sessionStorage.getItem('age') || 'N/A'}
VO2 Max: ${sessionStorage.getItem('vo2') || 'N/A'}
Preferred activity: ${sessionStorage.getItem('activity') || 'N/A'}
Heart Rate: ${sessionStorage.getItem('heartrate') || 'N/A'}
Sleep: ${sessionStorage.getItem('sleep') ? sessionStorage.getItem('sleep') + 'h/night' : 'N/A'}`,
      thread_id: threadId
    };
    try {
      const response = await fetch('/generate-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.thread_id) setThreadId(data.thread_id);
      setMessages(prev => [...prev, { role: 'bot', text: data.response.trim() || 'No valid response.' }]);
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
              {(() => {
                const scores = categoryScores;
                const weakestThree = Object.entries(scores)
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
                return !isLoading && remaining.length > 0 ? (
                  <div className="recommendations-container">
                    {remaining.map((prompt, i) => (
                      <div
                        key={i}
                        onClick={() => handlePreset(prompt)}
                        className="recommendation-bubble"
                      >
                        {prompt}
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
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
          </div>  {/* end of chat-area */}
        </div>  {/* end of chat-interface-container */}
      </div>
    </>
  );
}
