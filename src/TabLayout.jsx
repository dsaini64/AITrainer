import React, { useState, useEffect } from "react";
import HealthPlan from "./HealthPlan";

export default function App() {
  const [recommendationData, setRecommendationData] = useState(null);
  const [healthScores, setHealthScores] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [chatMessages, setChatMessages] = useState([]);

  const [goalText, setGoalText] = useState("");
  const [goalAccepted, setGoalAccepted] = useState(false);

  // Very simple goal suggestion based on available data; can be made smarter later
  function deriveSuggestedGoal(scores, recs) {
    // Try a few likely shapes, otherwise offer a sensible default
    if (recs && Array.isArray(recs) && recs.length && recs[0]?.title) return `Complete: ${recs[0].title}`;
    if (recs && recs?.topRecommendation?.title) return `Complete: ${recs.topRecommendation.title}`;
    if (recs && Array.isArray(recs?.topRecommendations) && recs.topRecommendations[0]?.summary)
      return recs.topRecommendations[0].summary;
    // Fallbacks if health scores suggest an area
    if (scores && scores.activityScore !== undefined) return "Walk 20 minutes today";
    if (scores && scores.sleepScore !== undefined) return "Be in bed by 11:00 PM tonight";
    return "Take a 20‑minute brisk walk every day this week";
  }

  // Initialize a suggested goal when data arrives and no custom goal is set
  useEffect(() => {
    if (!goalText) {
      const suggestion = deriveSuggestedGoal(healthScores, recommendationData);
      setGoalText(suggestion);
    }
  }, [healthScores, recommendationData]);

  return (
    <div>
      <h1>HelloFam AI Personal Trainer</h1>
      {goalAccepted && (
        <div style={{ fontSize: "0.9rem", color: "#065f46", marginTop: 6 }}>
          Your active goal: <strong>{goalText}</strong>
        </div>
      )}
      <div>
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
        <button
          className={`special-button ${activeTab === "longevity" ? "active" : ""}`}
          onClick={() => setActiveTab("longevity")}
        >
          Longevity Insights
        </button>
      </div>
      <div style={{ background: "#fafbfc" }}>
        {/* Longevity Insights Tab */}
        <div style={{ display: activeTab === "longevity" ? "block" : "none" }}>
          {/* Longevity content here */}
        </div>

        {/* Goals Tab */}
        <div style={{ display: activeTab === "goals" ? "block" : "none" }}>
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 16,
            marginBottom: 12
          }}>
            <h2 style={{ marginTop: 0 }}>Set Your Goal</h2>
            <p style={{ marginTop: 0, color: "#555" }}>
              Choose a clear, simple goal. Once you accept it, the chatbot will focus on
              keeping you accountable and motivated.
            </p>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Goal</label>
            <input
              type="text"
              value={goalText}
              onChange={(e) => { setGoalText(e.target.value); setGoalAccepted(false); }}
              style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #d1d5db" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="special-button"
                onClick={() => { setGoalAccepted(true); setActiveTab("chat"); }}
              >
                Accept Goal & Go to Chat
              </button>
              <button
                className="special-button"
                onClick={() => { setGoalText(deriveSuggestedGoal(healthScores, recommendationData)); setGoalAccepted(false); }}
              >
                Suggest Goal
              </button>
              <button
                className="special-button"
                onClick={() => { setGoalText(""); setGoalAccepted(false); }}
              >
                Clear
              </button>
            </div>
            {goalAccepted && (
              <div style={{ marginTop: 12, color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 10, borderRadius: 6 }}>
                Accepted goal: <strong>{goalText}</strong>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
          {goalAccepted && (
            <div style={{
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#7c2d12",
              padding: 10,
              borderRadius: 6,
              marginBottom: 10
            }}>
              Current goal: <strong>{goalText}</strong>
              <button
                style={{ marginLeft: 8 }}
                className="special-button"
                onClick={() => setActiveTab("goals")}
              >
                Change
              </button>
            </div>
          )}
          <ChatInterface 
            messages={chatMessages} 
            setMessages={setChatMessages} 
            healthScores={healthScores}
            acceptedGoal={goalAccepted ? goalText : null}
          />
        </div>
      </div>
    </div>
  );
}
