import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:5000';

export default function Suggestions({ healthScores, onAddGoals }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [goalsAdded, setGoalsAdded] = useState(false);
  const hasFetched = useRef(false); // Prevent multiple fetches
  const isFetching = useRef(false); // Prevent concurrent fetches

  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetched.current || isFetching.current) return;
    
    const fetchPlan = async () => {
      isFetching.current = true; // Mark as fetching
      hasFetched.current = true; // Mark as fetched
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
        
        // Auto-add suggested habits as goals (controlled to prevent loops)
        if (data.suggested_habits && Array.isArray(data.suggested_habits) && onAddGoals && !goalsAdded) {
          console.log('Auto-adding suggested habits as inactive goals');
          const goalItems = data.suggested_habits.map(habit => ({
            title: habit,
            category: 'other',
            cadence: 'daily',
            source: 'plan'
          }));
          onAddGoals(goalItems);
          setGoalsAdded(true);
        }
      } catch (err) {
        console.error('Failed to load health plan:', err);
        setError('Could not load health plan. Please try again.');
        hasFetched.current = false; // Reset on error to allow retry
      } finally {
        setLoading(false);
        isFetching.current = false; // Reset fetching flag
      }
    };

    fetchPlan();
  }, [healthScores]); // Only depend on healthScores, not onAddGoals

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
        💡 <strong>Tip:</strong> These suggested habits have been automatically added to your Goals tab as inactive goals. 
        You can activate them by checking the boxes in the Goals tab.
      </p>
    </div>
  );
}
