import React, { useState, useEffect } from 'react';

export default function HealthPlan({ healthScores }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!healthScores) return;

    const fetchPlan = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'testuser',
            health_data: JSON.stringify(healthScores),
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setPlan(data);
      } catch (err) {
        console.error('Failed to load health plan:', err);
        setError('Could not load health plan. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [healthScores]);

  if (!healthScores) {
    return <p>Please submit your health scores first on the “Health Summary” tab.</p>;
  }
  if (loading) {
    return <p>Loading health plan…</p>;
  }
  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }
  if (!plan) {
    return null;
  }

  return (
    <div>
      <h2>Recommended 6-Week Health Plan</h2>
      <p><strong>Estimated Timeline:</strong> {plan.estimated_timeline_weeks} weeks</p>
      <p><strong>Focus Areas:</strong> {plan.focus_areas.join(', ')}</p>
      <p><strong>Suggested Habits:</strong></p>
      <ul>
        {plan.suggested_habits.map((h, i) => <li key={i}>{h}</li>)}
      </ul>
      <p><strong>Assigned Task:</strong> {plan.assigned_task}</p>
      <p><strong>Current Focus Area:</strong> {plan.current_focus_area}</p>
      <p><strong>Difficulty Level:</strong> {plan.difficulty}</p>
      <p><strong>Consecutive Days:</strong> {plan.consecutive_days}</p>
      <p><strong>Missed Days:</strong> {plan.missed_days_in_row}</p>
    </div>
  );
}
