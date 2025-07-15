import React, { useState, useEffect, useRef } from "react";
import ScoreForm from "./ScoreForm";
import FeedbackPanel from "./FeedbackPanel";
import LongevityTip from "./LongevityTip";
import ChatInterface from "./ChatInterface";
import HealthPlanRecommendations from "./HealthPlanRecommendations";

export default function App() {
  const [recommendationData, setRecommendationData] = useState(null);
  const [healthScores, setHealthScores] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [chatMessages, setChatMessages] = useState([]);
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
          maxWidth: "100%",
          whiteSpace: "normal"
        }}>
          HelloFam AI Personal Trainer
        </h1>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
          <button
            className={`special-button ${activeTab === "summary" ? "active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            Health Summary
          </button>
          <button
            className={`special-button ${activeTab === "healthplan" ? "active" : ""}`}
            onClick={() => setActiveTab("healthplan")}
          >
            Health Plan
          </button>
          <button
            className={`special-button ${activeTab === "longevity" ? "active" : ""}`}
            onClick={() => setActiveTab("longevity")}
          >
            Longevity Insights
          </button>
          <button
            className={`special-button ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            Chatbot
          </button>
        </div>
      </div>

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
        </div>
      </div>
    </div>
  );
}