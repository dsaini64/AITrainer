import React, { useState, useEffect, useCallback } from "react";

export default function HealthPlanRecommendations({ scores, data, onPlanGenerated }) {
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateRecommendations = useCallback(async () => {
    if (!scores && !data) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: 'testuser', 
          scores: scores || {}
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setRecommendations(result);
      
      if (onPlanGenerated) {
        onPlanGenerated(result);
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Provide fallback recommendations if API fails
      const fallbackRecommendations = {
        estimated_timeline_weeks: 6,
        focus_areas: ["Physical Health", "Nutrition", "Sleep & Recovery"],
        suggested_habits: [
          "Stretch every morning",
          "Eat one extra vegetable",
          "Sleep 7+ hours"
        ],
        assigned_task: "Stretch every morning for 5 minutes",
        current_focus_area: "Physical Health",
        difficulty: 1,
        consecutive_days: 0,
        missed_days_in_row: 0
      };
      setRecommendations(fallbackRecommendations);
      
      if (onPlanGenerated) {
        onPlanGenerated(fallbackRecommendations);
      }
    } finally {
      setIsLoading(false);
    }
  }, [scores, data, onPlanGenerated]);

  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  if (!scores) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Health Plan Recommendations</h3>
        <p>Please complete your health assessment in the Health Summary tab first.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Generating Your Personalized Health Plan...</h3>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }}></div>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Unable to generate recommendations</h3>
        <p>Please try again or check your health data.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100%', padding: '20px' }}>
      {/* Overview Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: '0 0 10px 0' }}>{recommendations.overview.title}</h2>
        <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.5' }}>
          {recommendations.overview.summary}
        </p>
      </div>

      {/* Recommendations Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Exercise */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#28a745', marginTop: 0 }}>💪 {recommendations.exercise.title}</h3>
          <p style={{ fontWeight: 'bold', color: '#666' }}>{recommendations.exercise.primary}</p>
          <ul style={{ paddingLeft: '20px' }}>
            {recommendations.exercise.recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* Nutrition */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#fd7e14', marginTop: 0 }}>🥗 {recommendations.nutrition.title}</h3>
          <p style={{ fontWeight: 'bold', color: '#666' }}>{recommendations.nutrition.focus}</p>
          <ul style={{ paddingLeft: '20px' }}>
            {recommendations.nutrition.recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* Sleep */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#6f42c1', marginTop: 0 }}>😴 {recommendations.sleep.title}</h3>
          <p style={{ fontWeight: 'bold', color: '#666' }}>{recommendations.sleep.current}</p>
          <ul style={{ paddingLeft: '20px' }}>
            {recommendations.sleep.recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{rec}</li>
            ))}
          </ul>
        </div>

        {/* Wellness */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '10px',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ color: '#20c997', marginTop: 0 }}>🧘 {recommendations.wellness.title}</h3>
          <p style={{ fontWeight: 'bold', color: '#666' }}>{recommendations.wellness.heartRateNote}</p>
          <ul style={{ paddingLeft: '20px' }}>
            {recommendations.wellness.recommendations.map((rec, index) => (
              <li key={index} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{rec}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Goals Section */}
      <div style={{ 
        background: '#fff3cd', 
        border: '1px solid #ffeaa7',
        padding: '20px', 
        borderRadius: '10px' 
      }}>
        <h3 style={{ color: '#856404', marginTop: 0 }}>🎯 {recommendations.goals.title}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
          {recommendations.goals.goals.map((goal, index) => (
            <div key={index} style={{ 
              background: 'white',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #ffeaa7'
            }}>
              {goal}
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button 
          onClick={generateRecommendations}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
          onMouseOver={(e) => e.target.style.background = '#0056b3'}
          onMouseOut={(e) => e.target.style.background = '#007bff'}
        >
          Refresh Recommendations
        </button>
      </div>
    </div>
  );
}