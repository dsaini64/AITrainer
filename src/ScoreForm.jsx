import React, { useState } from "react";

export default function ScoreForm({ onRecommendation, setShowFeedbackPanel }) {
  const defaultScores = {
    "Physical Health": 11,
    "Nutrition": 9,
    "Sleep & Recovery": 13,
    "Emotional Health": 13,
    "Social Connection": 9,
    "Habits": 12,
    "Medical History": 16
  };

  const [scores, setScores] = useState(defaultScores);
  const [formVisible, setFormVisible] = useState(true);

  const handleChange = (e) => {
    setScores({ ...scores, [e.target.name]: Number(e.target.value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormVisible(false);
    // sessionStorage.setItem('formVisible', 'false');

    const res = await fetch("/generate-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: "testuser", scores })
    });

    const data = await res.json();
    onRecommendation(data);
    setShowFeedbackPanel(true);
  };

  const handleClear = () => {
    onRecommendation(null);
    setScores(defaultScores);
    setFormVisible(true);
    // sessionStorage.setItem('formVisible', 'true');
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto" }}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {Object.keys(defaultScores).map((key) => (
            <div className="input-wrapper" key={key}>
              <label>
                {key}: <input className="fixed-width-input" type="number" name={key} value={scores[key]} onChange={handleChange} required />
              </label>
            </div>
          ))}
        </div>
        <br />
        {formVisible && <button type="submit">Get My Recommendations</button>}
        {!formVisible && <button type="button" onClick={handleClear}>Collapse</button>}
      </form>
    </div>
  );
}
