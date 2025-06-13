// TabLayout.jsx
import React, { useState } from 'react';
import ChatInterface from './ChatInterface';
import LongevityTip from './LongevityTip';
import FeedbackPanel from './FeedbackPanel';

export default function TabLayout({ recommendationData }) {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div style={{ maxWidth: 800, margin: 'auto' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('chat')}>Chatbot</button>
        <button onClick={() => setActiveTab('longevity')}>Longevity Tip</button>
        <button onClick={() => setActiveTab('feedback')}>Feedback</button>
      </div>

      {activeTab === 'chat' && <ChatInterface />}
      {activeTab === 'longevity' && <LongevityTip />}
      {activeTab === 'feedback' && <FeedbackPanel recommendationData={recommendationData} />}
    </div>
  );
}
