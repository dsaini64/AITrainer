import React, { useState } from "react";

export default function ScoreForm({ onRecommendation, onScoreSubmit }) {
  const numericFields = ["Age", "VO2 Max", "Heart Rate", "Sleep"];

  const [scores, setScores] = useState({
    "Age": 25,
    "VO2 Max": 30,
    "Weakest Area": "Nutrition",
    "Preferred Activity": "Running",
    "Heart Rate": 70,
    "Sleep": 7,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = numericFields.includes(name) ? Number(value) : value;
    setScores((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const scores = {
      "Age": sessionStorage.getItem("age") || "25",
      "VO2 Max": sessionStorage.getItem("vo2") || "30",
      "Preferred Activity": sessionStorage.getItem("activity") || "Running",
      "Heart Rate": sessionStorage.getItem("heartrate") || "70",
      "Sleep": sessionStorage.getItem("sleep") || "10",
      "Weakest Area": sessionStorage.getItem("focus") || "Mobility",
      "Physical Health": "5",
      "Nutrition": "7",
      "Sleep & Recovery": "8",
      "Emotional Health": 9,
        "Social Connection": "4",
        "Habits": "3",
         "Medical History": "10"

    };
    const res = await fetch("http://localhost:5000/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: "testuser", scores }),
    });
    const data = await res.json();
    onRecommendation(data);              // update recommendations
    onScoreSubmit(scores);               // lift up raw scores
    sessionStorage.setItem('healthScores', JSON.stringify(scores));
    sessionStorage.setItem('age', scores["Age"]);
    sessionStorage.setItem('vo2', scores["VO2 Max"]);
    sessionStorage.setItem('weakness', scores["Weakest Area"]);
    sessionStorage.setItem('activity', scores["Preferred Activity"]);
    sessionStorage.setItem('heartrate', scores["Heart Rate"]);
    sessionStorage.setItem('sleep', scores["Sleep"]);
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
          minHeight: '250px',
          maxHeight: '250px',
          overflow: 'hidden'
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
          <button type="submit" style={{ marginRight: "10px" }}>Get My Recommendations</button>
          <button type="button" onClick={handleClear}>Clear</button>
        </div>
      </form>
    </div>
  );
}
