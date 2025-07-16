import React, { useState, useEffect } from "react";
import HealthSummary from "./HealthSummary";
import ChatInterface from "./ChatInterface";
import HealthPlanRecommendations from "./HealthPlanRecommendations";

export default function App() {
  const [activeTab, setActiveTab] = useState("healthsummary");
  const [chatMessages, setChatMessages] = useState([]);
  const [healthScores, setHealthScores] = useState(null);
  const [userFacts, setUserFacts] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);

  return (
    <div className="App">
      <nav>
        <button
          onClick={() => setActiveTab("healthsummary")}
          style={{
            fontWeight: activeTab === "healthsummary" ? "bold" : "normal",
          }}
        >
          Health Summary
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          style={{ fontWeight: activeTab === "chat" ? "bold" : "normal" }}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("healthplan")}
          style={{
            padding: "10px 20px",
            backgroundColor: activeTab === "healthplan" ? "#3498db" : "#ecf0f1",
            color: activeTab === "healthplan" ? "white" : "#2c3e50",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
        >
          Health Plan
        </button>
      </nav>

      <div style={{ display: activeTab === "healthsummary" ? "block" : "none" }}>
        <HealthSummary setHealthScores={setHealthScores} />
      </div>

      <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
        <ChatInterface
          healthScores={healthScores}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          userFacts={userFacts}
          setUserFacts={setUserFacts}
        />
      </div>

      <div style={{ display: activeTab === "healthplan" ? "block" : "none" }}>
        <HealthPlanRecommendations
          healthScores={healthScores}
          userFacts={userFacts}
        />
      </div>
    </div>
  );
}
