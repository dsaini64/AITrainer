import React, { useState } from "react";

export default function LongevityTip() {
  const [activity, setActivity] = useState("");
  const [tip, setTip] = useState("");

  const fetchTip = async () => {
    if (!activity.trim()) return;
    const res = await fetch("/longevity-tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activity })
    });
    const result = await res.json();
    setTip(result.tip);
  };

  return (
    <div style={{ marginTop: 30, display: "flex", justifyContent: "center" }}>
      <div style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "20px",
        maxWidth: "600px",
        width: "100%",
        backgroundColor: "#f9f9f9",
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)"
      }}>
        <label>Enter a sport you participate in to learn how it contributes to your longevity!</label><br />
        <input
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="e.g. tennis"
          style={{ width: "100%", padding: "10px", margin: "12px 0", boxSizing: "border-box" }}
        />
        <button onClick={fetchTip} style={{ marginBottom: "10px", backgroundColor: "#CFF6EA"}}>Send</button>
        {tip && (
          <div className="output">
            <p style={{ whiteSpace: 'pre-wrap' }}>{tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}