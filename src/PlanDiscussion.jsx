import React, { useState, useEffect, useRef } from 'react';

export default function PlanDiscussion({ initialPlan, onPlanUpdated, healthScores }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(initialPlan);
  const [discussionStage, setDiscussionStage] = useState('introduction'); // introduction, exploration, concerns, refinement, finalization
  const [userConcerns, setUserConcerns] = useState([]);
  const [additionalInfo, setAdditionalInfo] = useState({});
  const [planModifications, setPlanModifications] = useState([]);
  
  const chatContainerRef = useRef(null);

  // Discussion flow stages and prompts
  const stagePrompts = {
    introduction: "Let me walk you through your personalized plan. I'll explain each part and would love to hear your thoughts!",
    exploration: "Now that you've seen the plan, what questions do you have? Is there anything that seems unclear or concerning?",
    concerns: "I understand your concerns. Let's work through them together and see how we can adjust the plan to work better for you.",
    refinement: "Based on our discussion, I'd like to suggest some modifications. What do you think about these changes?",
    finalization: "Great! Let's finalize your plan. Are you comfortable with everything we've discussed?"
  };

  // Initialize conversation with plan introduction
  useEffect(() => {
    if (initialPlan && !messages.length) {
      initializePlanDiscussion();
    }
  }, [initialPlan]);

  const initializePlanDiscussion = async () => {
    setIsLoading(true);
    
    try {
      // Prepare thread for plan discussion
      const prepRes = await fetch('/prepare-plan-discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: 'testuser', 
          plan: currentPlan,
          health_data: healthScores 
        })
      });
      const prepData = await prepRes.json();
      setThreadId(prepData.thread_id);

      // Get initial plan presentation
      const response = await fetch('/start-plan-discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: prepData.thread_id,
          plan: currentPlan,
          stage: 'introduction'
        })
      });

      const data = await response.json();
      setMessages([{ role: 'bot', text: data.message }]);
      setDiscussionStage('exploration');
      
    } catch (error) {
      console.error('Failed to initialize plan discussion:', error);
      setMessages([{ role: 'bot', text: 'Sorry, I encountered an error starting our plan discussion. Let me try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const message = query.trim();
    if (!message || isLoading) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: message }]);
    setQuery('');

    try {
      const response = await fetch('/discuss-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          message: message,
          current_stage: discussionStage,
          plan: currentPlan,
          concerns: userConcerns,
          additional_info: additionalInfo
        })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'bot', text: data.message }]);
      
      // Update discussion state based on response
      if (data.stage) setDiscussionStage(data.stage);
      if (data.concerns) setUserConcerns(prev => [...prev, ...data.concerns]);
      if (data.additional_info) setAdditionalInfo(prev => ({ ...prev, ...data.additional_info }));
      if (data.plan_modifications) setPlanModifications(prev => [...prev, ...data.plan_modifications]);
      if (data.updated_plan) {
        setCurrentPlan(data.updated_plan);
        if (onPlanUpdated) onPlanUpdated(data.updated_plan);
      }

    } catch (error) {
      console.error('Error in plan discussion:', error);
      setMessages(prev => [...prev, { role: 'bot', text: 'I encountered an error. Could you please repeat that?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickResponse = (response) => {
    setQuery(response);
  };

  const getQuickResponses = () => {
    switch (discussionStage) {
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
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="plan-discussion-container">
      <div className="discussion-header">
        <h2>Plan Discussion</h2>
        <div className="discussion-stage">
          Stage: <span className="stage-indicator">{discussionStage}</span>
        </div>
      </div>

      <div className="discussion-content">
        {/* Plan Summary Panel */}
        <div className="plan-summary-panel">
          <h3>Current Plan</h3>
          <div className="plan-items">
            {currentPlan && typeof currentPlan === 'object' ? (
              Object.entries(currentPlan).map(([key, value]) => (
                <div key={key} className="plan-item">
                  <strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}
                </div>
              ))
            ) : (
              <div className="plan-item">{currentPlan || 'No plan loaded'}</div>
            )}
          </div>
          
          {planModifications.length > 0 && (
            <div className="plan-modifications">
              <h4>Suggested Modifications:</h4>
              {planModifications.map((mod, i) => (
                <div key={i} className="modification-item">• {mod}</div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="chat-messages" ref={chatContainerRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role}`}>
                <div className="message-bubble">
                  {msg.text}
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
              disabled={isLoading || !query.trim()}
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
              className={`progress-step ${discussionStage === stage ? 'active' : ''} ${
                ['introduction', 'exploration', 'concerns', 'refinement', 'finalization'].indexOf(discussionStage) > i ? 'completed' : ''
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