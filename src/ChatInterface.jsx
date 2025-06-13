import React, { useState, useEffect, useRef } from 'react';

export default function ChatInterface({ messages, setMessages }) {
  const [query, setQuery] = useState('');
  // threadId is initialized to null so each reload starts a new thread
  const [threadId, setThreadId] = useState(null);

  const chatContainerRef = useRef(null);

  const handleSend = async () => {
  const message = query.trim();
  if (!message) return;

  console.log("User input:", message);
  setMessages(prev => [...prev, { role: 'user', text: message }]);
  setQuery('');

  try {
    const payload = {
      query: message,
      health_data: `Age: 32
VO2 Max: 38
Weakest area: posture
Preferred activity: yoga
Heart Rate: 70 bpm
Sleep: 6h/night`,
      thread_id: threadId
    };

    console.log("Sending payload:", payload);

    const response = await fetch('/generate-line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.thread_id) {
      setThreadId(data.thread_id);
    }
    console.log("Fresh backend response:", data.response);

    if (data && typeof data.response === 'string' && data.response.trim() !== '') {
      console.log("Setting new bot message:", data.response.trim());
      setMessages(prev => [...prev, { role: 'bot', text: data.response.trim() }]);
    } else {
      console.warn("Empty or invalid response from backend:", data);
      setMessages(prev => [...prev, { role: 'bot', text: 'No valid response received.' }]);
    }
  } catch (error) {
    console.error("Error fetching response:", error);
    setMessages(prev => [...prev, { role: 'bot', text: 'Error contacting server.' }]);
  }
};

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <h2 style={{ textAlign: 'center',  }}>Have questions? Ask the Health Chatbot!</h2>
      <div style={{ width: '90%', maxWidth: '1000px', margin: '20px auto', border: '1px solid #ccc', borderRadius: '6px', padding: '15px', backgroundColor: '#f9f9f9', height: '500px', display: 'flex', flexDirection: 'column' }}>
        <div id="chatMessages" ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              backgroundColor: msg.role === 'user' ? '#e6f7ff' : '#fff',
              padding: '5px 10px',
              borderRadius: '4px',
              marginBottom: '5px'
            }}>
              {msg.text}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          <input
            id="queryInput"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask something..."
            style={{ flex: 1, padding: '10px', fontSize: '16px', marginRight: '10px' }}
          />
          <button style={{ backgroundColor: "#CFF6EA"}} onClick={handleSend}>Send</button>
        </div>
      </div>
    </>
  );
}
