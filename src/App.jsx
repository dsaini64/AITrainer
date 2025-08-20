import React, { useState } from "react";
import ScoreForm from "./ScoreForm";
import FeedbackPanel from "./FeedbackPanel";
import LongevityTip from "./LongevityTip";
import ChatInterface from "./ChatInterface";
import PlanDiscussion from "./PlanDiscussion";
import HealthPlanRecommendations from "./HealthPlanRecommendations";
import "./App.css";

export default function App() {
  const [recommendationData, setRecommendationData] = useState(null);
  const [activeTab, setActiveTab] = useState("health-summary");
  const [chatMessages, setChatMessages] = useState([]);
  const [healthScores, setHealthScores] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [userGoals, setUserGoals] = useState([]);

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
          fontSize: "2.5rem",
          margin: 0,
          textAlign: "center",
          background: "linear-gradient(135deg, #2ecc71 0%, #27ae60 50%, #16a085 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "0.5rem",
        }}>
          🌱 Longevity Coach
        </h1>
        <p style={{
          fontSize: "1.1rem",
          color: "#2c3e50",
          marginBottom: "2rem",
          fontWeight: "300"
        }}>
          Your personal guide to healthy habits that increase longevity
        </p>


        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "15px",
          marginBottom: "30px",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setActiveTab("health-summary")}
            style={{
              padding: "15px 25px",
              backgroundColor: activeTab === "health-summary" ? "#27ae60" : "#ecf0f1",
              color: activeTab === "health-summary" ? "white" : "#2c3e50",
              border: activeTab === "health-summary" ? "2px solid #27ae60" : "2px solid transparent",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
              transition: "all 0.3s ease",
              boxShadow: activeTab === "health-summary" ? "0 4px 12px rgba(39, 174, 96, 0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
              transform: activeTab === "health-summary" ? "translateY(-2px)" : "none"
            }}
          >
            📊 Health Summary
          </button>
          <button
            onClick={() => setActiveTab("assessment")}
            style={{
              padding: "15px 25px",
              backgroundColor: activeTab === "assessment" ? "#e74c3c" : "#ecf0f1",
              color: activeTab === "assessment" ? "white" : "#2c3e50",
              border: activeTab === "assessment" ? "2px solid #e74c3c" : "2px solid transparent",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
              transition: "all 0.3s ease",
              boxShadow: activeTab === "assessment" ? "0 4px 12px rgba(231, 76, 60, 0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
              transform: activeTab === "assessment" ? "translateY(-2px)" : "none"
            }}
          >
            🔬 Assessment
          </button>
          <button
            onClick={() => setActiveTab("interactive-helper")}
            style={{
              padding: "15px 25px",
              backgroundColor: activeTab === "interactive-helper" ? "#3498db" : "#ecf0f1",
              color: activeTab === "interactive-helper" ? "white" : "#2c3e50",
              border: activeTab === "interactive-helper" ? "2px solid #3498db" : "2px solid transparent",
              borderRadius: "12px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "1rem",
              transition: "all 0.3s ease",
              boxShadow: activeTab === "interactive-helper" ? "0 4px 12px rgba(52, 152, 219, 0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
              transform: activeTab === "interactive-helper" ? "translateY(-2px)" : "none"
            }}
          >
            🤖 Interactive Helper
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "health-summary" && (
          <div style={{
            background: "linear-gradient(135deg, #f8fffe 0%, #e8f8f5 100%)",
            padding: "30px",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            marginBottom: "20px"
          }}>
            <h2 style={{
              color: "#27ae60",
              marginBottom: "20px",
              fontSize: "1.8rem",
              textAlign: "center"
            }}>
              📊 Your Health Summary
            </h2>
            {healthScores ? (
              <div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "25px"
                }}>
                  {Object.entries(healthScores).map(([key, value]) => (
                    <div key={key} style={{
                      background: "white",
                      padding: "20px",
                      borderRadius: "15px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                      textAlign: "center",
                      border: "2px solid #e8f8f5"
                    }}>
                      <h4 style={{ color: "#2c3e50", marginBottom: "10px" }}>{key}</h4>
                      <p style={{ 
                        fontSize: "1.5rem", 
                        fontWeight: "bold", 
                        color: "#27ae60",
                        margin: 0 
                      }}>
                        {typeof value === 'number' ? value : value}
                      </p>
                    </div>
                  ))}
                </div>
                {recommendationData && (
                  <div style={{ marginTop: "25px" }}>
                    <h3 style={{ color: "#2c3e50", marginBottom: "15px" }}>
                      🎯 Your Personalized Health Insights
                    </h3>
                    <FeedbackPanel recommendationData={recommendationData} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "40px",
                color: "#7f8c8d"
              }}>
                <p style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
                  Complete your health assessment to see your personalized summary
                </p>
                <button
                  onClick={() => setActiveTab("assessment")}
                  style={{
                    padding: "15px 30px",
                    backgroundColor: "#e74c3c",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    transition: "all 0.3s ease"
                  }}
                >
                  Take Assessment Now →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "assessment" && (
          <div style={{
            background: "linear-gradient(135deg, #fef9e7 0%, #fcf3cf 100%)",
            padding: "30px",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            marginBottom: "20px"
          }}>
            <h2 style={{
              color: "#e74c3c",
              marginBottom: "20px",
              fontSize: "1.8rem",
              textAlign: "center"
            }}>
              🔬 Health Assessment & Recommendations
            </h2>
            <ScoreForm
              onRecommendation={setRecommendationData}
              onScoreSubmit={setHealthScores}
            />
            <div style={{ marginTop: "30px" }}>
              <HealthPlanRecommendations 
                healthScores={healthScores}
                userFacts={[]}
              />
            </div>
          </div>
        )}

        {activeTab === "interactive-helper" && (
          <div style={{
            background: "linear-gradient(135deg, #ebf3fd 0%, #d6eafc 100%)",
            padding: "30px",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            marginBottom: "20px"
          }}>
            <h2 style={{
              color: "#3498db",
              marginBottom: "20px",
              fontSize: "1.8rem",
              textAlign: "center"
            }}>
              🤖 Your Interactive Longevity Coach
            </h2>
            <div style={{
              background: "white",
              borderRadius: "15px",
              padding: "20px",
              marginBottom: "20px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}>
              <ChatInterface 
                messages={chatMessages} 
                setMessages={setChatMessages}
              />
            </div>
            {currentPlan && (
              <div style={{
                background: "white",
                borderRadius: "15px",
                padding: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}>
                <h3 style={{ color: "#2c3e50", marginBottom: "15px" }}>
                  🎯 Goal Setting & Progress Tracking
                </h3>
                <PlanDiscussion 
                  initialPlan={currentPlan}
                  onPlanUpdated={handlePlanUpdated}
                  healthScores={healthScores}
                />
              </div>
            )}
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <LongevityTip />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}