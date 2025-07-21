import React, { useState, useEffect, useCallback } from 'react';

export default function PlanDiscussion({ plan, onPlanUpdated, messages, setMessages }) {
  const [currentStage, setCurrentStage] = useState('exploration');
  const [concerns, setConcerns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [userInput, setUserInput] = useState('');

  // Initialize plan discussion when component mounts or plan changes
  const initializePlanDiscussion = useCallback(async () => {
    if (!plan) return;

    setIsLoading(true);
    try {
      const response = await fetch('/initialize-plan-discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'testuser',
          plan: plan,
          stage: 'exploration'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.thread_id) {
        setThreadId(data.thread_id);
      }
      
      // Add initial AI message
      if (data.message) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Failed to initialize plan discussion:', error);
      // Provide fallback initialization
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'd love to discuss your personalized health plan with you! Let's start by talking about what aspects you're most excited about or have questions about.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [plan, setMessages]);

  useEffect(() => {
    if (plan && messages.length === 0) {
      initializePlanDiscussion();
    }
  }, [plan, messages.length, initializePlanDiscussion]);

  const handleSend = async () => {
    const message = userInput.trim();
    if (!message || isLoading) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: message, timestamp: new Date().toISOString() }]);
    setUserInput('');

    try {
      const response = await fetch('/discuss-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          message: message,
          current_stage: currentStage,
          plan: plan,
          concerns: concerns,
          // additional_info: additionalInfo // This was removed from state, so it's removed here
        })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: new Date().toISOString() }]);
      
      // Update discussion state based on response
      if (data.stage) setCurrentStage(data.stage);
      if (data.concerns) setConcerns(prev => [...prev, ...data.concerns]);
      // if (data.additional_info) setAdditionalInfo(prev => ({ ...prev, ...data.additional_info })); // This was removed from state, so it's removed here
      if (data.plan_modifications) {
        // setPlanModifications(prev => [...prev, ...data.plan_modifications]); // This was removed from state, so it's removed here
        // If planModifications were state, they would be updated here.
      }
      if (data.updated_plan) {
        // setCurrentPlan(data.updated_plan); // This was removed from state, so it's removed here
        if (onPlanUpdated) onPlanUpdated(data.updated_plan);
      }

    } catch (error) {
      console.error('Error in plan discussion:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an error. Could you please repeat that?', timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickResponse = (response) => {
    setUserInput(response);
  };

  const getQuickResponses = () => {
    switch (currentStage) {
      case 'exploration':
        return [
          "This looks good overall",
          "I have some concerns about the timing",
          "Can you explain why this was recommended?",
          "I'm not sure I can do this consistently"
        ];
      case 'concerns':
        return [
          "That makes sense, let's adjust it",
          "I still have concerns about this part",
          "Can we try a different approach?",
          "What are some alternatives?"
        ];
      case 'refinement':
        return [
          "These changes look better",
          "I'd like to modify this further",
          "Can we make it even simpler?",
          "This works for me"
        ];
      case 'finalization':
        return [
          "Yes, I'm ready to start",
          "I want to review once more",
          "Can we set up reminders?",
          "How will we track progress?"
        ];
      default:
        return [
          "Tell me more",
          "I understand",
          "What do you recommend?",
          "I have questions"
        ];
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="plan-discussion-container">
      <div className="discussion-header">
        <h2>Plan Discussion</h2>
        <div className="discussion-stage">
          Stage: <span className="stage-indicator">{currentStage}</span>
        </div>
      </div>

      <div className="discussion-content">
        {/* Plan Summary Panel */}
        <div className="plan-summary-panel">
          <h3>Current Plan</h3>
          <div className="plan-items">
            {plan && typeof plan === 'object' ? (
              Object.entries(plan).map(([key, value]) => (
                <div key={key} className="plan-item">
                  <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}
                </div>
              ))
            ) : (
              <div className="plan-item">{plan || 'No plan loaded'}</div>
            )}
          </div>
          
          {/* {planModifications.length > 0 && ( // This was removed from state, so it's removed here
            <div className="plan-modifications">
              <h4>Suggested Modifications:</h4>
              {planModifications.map((mod, i) => (
                <div key={i} className="modification-item">• {mod}</div>
              ))}
            </div>
          )} */}
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className="message-bubble">
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message-row bot">
                <div className="message-bubble loading">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Thinking about your plan...
                    <span className="dot-typing">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Response Buttons */}
          <div className="quick-responses">
            {getQuickResponses().map((response, i) => (
              <button
                key={i}
                className="quick-response-btn"
                onClick={() => handleQuickResponse(response)}
                disabled={isLoading}
              >
                {response}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="chat-input-row">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Share your thoughts, questions, or concerns..."
              className="chat-input"
              disabled={isLoading}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={isLoading || !userInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Discussion Progress */}
      <div className="discussion-progress">
        <div className="progress-steps">
          {['introduction', 'exploration', 'concerns', 'refinement', 'finalization'].map((stage, i) => (
            <div 
              key={stage} 
              className={`progress-step ${currentStage === stage ? 'active' : ''} ${
                ['introduction', 'exploration', 'concerns', 'refinement', 'finalization'].indexOf(currentStage) > i ? 'completed' : ''
              }`}
            >
              {stage.charAt(0).toUpperCase() + stage.slice(1)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}