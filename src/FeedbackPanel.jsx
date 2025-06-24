import React, { useState, useEffect } from "react";

export default function FeedbackPanel({ recommendationData }) {
  const [feedback, setFeedback] = useState("");
  const [notification, setNotification] = useState("");
  const [report, setReport] = useState("");
  // Initialize assignedTask safely if recommendationData may be null
  const [assignedTask, setAssignedTask] = useState(recommendationData?.assigned_task || "");
  // Local state for streak
  const [consecutiveDays, setConsecutiveDays] = useState(recommendationData?.consecutive_days || 0);

  useEffect(() => {
    if (recommendationData && recommendationData.assigned_task) {
      setAssignedTask(recommendationData.assigned_task);
    }
    if (recommendationData && recommendationData.consecutive_days != null) {
      setConsecutiveDays(recommendationData.consecutive_days);
    }
  }, [recommendationData]);

  const checkIn = async (status) => {
    try {
      const res = await fetch("/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "testuser", status })
      });

      if (!res.ok) throw new Error("Failed to check in");
      const result = await res.json();

      if (status === "done") {
        const { current_task, difficulty, total_days_completed, best_gapless_streak, daily_tip, monthly_report, consecutive_days } = result;
        setFeedback(`You checked in for today, great job!\nBest Streak: ${best_gapless_streak} days\nCurrent Streak: ${consecutive_days} days`);
        setNotification(`Daily Bonus Tip:\n${daily_tip}`);
        if (monthly_report) {
          setReport(`${monthly_report.message}\nBest Streak: ${monthly_report.best_gapless_streak}\n${monthly_report.motivation}`);
        }
        // Update assigned task dynamically if backend sends new one
        if (recommendationData) {
          setAssignedTask(current_task);
        }
        // Update streak state from check-in response
        setConsecutiveDays(consecutive_days);
      } else {
        setFeedback(result.message);
        setNotification(`Daily Bonus Tip:\n${result.daily_tip}`);
        setReport("");
        // Reset streak from the check-in result
        setConsecutiveDays(result.consecutive_days);
        // Fetch a new recommended task when "I Didn't Do It" is pressed
        if (status === "miss" && assignedTask) {
          try {
            setFeedback("No worries. Let's try something to get back on track today. Your streak has reset.");
            const resp = await fetch("http://localhost:5000/api/new-daily-task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ previousTask: assignedTask }),
            });
            if (!resp.ok) throw new Error("Failed to fetch new task");
            const data = await resp.json();
            if (data && data.newTask) {
              setAssignedTask(data.newTask);
            }
            // Also update streak if present in miss response
            if (data.consecutive_days != null) {
              setConsecutiveDays(data.consecutive_days);
            }
          } catch (error) {
            console.error("Error fetching new task:", error);
            setFeedback("Something went wrong. Please try again later.");
          }
        }
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      setFeedback("Something went wrong. Please try again later.");
      setNotification("");
      setReport("");
    }
  };

  if (!recommendationData) return null;

  return (
    <>
      <div className="output">
        Your Focus Areas:
        <ul>
          <li>Habits</li>
          <li>Social Connection</li>
          <li>Physical Health</li>
        </ul>
        <br />
        Recommended Habits:
        <ul>
          <li>Habits: Practice mindfulness for 10 minutes</li>
          <li>Social Connection: Reach out to a friend or family member for a chat</li>
          <li>Physical Health: Take a brisk 20-minute walk</li>
        </ul>
      </div>
      <div className="activity-tracker-box">
        <h3>Activity Tracker:</h3>
        {consecutiveDays != null}
        {assignedTask && (
          <div><strong>Assigned Daily Task: {assignedTask}</strong></div>
        )}
        <div style={{ marginTop: 10 }}>
          <button onClick={() => checkIn("done")}>I Did It</button>
          <button onClick={() => checkIn("miss")}>I Didn't Do It</button>
        </div>
        <div className="feedback-container">
          <div className="feedback">{feedback}</div>
          <div className="feedback">{notification}</div>
          <div className="feedback">{report}</div>
        </div>
      </div>
    </>
  );
}
