import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000';

export default function HealthPlan({ healthScores }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlan = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/generate-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'testuser',
            scores: healthScores || {},
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

  if (loading) {
    return <p>Generating suggestions…</p>;
  }
  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }
  if (!plan) {
    return <p>Preparing your suggestions…</p>;
  }

  // Note: Automatic goal addition removed to prevent infinite loops
  // Users can manually add goals from the Goals tab

  return (
    <div>
      <h2>Recommended 6-Week Health Plan</h2>
      <p><strong>Estimated Timeline:</strong> {plan.estimated_timeline_weeks} weeks</p>
      <p><strong>Focus Areas:</strong> {(Array.isArray(plan.focus_areas) ? plan.focus_areas.join(', ') : 'Personalized focus coming up')}</p>
      <p><strong>Suggested Habits:</strong></p>
      <ul>
        {(Array.isArray(plan.suggested_habits) ? plan.suggested_habits : []).map((h, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {h}
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 14, color: '#666', marginTop: 12 }}>
        💡 <strong>Tip:</strong> These suggested habits have been added to your Goals tab as inactive goals. 
        You can activate them by checking the boxes in the Goals tab.
      </p>
    </div>
  );
}
