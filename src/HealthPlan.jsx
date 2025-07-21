import React from "react";

const HealthPlan = ({ onStartDiscussion }) => {
  // This component provides a simple interface to start plan discussion
  // The actual plan will be generated dynamically

  const handleStartPlanning = () => {
    if (onStartDiscussion) {
      onStartDiscussion();
    }
  };

  return (
    <div style={{
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "10px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      margin: "20px 0",
      textAlign: "center"
    }}>
      <h2 style={{
        color: "#2c3e50",
        marginBottom: "15px"
      }}>
        Your Personalized Health Plan
      </h2>
      
      <p style={{
        color: "#7f8c8d",
        marginBottom: "20px",
        lineHeight: "1.6"
      }}>
        Based on your health assessment, we'll create a customized plan to help you achieve your wellness goals. 
        Click below to start the interactive planning process.
      </p>

      <button
        onClick={handleStartPlanning}
        style={{
          backgroundColor: "#3498db",
          color: "white",
          border: "none",
          padding: "15px 30px",
          borderRadius: "8px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "background-color 0.3s ease"
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = "#2980b9"}
        onMouseOut={(e) => e.target.style.backgroundColor = "#3498db"}
      >
        Start Plan Discussion
      </button>
    </div>
  );
};

export default HealthPlan;
