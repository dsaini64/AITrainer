# 🌱 Longevity Coach - Health & Wellness Application

A comprehensive web application designed to help users stay motivated with healthy habits that increase longevity. This app provides personalized health assessments, recommendations, and an interactive AI coach to guide users on their wellness journey.

## 🎯 Features

### Three Main Tabs

1. **📊 Health Summary**
   - Display user's completed health survey results
   - Visual health metrics dashboard
   - Personalized health insights
   - Progress tracking over time

2. **🔬 Assessment**
   - Step-by-step health survey with 6 categories:
     - Basic Information (Age, Preferred Activity)
     - Physical Fitness (VO2 Max, Heart Rate, Physical Health)
     - Sleep & Recovery (Sleep Hours, Sleep Quality)
     - Nutrition & Lifestyle (Nutrition Quality, Healthy Habits)
     - Mental & Social Wellbeing (Emotional Health, Social Connection)
     - Focus Areas (Areas to improve, Overall Health Status)
   - Motivational messaging throughout the survey
   - Progress tracking with visual indicators
   - Personalized recommendations based on responses

3. **🤖 Interactive Helper**
   - AI-powered longevity coach
   - Goal setting and tracking system
   - Quick-start prompts for common health topics
   - Motivational check-ins
   - Real-time chat with health recommendations
   - Progress monitoring and encouragement

## 🚀 Getting Started

### Prerequisites

- Python 3.13+ 
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd longevity-coach
   ```

2. **Install Python dependencies:**
   ```bash
   pip3 install --break-system-packages -r requirements.txt
   ```

3. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

### Running the Application

1. **Start the Backend Server:**
   ```bash
   python3 src/backend/main.py
   ```
   The Flask backend will run on `http://localhost:5000`

2. **Start the Frontend Server:**
   ```bash
   npm run dev
   ```
   The React frontend will run on `http://localhost:5173`

3. **Access the Application:**
   Open your browser and navigate to `http://localhost:5173`

## 🏗️ Architecture

### Backend (Flask)
- **Framework:** Flask with CORS support
- **AI Integration:** OpenAI API (with mock responses fallback)
- **Features:**
  - Health assessment processing
  - Personalized recommendation generation
  - Chat interface with AI coach
  - User progress tracking
  - Goal management system

### Frontend (React + Vite)
- **Framework:** React 19 with Vite
- **Styling:** CSS-in-JS with modern gradients and animations
- **Features:**
  - Responsive design
  - Progressive survey interface
  - Real-time chat interface
  - Goal tracking system
  - Motivational UI elements

## 📁 Project Structure

```
longevity-coach/
├── src/
│   ├── backend/
│   │   └── main.py              # Flask backend server
│   ├── App.jsx                  # Main React component
│   ├── ScoreForm.jsx           # Health assessment form
│   ├── ChatInterface.jsx       # AI coach chat interface
│   ├── FeedbackPanel.jsx       # Recommendations display
│   ├── HealthPlanRecommendations.jsx
│   ├── PlanDiscussion.jsx      # Goal discussion interface
│   ├── LongevityTip.jsx        # Daily tips component
│   └── styles.css              # Application styles
├── public/                     # Static assets
├── package.json               # Frontend dependencies
├── requirements.txt           # Backend dependencies
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

## 🎨 Key Features

### Health Assessment
- **Progressive Survey:** 6-step assessment covering all aspects of health
- **Motivational Messaging:** Encouraging messages throughout the process
- **Visual Progress:** Progress bars and completion indicators
- **Smart Validation:** Input validation and helpful hints

### AI Coach
- **Quick Start Prompts:** 8 pre-defined topics for easy engagement
- **Goal Setting:** Add, track, and manage personal health goals
- **Motivational Check-ins:** Regular encouragement and progress reviews
- **Real-time Chat:** Interactive conversations with AI health coach

### Health Summary
- **Visual Dashboard:** Grid-based display of health metrics
- **Personalized Insights:** AI-generated recommendations
- **Progress Tracking:** Historical data and trends
- **Action Items:** Clear next steps for improvement

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
FLASK_ENV=development
```

**Note:** The application works with mock responses if no OpenAI API key is provided.

### Customization

- **Colors:** Modify the gradient colors in component styles
- **Survey Questions:** Update the survey structure in `ScoreForm.jsx`
- **AI Prompts:** Customize the coaching prompts in `ChatInterface.jsx`
- **Recommendations:** Adjust the recommendation logic in `backend/main.py`

## 🎯 User Journey

1. **Welcome:** Users are greeted with an intuitive interface
2. **Assessment:** Complete a comprehensive health survey
3. **Summary:** View personalized health dashboard
4. **Coaching:** Interact with AI coach for guidance
5. **Goal Setting:** Set and track health goals
6. **Progress:** Monitor improvements over time

## 🌟 Motivational Design

The application is designed with motivation at its core:

- **Encouraging Colors:** Green gradients representing growth and health
- **Progress Indicators:** Visual feedback on completion and improvement
- **Positive Messaging:** Motivational text throughout the user journey
- **Achievement Recognition:** Celebrating completed goals and milestones
- **Gentle Guidance:** Supportive rather than judgmental tone

## 🚀 Future Enhancements

- **Data Persistence:** User account system with data storage
- **Advanced Analytics:** Detailed health trend analysis
- **Social Features:** Community support and challenges
- **Wearable Integration:** Sync with fitness trackers and health apps
- **Personalized Meal Plans:** Nutrition recommendations and recipes
- **Exercise Programs:** Customized workout routines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for AI-powered coaching capabilities
- React and Vite communities for excellent development tools
- Flask community for the robust backend framework
- All contributors to the longevity and health research that inspired this app

---

**Start your longevity journey today! 🌱**

For support or questions, please open an issue or contact the development team.