import React, { useState, useEffect } from 'react';

export default function HealthPlanRecommendations({ healthScores, userFacts }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate recommendations based on health data
  const generateRecommendations = async () => {
    if (!healthScores) {
      return;
    }

    setLoading(true);
    try {
      // For now, we'll generate recommendations on the frontend
      // Later this could be moved to the backend AI service
      const plan = createPersonalizedPlan(healthScores, userFacts);
      setRecommendations(plan);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create personalized health plan based on user data
  const createPersonalizedPlan = (scores, facts = []) => {
    const age = scores.Age || 25;
    const vo2Max = scores['VO2 Max'] || 30;
    const heartRate = scores['Heart Rate'] || 70;
    const sleep = scores.Sleep || 7;
    const weakestArea = scores['Weakest Area'] || 'Nutrition';
    const preferredActivity = scores['Preferred Activity'] || 'Running';

    // Analyze health metrics
    const analysis = {
      fitnessLevel: vo2Max < 25 ? 'Beginner' : vo2Max < 40 ? 'Intermediate' : 'Advanced',
      heartRateZone: heartRate < 60 ? 'Low' : heartRate < 100 ? 'Normal' : 'High',
      sleepQuality: sleep < 6 ? 'Poor' : sleep < 8 ? 'Adequate' : 'Excellent',
      ageGroup: age < 30 ? 'Young Adult' : age < 50 ? 'Adult' : 'Mature Adult'
    };

    return {
      overview: {
        title: "Your Personalized Health Plan",
        summary: `Based on your health profile (${analysis.ageGroup}, ${analysis.fitnessLevel} fitness level), 
                 we've created a comprehensive plan focusing on your weakest area: ${weakestArea}.`
      },
      exercise: generateExerciseRecommendations(analysis, preferredActivity, vo2Max),
      nutrition: generateNutritionRecommendations(analysis, weakestArea),
      sleep: generateSleepRecommendations(analysis, sleep),
      wellness: generateWellnessRecommendations(analysis, heartRate),
      goals: generateGoals(analysis, scores)
    };
  };

  const generateExerciseRecommendations = (analysis, preferredActivity, vo2Max) => {
    const baseRecommendations = {
      title: "Exercise Recommendations",
      primary: `Focus on ${preferredActivity.toLowerCase()} as your preferred activity`,
      recommendations: []
    };

    if (analysis.fitnessLevel === 'Beginner') {
      baseRecommendations.recommendations = [
        "Start with 20-30 minutes of moderate activity 3x per week",
        "Include basic strength training 2x per week",
        "Focus on building endurance gradually",
        "Try bodyweight exercises like squats, push-ups, and planks"
      ];
    } else if (analysis.fitnessLevel === 'Intermediate') {
      baseRecommendations.recommendations = [
        "Aim for 45-60 minutes of activity 4-5x per week",
        "Mix cardio and strength training",
        "Include high-intensity interval training (HIIT) 1-2x per week",
        "Try advanced variations of your preferred activity"
      ];
    } else {
      baseRecommendations.recommendations = [
        "Maintain 60+ minutes of varied activity 5-6x per week",
        "Focus on performance optimization and recovery",
        "Include sport-specific training",
        "Consider training periodization"
      ];
    }

    return baseRecommendations;
  };

  const generateNutritionRecommendations = (analysis, weakestArea) => {
    const baseNutrition = {
      title: "Nutrition Recommendations",
      focus: weakestArea === 'Nutrition' ? "Priority Focus Area" : "Supporting Your Fitness Goals"
    };

    if (weakestArea === 'Nutrition') {
      baseNutrition.recommendations = [
        "Track your daily caloric intake for 1 week to establish baseline",
        "Eat protein with every meal (aim for 0.8-1g per kg body weight)",
        "Include 5-7 servings of fruits and vegetables daily",
        "Stay hydrated with 8-10 glasses of water per day",
        "Plan and prep meals ahead of time",
        "Limit processed foods and added sugars"
      ];
    } else {
      baseNutrition.recommendations = [
        "Maintain balanced meals with protein, carbs, and healthy fats",
        "Eat within 30 minutes post-workout for recovery",
        "Stay consistent with meal timing",
        "Include anti-inflammatory foods like berries and leafy greens"
      ];
    }

    return baseNutrition;
  };

  const generateSleepRecommendations = (analysis, currentSleep) => {
    const recommendations = {
      title: "Sleep Optimization",
      current: `Currently getting ${currentSleep} hours per night`,
      recommendations: []
    };

    if (analysis.sleepQuality === 'Poor') {
      recommendations.recommendations = [
        "Prioritize getting 7-9 hours of sleep nightly",
        "Establish a consistent bedtime routine",
        "Avoid screens 1 hour before bed",
        "Keep your bedroom cool (65-68°F) and dark",
        "Limit caffeine after 2 PM",
        "Consider relaxation techniques like meditation"
      ];
    } else if (analysis.sleepQuality === 'Adequate') {
      recommendations.recommendations = [
        "Aim to optimize sleep quality with consistent timing",
        "Create a relaxing bedtime environment",
        "Consider adding 30 minutes to your current sleep schedule"
      ];
    } else {
      recommendations.recommendations = [
        "Maintain your excellent sleep habits",
        "Continue with consistent sleep schedule",
        "Focus on sleep quality over quantity"
      ];
    }

    return recommendations;
  };

  const generateWellnessRecommendations = (analysis, heartRate) => {
    return {
      title: "Wellness & Recovery",
      heartRateNote: `Resting HR: ${heartRate} bpm (${analysis.heartRateZone})`,
      recommendations: [
        "Practice stress management techniques daily",
        "Include 10-15 minutes of stretching or yoga",
        "Take rest days between intense workouts",
        "Monitor your heart rate variability",
        "Consider meditation or mindfulness practices",
        "Schedule regular health check-ups"
      ]
    };
  };

  const generateGoals = (analysis, scores) => {
    const goals = {
      title: "30-Day Goals",
      goals: []
    };

    // Generate specific goals based on current metrics
    if (scores['VO2 Max'] < 35) {
      goals.goals.push("Improve cardiovascular fitness by 10%");
    }
    if (scores.Sleep < 7) {
      goals.goals.push("Achieve consistent 7+ hours of sleep");
    }
    if (scores['Weakest Area'] === 'Nutrition') {
      goals.goals.push("Track nutrition for 21 days");
    }
    
    goals.goals.push("Complete your assigned daily tasks for 2 weeks straight");
    goals.goals.push("Try one new healthy recipe per week");
    goals.goals.push("Increase daily step count by 1000 steps");

    return goals;
  };

  useEffect(() => {
    if (healthScores) {
      generateRecommendations();
    }
  }, [healthScores, userFacts]);

  if (!healthScores) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Health Plan Recommendations</h3>
        <p>Please complete your health assessment in the Health Summary tab first.</p>
      </div>
    );
  }

  if (loading) {
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