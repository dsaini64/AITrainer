import React, { useState, useEffect, useRef } from "react";
import ScoreForm from "./ScoreForm";
import FeedbackPanel from "./FeedbackPanel";
import LongevityTip from "./LongevityTip";
import ChatInterface from "./ChatInterface";

import PlanDiscussion from "./PlanDiscussion";

import HealthPlanRecommendations from "./HealthPlanRecommendations";


export default function App() {
  const [recommendationData, setRecommendationData] = useState(null);
  const [healthScores, setHealthScores] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [chatMessages, setChatMessages] = useState([]);

  const [currentPlan, setCurrentPlan] = useState(null);

  // Generate a sample plan for demonstration
  const generateSamplePlan = () => {
    return {
      "Physical Activity": "30 minutes daily walk + 2 strength sessions per week",
      "Nutrition": "Add one extra serving of vegetables to each meal",
      "Sleep": "Maintain 7-8 hours sleep with consistent bedtime routine",
      "Mindfulness": "5-minute morning meditation practice",
      "Social Connection": "Schedule one meaningful conversation per week",
      "Duration": "4-week initial program",
      "Weekly Check-ins": "Every Sunday review progress and adjust as needed"
    };
  };

  const handlePlanUpdated = (updatedPlan) => {
    setCurrentPlan(updatedPlan);
  };

  const startPlanDiscussion = () => {
    if (!currentPlan) {
      setCurrentPlan(generateSamplePlan());
    }
    setActiveTab("plan-discussion");
  };
=======
  const [userFacts, setUserFacts] = useState([]);

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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "1rem",
        }}>
          AI Health Trainer
        </h1>


        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap"
        }}>

        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>

          <button
            onClick={() => setActiveTab("summary")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "summary" ? "#3498db" : "#ecf0f1",
              color: activeTab === "summary" ? "white" : "#2c3e50",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
          >
            Health Assessment
          </button>
          <button

            onClick={() => setActiveTab("chat")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "chat" ? "#3498db" : "#ecf0f1",
              color: activeTab === "chat" ? "white" : "#2c3e50",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}

            className={`special-button ${activeTab === "healthplan" ? "active" : ""}`}
            onClick={() => setActiveTab("healthplan")}
          >
            Health Plan
          </button>
          <button
            className={`special-button ${activeTab === "longevity" ? "active" : ""}`}
            onClick={() => setActiveTab("longevity")}

          >
            Health Chat
          </button>
          <button
            onClick={() => setActiveTab("plan-discussion")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "plan-discussion" ? "#3498db" : "#ecf0f1",
              color: activeTab === "plan-discussion" ? "white" : "#2c3e50",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
          >
            Plan Discussion
          </button>
          <button
            onClick={() => setActiveTab("tip")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "tip" ? "#3498db" : "#ecf0f1",
              color: activeTab === "tip" ? "white" : "#2c3e50",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
          >
            Daily Tip
          </button>
        </div>


        {/* Tab Content */}
        {activeTab === "summary" && (
          <div>
                         <ScoreForm
               onRecommendation={setRecommendationData}
               onScoreSubmit={setHealthScores}
             />
            {recommendationData && (
              <div style={{ marginTop: "20px" }}>
                                 <FeedbackPanel recommendationData={recommendationData} />
                <div style={{ marginTop: "15px" }}>
                  <button
                    onClick={startPlanDiscussion}
                    style={{
                      padding: "12px 24px",
                      backgroundColor: "#27ae60",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "500",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = "#229954"}
                    onMouseLeave={(e) => e.target.style.backgroundColor = "#27ae60"}
                  >
                    💬 Discuss This Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === "chat" && (
=======
      <div style={{
        background: "#fafbfc",
        padding: "16px",
        borderRadius: "10px",
        width: "600px",
        margin: "0 auto",
        minHeight: "150px"
      }}>
        <div style={{ display: activeTab === "summary" ? "block" : "none" }}>
          <ScoreForm 
            onRecommendation={setRecommendationData} 
            onScoreSubmit={setHealthScores}
          />
          <FeedbackPanel recommendationData={recommendationData} />
        </div>
        <div style={{ display: activeTab === "healthplan" ? "block" : "none" }}>
          <HealthPlanRecommendations 
            healthScores={healthScores}
            userFacts={userFacts}
          />
        </div>
        <div style={{ display: activeTab === "longevity" ? "block" : "none" }}>
          <LongevityTip />
        </div>
        <div style={{ display: activeTab === "chat" ? "block" : "none" }}>

          <ChatInterface 
            messages={chatMessages} 
            setMessages={setChatMessages}
            healthScores={healthScores}
          />
        )}

        {activeTab === "plan-discussion" && (
          <div>
            {!currentPlan ? (
              <div style={{
                background: "#f8f9fa",
                padding: "40px",
                borderRadius: "10px",
                textAlign: "center"
              }}>
                <h3>No Plan Available</h3>
                <p>Please complete your health assessment first to generate a personalized plan for discussion.</p>
                <button
                  onClick={() => setActiveTab("summary")}
                  style={{
                    padding: "12px 24px",
                    backgroundColor: "#3498db",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "500"
                  }}
                >
                  Go to Health Assessment
                </button>
              </div>
            ) : (
              <PlanDiscussion 
                initialPlan={currentPlan}
                onPlanUpdated={handlePlanUpdated}
                healthScores={healthScores}
              />
            )}
          </div>
        )}

        {activeTab === "tip" && <LongevityTip />}
      </div>
    </div>
  );
}