import React, { useState, useEffect } from "react";

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

  const [userFacts, setUserFacts] = useState([]);

  // Load stored facts from backend, and poll every 2 seconds for updates
  useEffect(() => {
    async function loadFacts() {
      try {
        const res = await fetch('http://localhost:5000/facts/testuser');
        const data = await res.json();
        setUserFacts(data);
      } catch (err) {
        console.error('Failed to load facts:', err);
      }
    }
    loadFacts();
    const interval = setInterval(loadFacts, 2000);
    window.addEventListener('factAdded', loadFacts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('factAdded', loadFacts);
    };
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = numericFields.includes(name) ? Number(value) : value;
    setScores((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const mergedScores = {
      "Age": sessionStorage.getItem("age") || scores["Age"],
      "VO2 Max": sessionStorage.getItem("vo2") || scores["VO2 Max"],
      "Preferred Activity": sessionStorage.getItem("activity") || scores["Preferred Activity"],
      "Heart Rate": sessionStorage.getItem("heartrate") || scores["Heart Rate"],
      "Sleep": sessionStorage.getItem("sleep") || scores["Sleep"],
      "Weakest Area": sessionStorage.getItem("focus") || scores["Weakest Area"],
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
      body: JSON.stringify({ user_id: "testuser", scores: mergedScores }),
    });
    const data = await res.json();
    onRecommendation(data);              // update recommendations
    onScoreSubmit(mergedScores);         // lift up raw scores
    sessionStorage.setItem('healthScores', JSON.stringify(mergedScores));
    sessionStorage.setItem('age', mergedScores["Age"]);
    sessionStorage.setItem('vo2', mergedScores["VO2 Max"]);
    sessionStorage.setItem('weakness', mergedScores["Weakest Area"]);
    sessionStorage.setItem('activity', mergedScores["Preferred Activity"]);
    sessionStorage.setItem('heartrate', mergedScores["Heart Rate"]);
    sessionStorage.setItem('sleep', mergedScores["Sleep"]);
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

  // Helper to add a fact (calls backend)
  const addFact = async (fact) => {
    try {
      await fetch('http://localhost:5000/facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'testuser', fact }),
      });
      setUserFacts((prev) => ([...prev, fact]));
    } catch (err) {
      console.error('Failed to save fact:', err);
    }
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
              {userFacts.length > 0 && (
                <div style={{ marginTop: "40px" }}>
                  <strong>What the AI Trainer knows about you:</strong>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {userFacts.map((fact, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
                        <span>
                          {fact.topic.charAt(0).toUpperCase() + fact.topic.slice(1)}: {fact.fact}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
