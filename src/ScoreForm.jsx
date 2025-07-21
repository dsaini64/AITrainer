
import React, { useState, useEffect } from "react";

export default function ScoreForm({ onRecommendation, onScoreSubmit }) {
  const [scores] = useState({
    "Age": 25,
    "VO2 Max": 30,
    "Weakest Area": "Nutrition",
    "Preferred Activity": "Running",
    "Heart Rate": 70,
    "Sleep": 7,
  });

  // Function to load facts from backend
  const loadFacts = async () => {
    try {
      const res = await fetch(`/facts/testuser`);
      await res.json();
      // Facts loaded but not stored locally
    } catch (err) {
      console.error('Failed to load facts:', err);
    }
  };

  useEffect(() => {
    loadFacts();
  }, []);

  useEffect(() => {
    const handleFactsUpdated = () => {
      loadFacts();
    };
    window.addEventListener('userFactsUpdated', handleFactsUpdated);
    return () => {
      window.removeEventListener('userFactsUpdated', handleFactsUpdated);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("Form submitted, generating plan...");
    
    const mergedScores = {
      "Age": parseInt(sessionStorage.getItem("age")) || scores["Age"],
      "VO2 Max": parseInt(sessionStorage.getItem("vo2")) || scores["VO2 Max"],
      "Preferred Activity": sessionStorage.getItem("activity") || scores["Preferred Activity"],
      "Heart Rate": parseInt(sessionStorage.getItem("heartrate")) || scores["Heart Rate"],
      "Sleep": parseInt(sessionStorage.getItem("sleep")) || scores["Sleep"],
      "Weakest Area": sessionStorage.getItem("focus") || scores["Weakest Area"],
      "Physical Health": parseInt(sessionStorage.getItem("Physical")) || 5,
      "Nutrition": parseInt(sessionStorage.getItem("Nutrition")) || 7,
      "Sleep & Recovery": parseInt(sessionStorage.getItem("Sleep")) || 8,
      "Emotional Health": parseInt(sessionStorage.getItem("Emotional")) || 9,
      "Social Connection": parseInt(sessionStorage.getItem("Social")) || 4,
      "Habits": parseInt(sessionStorage.getItem("Habits")) || 3,
      "Medical History": parseInt(sessionStorage.getItem("Medical")) || 10
    };
    
    console.log("Sending scores:", mergedScores);
    
    try {
      const res = await fetch(`/generate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "testuser", scores: mergedScores }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Received recommendation data:", data);
      
      onRecommendation(data);              // update recommendations
      onScoreSubmit(mergedScores);         // lift up raw scores
      
      sessionStorage.setItem('healthScores', JSON.stringify(mergedScores));
      sessionStorage.setItem('age', mergedScores["Age"]);
      sessionStorage.setItem('vo2', mergedScores["VO2 Max"]);
      sessionStorage.setItem('weakness', mergedScores["Weakest Area"]);
      sessionStorage.setItem('activity', mergedScores["Preferred Activity"]);
      sessionStorage.setItem('heartrate', mergedScores["Heart Rate"]);
      sessionStorage.setItem('sleep', mergedScores["Sleep"]);
      
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Error generating your plan. Please check the console for details.");
    }
  };

  const handleClear = () => {
    // Leave scores intact
    onRecommendation(null);
    onScoreSubmit(null);
    sessionStorage.removeItem('healthScores');
    sessionStorage.removeItem('age');
    sessionStorage.removeItem('vo2');
    sessionStorage.removeItem('weakness');
    sessionStorage.removeItem('activity');
    sessionStorage.removeItem('heartrate');
    sessionStorage.removeItem('sleep');
  };

  return (
    <div style={{ display: 'flex', position: 'relative', justifyContent: 'center', alignItems: 'flex-start' }}>
      <form onSubmit={handleSubmit} style={{ maxWidth: 600, margin: "20px", width: "100%", boxSizing: "border-box" }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px',
          width: '100%',
          boxSizing: 'border-box',
          // minHeight: '250px', // remove fixed height limits so the panel can grow
          // maxHeight: '250px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ flex: 1, flexShrink: 0 }}>
              <strong>Your Health Profile:</strong>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>Age: {sessionStorage.getItem('age') || scores["Age"]}</li>
                <li>VO2 Max: {sessionStorage.getItem('vo2') || scores["VO2 Max"]}</li>
                <li>Preferred Activity: {sessionStorage.getItem('activity') || scores["Preferred Activity"]}</li>
                <li>Heart Rate: {sessionStorage.getItem('heartrate') || scores["Heart Rate"]}</li>
                <li>Sleep: {(sessionStorage.getItem('sleep') || scores["Sleep"]) + 'h/night'}</li>
              </ul>
            </div>
            <div style={{ flex: 1, flexShrink: 0 }}>
              <strong>Your Health Scores:</strong>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>Physical Health: 5</li>
                <li>Nutrition: 7</li>
                <li>Sleep & Recovery: 8</li>
                <li>Emotional Health: 9</li>
                <li>Social Connection: 4</li>
                <li>Habits: 3</li>
                <li>Medical History: 10</li>
              </ul>
            </div>
          </div>
        </div>
        <div style={{ marginTop: "15px" }}>
          {!sessionStorage.getItem("healthScores") && (
            <button type="submit" style={{ marginRight: "10px" }}>Get My Recommendations</button>
          )}
          {sessionStorage.getItem("healthScores") && (
            <button type="button" onClick={handleClear}>Clear</button>
          )}
        </div>
      </form>
    </div>
  );
}
