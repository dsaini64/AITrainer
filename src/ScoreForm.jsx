
import React, { useState, useEffect } from "react";

export default function ScoreForm({ onRecommendation, onScoreSubmit }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    age: 25,
    vo2Max: 30,
    preferredActivity: "Running",
    heartRate: 70,
    sleepHours: 7,
    weakestArea: "Nutrition",
    physicalHealth: 5,
    nutrition: 7,
    sleepQuality: 8,
    emotionalHealth: 9,
    socialConnection: 4,
    healthyHabits: 3,
    medicalHistory: 10
  });

  const [goals, setGoals] = useState([]);

  const surveySteps = [
    {
      title: "🎂 Basic Information",
      description: "Let's start with some basic details about you",
      fields: ["age", "preferredActivity"]
    },
    {
      title: "💪 Physical Fitness",
      description: "Tell us about your current fitness level",
      fields: ["vo2Max", "heartRate", "physicalHealth"]
    },
    {
      title: "🌙 Sleep & Recovery",
      description: "Quality sleep is crucial for longevity",
      fields: ["sleepHours", "sleepQuality"]
    },
    {
      title: "🥗 Nutrition & Lifestyle",
      description: "Your daily habits shape your health",
      fields: ["nutrition", "healthyHabits"]
    },
    {
      title: "🧠 Mental & Social Wellbeing",
      description: "Mental health is just as important as physical health",
      fields: ["emotionalHealth", "socialConnection"]
    },
    {
      title: "🎯 Focus Areas",
      description: "What area would you like to improve most?",
      fields: ["weakestArea", "medicalHistory"]
    }
  ];

  const fieldLabels = {
    age: "Age",
    vo2Max: "Estimated VO2 Max",
    preferredActivity: "Favorite Physical Activity",
    heartRate: "Resting Heart Rate (bpm)",
    sleepHours: "Hours of Sleep per Night",
    weakestArea: "Area You'd Like to Improve Most",
    physicalHealth: "Physical Health (1-10)",
    nutrition: "Nutrition Quality (1-10)",
    sleepQuality: "Sleep Quality (1-10)",
    emotionalHealth: "Emotional Wellbeing (1-10)",
    socialConnection: "Social Connection (1-10)",
    healthyHabits: "Healthy Habits Consistency (1-10)",
    medicalHistory: "Overall Health Status (1-10)"
  };

  const motivationalMessages = [
    "🌟 Great start! Every journey to better health begins with a single step.",
    "💪 Excellent! Understanding your fitness helps us create the perfect plan for you.",
    "😴 Sleep is your superpower for longevity! Let's optimize it.",
    "🥗 Nutrition fuels your body for a long, healthy life. You're doing great!",
    "🧠 Mental wellness is the foundation of a fulfilling, long life.",
    "🎯 Perfect! Now we can create your personalized longevity roadmap."
  ];

  // Function to load facts from backend
  const loadFacts = async () => {
    try {
      const res = await fetch(`/facts/testuser`);
      await res.json();
    } catch (err) {
      console.error('Failed to load facts:', err);
    }
  };

  useEffect(() => {
    loadFacts();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < surveySteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("Form submitted, generating plan...");
    
    const mergedScores = {
      "Age": formData.age,
      "VO2 Max": formData.vo2Max,
      "Preferred Activity": formData.preferredActivity,
      "Heart Rate": formData.heartRate,
      "Sleep": formData.sleepHours,
      "Weakest Area": formData.weakestArea,
      "Physical Health": formData.physicalHealth,
      "Nutrition": formData.nutrition,
      "Sleep & Recovery": formData.sleepQuality,
      "Emotional Health": formData.emotionalHealth,
      "Social Connection": formData.socialConnection,
      "Habits": formData.healthyHabits,
      "Medical History": formData.medicalHistory
    };
    
    console.log("Sending scores:", mergedScores);
    
    try {
      const res = await fetch(`/generate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "testuser", scores: mergedScores }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Received recommendation data:", data);
      
      onRecommendation(data);
      onScoreSubmit(mergedScores);
      
      // Store in session storage
      Object.keys(formData).forEach(key => {
        sessionStorage.setItem(key, formData[key]);
      });
      sessionStorage.setItem('healthScores', JSON.stringify(mergedScores));
      
    } catch (error) {
      console.error("Error generating plan:", error);
      alert("Error generating your plan. Please check the console for details.");
    }
  };

  const handleClear = () => {
    onRecommendation(null);
    onScoreSubmit(null);
    setCurrentStep(0);
    setFormData({
      age: 25,
      vo2Max: 30,
      preferredActivity: "Running",
      heartRate: 70,
      sleepHours: 7,
      weakestArea: "Nutrition",
      physicalHealth: 5,
      nutrition: 7,
      sleepQuality: 8,
      emotionalHealth: 9,
      socialConnection: 4,
      healthyHabits: 3,
      medicalHistory: 10
    });
    // Clear session storage
    Object.keys(formData).forEach(key => {
      sessionStorage.removeItem(key);
    });
    sessionStorage.removeItem('healthScores');
  };

  const renderField = (fieldName) => {
    const value = formData[fieldName];
    
    if (fieldName === 'preferredActivity') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "2px solid #e8f8f5",
            fontSize: "1rem",
            transition: "border-color 0.3s ease"
          }}
        >
          <option value="Running">🏃‍♂️ Running</option>
          <option value="Walking">🚶‍♀️ Walking</option>
          <option value="Swimming">🏊‍♂️ Swimming</option>
          <option value="Cycling">🚴‍♂️ Cycling</option>
          <option value="Yoga">🧘‍♀️ Yoga</option>
          <option value="Weight Training">🏋️‍♂️ Weight Training</option>
          <option value="Dancing">💃 Dancing</option>
          <option value="Sports">⚽ Sports</option>
        </select>
      );
    } else if (fieldName === 'weakestArea') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "2px solid #e8f8f5",
            fontSize: "1rem",
            transition: "border-color 0.3s ease"
          }}
        >
          <option value="Nutrition">🥗 Nutrition</option>
          <option value="Exercise">💪 Exercise</option>
          <option value="Sleep">😴 Sleep</option>
          <option value="Stress Management">🧘‍♂️ Stress Management</option>
          <option value="Social Connection">👥 Social Connection</option>
          <option value="Habits">📋 Daily Habits</option>
        </select>
      );
    } else {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleInputChange(fieldName, parseInt(e.target.value) || 0)}
          min={fieldName.includes('Health') || fieldName.includes('Quality') || fieldName.includes('Connection') || fieldName.includes('Habits') || fieldName.includes('History') ? 1 : 0}
          max={fieldName.includes('Health') || fieldName.includes('Quality') || fieldName.includes('Connection') || fieldName.includes('Habits') || fieldName.includes('History') ? 10 : (fieldName === 'age' ? 120 : (fieldName === 'sleepHours' ? 12 : 200))}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "2px solid #e8f8f5",
            fontSize: "1rem",
            transition: "border-color 0.3s ease"
          }}
        />
      );
    }
  };

  const currentStepData = surveySteps[currentStep];
  const isLastStep = currentStep === surveySteps.length - 1;
  const hasCompletedSurvey = sessionStorage.getItem("healthScores");

  if (hasCompletedSurvey) {
    return (
      <div style={{
        background: "white",
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        textAlign: "center"
      }}>
        <h3 style={{ color: "#27ae60", marginBottom: "20px" }}>
          ✅ Assessment Complete!
        </h3>
        <p style={{ marginBottom: "20px", color: "#2c3e50" }}>
          Your health assessment is complete. Check your Health Summary tab to see your results!
        </p>
        <button
          onClick={handleClear}
          style={{
            padding: "12px 24px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500"
          }}
        >
          Retake Assessment
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: "white",
      padding: "30px",
      borderRadius: "15px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px"
        }}>
          <span style={{ fontSize: "0.9rem", color: "#7f8c8d" }}>
            Step {currentStep + 1} of {surveySteps.length}
          </span>
          <span style={{ fontSize: "0.9rem", color: "#7f8c8d" }}>
            {Math.round(((currentStep + 1) / surveySteps.length) * 100)}% Complete
          </span>
        </div>
        <div style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#ecf0f1",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${((currentStep + 1) / surveySteps.length) * 100}%`,
            height: "100%",
            backgroundColor: "#27ae60",
            transition: "width 0.3s ease",
            borderRadius: "4px"
          }} />
        </div>
      </div>

      {/* Step Content */}
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <h2 style={{ color: "#2c3e50", marginBottom: "10px", fontSize: "1.5rem" }}>
          {currentStepData.title}
        </h2>
        <p style={{ color: "#7f8c8d", fontSize: "1rem", lineHeight: "1.6" }}>
          {currentStepData.description}
        </p>
        {currentStep > 0 && (
          <div style={{
            background: "#e8f8f5",
            padding: "15px",
            borderRadius: "10px",
            marginTop: "15px",
            fontStyle: "italic",
            color: "#27ae60"
          }}>
            {motivationalMessages[currentStep]}
          </div>
        )}
      </div>

      {/* Form Fields */}
      <form onSubmit={isLastStep ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
        <div style={{ marginBottom: "30px" }}>
          {currentStepData.fields.map((fieldName) => (
            <div key={fieldName} style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                marginBottom: "8px",
                color: "#2c3e50",
                fontWeight: "500",
                fontSize: "1rem"
              }}>
                {fieldLabels[fieldName]}
              </label>
              {renderField(fieldName)}
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            style={{
              padding: "12px 24px",
              backgroundColor: currentStep === 0 ? "#bdc3c7" : "#95a5a6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: currentStep === 0 ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "500",
              transition: "all 0.3s ease"
            }}
          >
            ← Previous
          </button>

          <button
            type="submit"
            style={{
              padding: "12px 24px",
              backgroundColor: isLastStep ? "#27ae60" : "#3498db",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "500",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            {isLastStep ? "🚀 Generate My Longevity Plan" : "Next →"}
          </button>
        </div>
      </form>
    </div>
  );
}
