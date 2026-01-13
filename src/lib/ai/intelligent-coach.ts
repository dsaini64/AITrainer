import { UserContext } from './context'
import { PersonalMemory, UserPreference, CompletedAction } from './personal-memory'
import { DataDrivenSuggestions, UserData } from './data-driven-suggestions'

export interface CoachingInsight {
  type: 'timing' | 'goal_progress' | 'pattern_analysis' | 'health_optimization' | 'motivation'
  priority: 'high' | 'medium' | 'low'
  message: string
  actions: Array<{
    id: string
    type: 'checklist' | 'timer' | 'reminder' | 'schedule'
    title: string
    description?: string
  }>
  timing?: {
    optimalTime: string
    frequency: 'daily' | 'weekly' | 'as_needed'
    conditions: string[]
  }
}

export interface UserPattern {
  sleepPattern: {
    averageBedtime: string
    averageWakeTime: string
    consistency: number
  }
  energyPattern: {
    peakHours: string[]
    lowHours: string[]
    weeklyTrend: number[]
  }
  activityPattern: {
    mostActiveDays: string[]
    preferredExerciseTime: string
    restDayPattern: string[]
  }
  goalProgress: {
    nutrition: number
    exercise: number
    sleep: number
    stress: number
    social: number
  }
}

export class IntelligentCoach {
  private userContext: UserContext
  private userPatterns: UserPattern
  private currentTime: { hour: number; dayOfWeek: number; isWeekend: boolean; season: string; timezone: string }
  private personalMemory: PersonalMemory

  constructor(userContext: UserContext) {
    this.userContext = userContext
    this.currentTime = userContext.currentTime
    this.userPatterns = this.analyzeUserPatterns()
    this.personalMemory = new PersonalMemory(userContext.userId)
  }

  private analyzeUserPatterns(): UserPattern {
    // Analyze user data to understand patterns
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    return {
      sleepPattern: {
        averageBedtime: '22:30',
        averageWakeTime: '07:00',
        consistency: 0.85
      },
      energyPattern: {
        peakHours: ['09:00', '14:00', '19:00'],
        lowHours: ['13:00', '15:00'],
        weeklyTrend: [8, 7, 8, 6, 7, 9, 8] // Energy levels by day
      },
      activityPattern: {
        mostActiveDays: ['Monday', 'Wednesday', 'Friday'],
        preferredExerciseTime: '18:00',
        restDayPattern: ['Sunday']
      },
      goalProgress: {
        nutrition: 0.75,
        exercise: 0.60,
        sleep: 0.85,
        stress: 0.40,
        social: 0.30
      }
    }
  }

  public async generateProactiveInsights(): Promise<CoachingInsight[]> {
    const insights: CoachingInsight[] = []
    const hour = this.currentTime.hour
    const dayOfWeek = this.currentTime.dayOfWeek
    const isWeekend = this.currentTime.isWeekend

    console.log('Generating simple insights for hour:', hour, 'isWeekend:', isWeekend)

    // Use only simple insights to avoid multiple API calls
    console.log('Using simple insights to prevent multiple messages')
    insights.push(this.generateSimpleInsight())

    // Return only the first insight to prevent multiple messages
    return insights.slice(0, 1)
  }

  private generateMorningInsight(): CoachingInsight {
    const hour = this.currentTime.hour
    const isWeekend = this.currentTime.isWeekend

    if (hour >= 6 && hour <= 8) {
      return {
        type: 'timing',
        priority: 'high',
        message: isWeekend 
          ? "Good morning! How about 10 minutes of stretching or meditation? It'll boost your mood and energy for the day! 🧘‍♀️"
          : "Good morning! Try a protein smoothie with Greek yogurt and berries, or scrambled eggs with avocado toast. Protein keeps you energized and focused! 💪",
        actions: [
          {
            id: `morning-${Date.now()}-1`,
            type: 'checklist',
            title: isWeekend ? '10-minute morning stretch' : 'Try protein smoothie or eggs',
            description: isWeekend ? 'Gentle movement to wake up your body' : 'High-protein breakfast for sustained energy'
          },
          {
            id: `morning-${Date.now()}-2`,
            type: 'timer',
            title: '5-minute mindfulness',
            description: 'Set intention for the day'
          }
        ],
        timing: {
          optimalTime: '07:00',
          frequency: 'daily',
          conditions: ['morning', 'early_rise']
        }
      }
    }

    return {
      type: 'timing',
      priority: 'medium',
      message: "Morning energy check! How are you feeling today? Your energy levels set the tone for everything else.",
      actions: [
        {
          id: `energy-${Date.now()}-1`,
          type: 'checklist',
          title: 'Rate your energy (1-10)',
          description: 'Track your morning energy levels'
        }
      ]
    }
  }

  private generateAfternoonInsight(): CoachingInsight {
    const hour = this.currentTime.hour
    const isWeekend = this.currentTime.isWeekend

    if (hour >= 12 && hour <= 14) {
      return {
        type: 'timing',
        priority: 'high',
        message: isWeekend
          ? "Lunch time! How about a quinoa bowl with roasted vegetables and grilled chicken? Or a salmon salad with avocado and nuts? These meals give you protein for muscle health, healthy fats for brain function, and antioxidants to fight inflammation! 🥗"
          : "Lunch break! Try a quinoa bowl with chickpeas and vegetables, or a turkey and avocado wrap. These protein-rich options will keep you energized all afternoon and support your muscle health! 💪",
        actions: [
          {
            id: `lunch-${Date.now()}-1`,
            type: 'checklist',
            title: isWeekend ? 'Try quinoa bowl with roasted vegetables' : 'Try quinoa bowl with protein',
            description: isWeekend ? 'High in protein, fiber, and antioxidants' : 'Perfect for sustained energy and protein goals'
          },
          {
            id: `lunch-${Date.now()}-2`,
            type: 'timer',
            title: 'Take a 5-minute walk after eating',
            description: 'Aid digestion and boost energy'
          }
        ],
        timing: {
          optimalTime: '13:00',
          frequency: 'daily',
          conditions: ['lunch_time']
        }
      }
    }

    return {
      type: 'timing',
      priority: 'medium',
      message: "Afternoon check-in! How's your energy holding up? This is often when people need a little boost.",
      actions: [
        {
          id: `afternoon-${Date.now()}-1`,
          type: 'checklist',
          title: 'Take a 2-minute break',
          description: 'Step away from your desk and stretch'
        }
      ]
    }
  }

  private generateEveningInsight(): CoachingInsight {
    const hour = this.currentTime.hour
    const isWeekend = this.currentTime.isWeekend

    if (hour >= 17 && hour <= 20) {
      return {
        type: 'timing',
        priority: 'high',
        message: isWeekend
          ? "Evening wind-down time! How did your day go? Reflection helps you appreciate progress and plan for tomorrow! 🌅"
          : "End of work day! Try grilled salmon with roasted vegetables, or lentil soup with whole grain bread. These anti-inflammatory meals help your body recover and reduce stress! 🍽️",
        actions: [
          {
            id: `evening-${Date.now()}-1`,
            type: 'checklist',
            title: isWeekend ? 'Reflect on your day' : 'Try salmon or lentil soup for dinner',
            description: isWeekend ? 'What went well? What are you grateful for?' : 'Anti-inflammatory nutrients for longevity'
          },
          {
            id: `evening-${Date.now()}-2`,
            type: 'timer',
            title: 'Prepare for tomorrow',
            description: 'Set yourself up for success'
          }
        ],
        timing: {
          optimalTime: '18:00',
          frequency: 'daily',
          conditions: ['evening', 'work_end']
        }
      }
    }

    return {
      type: 'timing',
      priority: 'medium',
      message: "Evening transition time! How are you feeling? This is a great moment to check in with yourself.",
      actions: [
        {
          id: `evening-${Date.now()}-1`,
          type: 'checklist',
          title: 'Evening energy check',
          description: 'Rate your energy and mood'
        }
      ]
    }
  }

  private generateNightInsight(): CoachingInsight {
    const hour = this.currentTime.hour

    if (hour >= 20 && hour <= 22) {
      return {
        type: 'timing',
        priority: 'high',
        message: "Wind-down time! Your body is preparing for sleep. This is the perfect window to optimize your recovery and set yourself up for a great tomorrow.",
        actions: [
          {
            id: `night-${Date.now()}-1`,
            type: 'checklist',
            title: 'Create a relaxing bedtime routine',
            description: 'Dim lights, avoid screens, prepare for sleep'
          },
          {
            id: `night-${Date.now()}-2`,
            type: 'timer',
            title: '10-minute gratitude practice',
            description: 'Reflect on positive moments from your day'
          }
        ],
        timing: {
          optimalTime: '21:00',
          frequency: 'daily',
          conditions: ['bedtime_prep']
        }
      }
    }

    return {
      type: 'timing',
      priority: 'medium',
      message: "Night time check-in! How are you feeling? This is a great time to reflect and prepare for rest.",
      actions: [
        {
          id: `night-${Date.now()}-1`,
          type: 'checklist',
          title: 'Prepare for sleep',
          description: 'Set up your environment for rest'
        }
      ]
    }
  }

  private generateGoalBasedInsights(): CoachingInsight[] {
    const insights: CoachingInsight[] = []
    const { goalProgress } = this.userPatterns

    // Nutrition goal insights
    if (goalProgress.nutrition < 0.7) {
      insights.push({
        type: 'goal_progress',
        priority: 'high',
        message: "Your nutrition goals need attention! Let's boost your protein and fiber intake. Try adding a handful of nuts to your snack, or swap white rice for quinoa in your next meal. Both are simple changes with big longevity benefits.",
        actions: [
          {
            id: `nutrition-${Date.now()}-1`,
            type: 'checklist',
            title: 'Add nuts to snack or swap rice for quinoa',
            description: 'Simple changes with big longevity benefits'
          }
        ]
      })
    }

    // Exercise goal insights
    if (goalProgress.exercise < 0.6) {
      insights.push({
        type: 'goal_progress',
        priority: 'medium',
        message: "Your exercise routine needs a boost! Try a 15-minute walk around the block, or 10 minutes of bodyweight exercises like squats and push-ups. Both are quick, effective, and perfect for your longevity goals.",
        actions: [
          {
            id: `exercise-${Date.now()}-1`,
            type: 'timer',
            title: '15-minute walk or 10-minute bodyweight workout',
            description: 'Quick, effective movement for longevity'
          }
        ]
      })
    }

    // Sleep goal insights
    if (goalProgress.sleep < 0.8) {
      insights.push({
        type: 'goal_progress',
        priority: 'high',
        message: "Sleep is the foundation of longevity! Try dimming your lights 2 hours before bed, or taking a warm shower to signal your body it's time to sleep. Both help optimize your sleep quality for better recovery.",
        actions: [
          {
            id: `sleep-${Date.now()}-1`,
            type: 'checklist',
            title: 'Dim lights 2 hours before bed or take warm shower',
            description: 'Signal your body it\'s time for quality sleep'
          }
        ]
      })
    }

    return insights
  }

  private generatePatternInsights(): CoachingInsight[] {
    const insights: CoachingInsight[] = []
    const { sleepPattern, energyPattern } = this.userPatterns

    // Sleep pattern insights
    if (sleepPattern.consistency < 0.8) {
      insights.push({
        type: 'pattern_analysis',
        priority: 'medium',
        message: "I notice your sleep schedule could be more consistent. Regular sleep times are crucial for longevity. Let's work on this together.",
        actions: [
          {
            id: `sleep-pattern-${Date.now()}-1`,
            type: 'reminder',
            title: 'Set consistent bedtime',
            description: 'Choose a time and stick to it'
          }
        ]
      })
    }

    // Energy pattern insights
    const currentHour = this.currentTime.hour
    const isLowEnergyTime = energyPattern.lowHours.includes(`${currentHour}:00`)
    
    if (isLowEnergyTime) {
      insights.push({
        type: 'pattern_analysis',
        priority: 'low',
        message: "This is typically a low-energy time for you. Perfect opportunity for a gentle break or light movement.",
        actions: [
          {
            id: `energy-boost-${Date.now()}-1`,
            type: 'timer',
            title: '5-minute energy boost',
            description: 'Light stretching or walking'
          }
        ]
      })
    }

    return insights
  }

  private isOptimalTiming(insight: CoachingInsight): boolean {
    if (!insight.timing) return true

    const { optimalTime, frequency, conditions } = insight.timing
    const currentHour = this.currentTime.hour
    const targetHour = parseInt(optimalTime.split(':')[0])

    // Check if it's the right time
    if (Math.abs(currentHour - targetHour) > 1) return false

    // Check frequency constraints
    if (frequency === 'daily') return true
    if (frequency === 'weekly' && this.currentTime.dayOfWeek === 1) return true // Monday
    if (frequency === 'as_needed') return true

    return true
  }

  public generatePersonalizedMessage(insight: CoachingInsight): string {
    const { type, message } = insight
    
    // Use personal memory to personalize the message
    let personalizedMessage = this.personalMemory.getPersonalizedMessage(message, {
      timeOfDay: this.getTimeOfDay(),
      dayOfWeek: this.currentTime.dayOfWeek,
      userContext: this.userContext
    })
    
    // Add personal memory context
    const memorySummary = this.personalMemory.getMemorySummary()
    if (memorySummary) {
      personalizedMessage += ` ${memorySummary}`
    }
    
    // Add context-specific details
    if (this.userContext.lastCheckin) {
      const daysSinceCheckin = Math.floor(
        (Date.now() - this.userContext.lastCheckin.date.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysSinceCheckin > 2) {
        personalizedMessage += ` I haven't heard from you in a few days - how are you doing?`
      }
    }

    // Add goal-specific context
    if (this.userContext.activeGoals.length > 0) {
      const primaryGoal = this.userContext.activeGoals[0]
      personalizedMessage += ` I know you're working on ${primaryGoal.title.toLowerCase()} - this insight should help with that!`
    }

    return personalizedMessage
  }

  private generateGeneralInsight(): CoachingInsight {
    const hour = this.currentTime.hour
    const isWeekend = this.currentTime.isWeekend
    
    // Generate a general insight based on current time
    if (hour >= 6 && hour <= 11) {
      return {
        type: 'timing',
        priority: 'medium',
        message: "Good morning! How about a protein-rich breakfast and some gentle movement? This combo gives you sustained energy and improves your mood! 🌟",
        actions: [
          {
            id: `general-${Date.now()}-1`,
            type: 'checklist',
            title: 'Try a protein smoothie or eggs',
            description: 'High-protein breakfast for sustained energy'
          },
          {
            id: `general-${Date.now()}-2`,
            type: 'timer',
            title: '5-minute morning stretch',
            description: 'Gentle movement to wake up your body'
          }
        ]
      }
    } else if (hour >= 12 && hour <= 16) {
      return {
        type: 'timing',
        priority: 'medium',
        message: "Afternoon energy boost time! Perfect opportunity to refuel with nutrient-dense foods and get some movement in.",
        actions: [
          {
            id: `general-${Date.now()}-1`,
            type: 'checklist',
            title: 'Try a quinoa bowl or turkey wrap',
            description: 'Nutritious lunch for sustained energy'
          },
          {
            id: `general-${Date.now()}-2`,
            type: 'timer',
            title: '10-minute walk',
            description: 'Boost energy and aid digestion'
          }
        ]
      }
    } else {
      return {
        type: 'timing',
        priority: 'medium',
        message: "Evening wind-down time! Perfect opportunity to reflect on your day and prepare for a restful night.",
        actions: [
          {
            id: `general-${Date.now()}-1`,
            type: 'checklist',
            title: 'Try salmon or lentil soup for dinner',
            description: 'Anti-inflammatory nutrients for longevity'
          },
          {
            id: `general-${Date.now()}-2`,
            type: 'timer',
            title: 'Dim lights 2 hours before bed',
            description: 'Signal your body it\'s time for quality sleep'
          }
        ]
      }
    }
  }

  private convertContextToUserData(): UserData {
    // Convert user context to user data format for data-driven suggestions
    return {
      goals: {
        nutrition: this.userContext.activeGoals
          .filter(goal => goal.category === 'nutrition')
          .map(goal => goal.title.toLowerCase()),
        exercise: this.userContext.activeGoals
          .filter(goal => goal.category === 'exercise')
          .map(goal => goal.title.toLowerCase()),
        sleep: this.userContext.activeGoals
          .filter(goal => goal.category === 'sleep')
          .map(goal => goal.title.toLowerCase()),
        social: this.userContext.activeGoals
          .filter(goal => goal.category === 'social')
          .map(goal => goal.title.toLowerCase()),
        habits: this.userContext.activeGoals
          .filter(goal => goal.category === 'habits')
          .map(goal => goal.title.toLowerCase())
      },
      preferences: {
        foodLikes: this.personalMemory.patterns.foodPreferences.likes,
        foodDislikes: this.personalMemory.patterns.foodPreferences.dislikes,
        allergies: this.personalMemory.patterns.foodPreferences.allergies,
        dietaryRestrictions: this.personalMemory.patterns.foodPreferences.dietaryRestrictions,
        workSchedule: {
          workDays: this.personalMemory.patterns.workSchedule.workDays,
          workHours: this.personalMemory.patterns.workSchedule.workHours,
          lunchBreak: this.personalMemory.patterns.workSchedule.lunchBreak
        },
        exercisePreferences: {
          types: this.personalMemory.patterns.exercisePreferences.types,
          duration: this.personalMemory.patterns.exercisePreferences.duration,
          intensity: this.personalMemory.patterns.exercisePreferences.intensity,
          timeOfDay: this.personalMemory.patterns.exercisePreferences.timeOfDay
        }
      },
      recentActivity: {
        lastMeal: {
          type: 'unknown',
          timestamp: new Date(),
          foods: []
        },
        lastWorkout: {
          type: 'unknown',
          duration: 0,
          intensity: 'medium',
          timestamp: new Date()
        },
        sleepPattern: {
          bedtime: '10:00 PM',
          wakeTime: '6:00 AM',
          quality: 0.8
        }
      },
      progress: {
        nutritionScore: this.userPatterns.goalProgress.nutrition,
        exerciseScore: this.userPatterns.goalProgress.exercise,
        sleepScore: this.userPatterns.goalProgress.sleep,
        overallProgress: (this.userPatterns.goalProgress.nutrition + 
                         this.userPatterns.goalProgress.exercise + 
                         this.userPatterns.goalProgress.sleep) / 3
      }
    }
  }

  private generateDataDrivenInsight(suggestionsEngine: DataDrivenSuggestions): CoachingInsight | null {
    const hour = this.currentTime.hour
    const isWeekend = this.currentTime.isWeekend

    // Get specific recommendations based on time and user data
    const mealRecommendation = suggestionsEngine.getCurrentMealRecommendation()
    const exerciseRecommendation = suggestionsEngine.getCurrentExerciseRecommendation()
    const personalizedMessage = suggestionsEngine.generatePersonalizedMessage()

    if (!mealRecommendation && !exerciseRecommendation) {
      return null
    }

    // Build specific, data-driven message
    let message = personalizedMessage
    const actions: any[] = []

    if (mealRecommendation) {
      message += `\n\n🍽️ **${mealRecommendation.name}**\n${mealRecommendation.description}\n\n**Why this works for you:** ${mealRecommendation.reason}\n\n**Nutrition:** ${mealRecommendation.nutrition.protein}g protein, ${mealRecommendation.nutrition.calories} calories\n**Prep time:** ${mealRecommendation.prepTime} minutes`
      
      actions.push({
        id: `meal-${Date.now()}-1`,
        type: 'checklist',
        title: `Try ${mealRecommendation.name}`,
        description: mealRecommendation.reason
      })
    }

    if (exerciseRecommendation) {
      message += `\n\n🏃‍♂️ **${exerciseRecommendation.name}**\n${exerciseRecommendation.duration} minutes, ${exerciseRecommendation.intensity} intensity\n\n**Why this works for you:** ${exerciseRecommendation.reason}`
      
      actions.push({
        id: `exercise-${Date.now()}-1`,
        type: 'timer',
        title: `Start ${exerciseRecommendation.name}`,
        description: `${exerciseRecommendation.duration} minutes, ${exerciseRecommendation.intensity} intensity`
      })
    }

    return {
      type: 'timing',
      priority: 'high',
      message: message,
      actions: actions
    }
  }

  private async generateDynamicInsight(): Promise<CoachingInsight | null> {
    try {
      const timeOfDay = this.getTimeOfDay()
      const userGoals = this.personalMemory.patterns.goals
      const recentActions = this.personalMemory.patterns.recentActions
      const preferences = this.personalMemory.patterns.preferences

      const response = await fetch('/api/coach/dynamic-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          timeOfDay,
          userGoals,
          recentActions,
          preferences
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get dynamic suggestion')
      }

      const data = await response.json()
      if (!data.success || !data.suggestion) {
        throw new Error('No suggestion returned')
      }

      const suggestion = data.suggestion
      return {
        type: 'dynamic',
        priority: 'high',
        message: suggestion.message,
        actions: suggestion.actions || [],
        timing: {
          optimalTime: new Date().toISOString(),
          frequency: 'daily',
          conditions: ['dynamic']
        }
      }
    } catch (error) {
      console.error('Error generating dynamic insight:', error)
      return null
    }
  }

  private generateSimpleInsight(): CoachingInsight {
    const hour = this.currentTime.hour
    const isWeekend = this.currentTime.isWeekend
    
    // 30% chance of check-in message, 70% chance of suggestion
    const isCheckIn = Math.random() < 0.3

    if (isCheckIn) {
      return this.generateCheckInInsight()
    }
    
    if (hour >= 6 && hour <= 11) {
      return {
        type: 'timing',
        priority: 'medium',
        message: "Good morning! How about a protein-rich breakfast and some gentle movement? This combo gives you sustained energy and improves your mood! 🌟",
        actions: [
          {
            id: `simple-${Date.now()}-1`,
            type: 'checklist',
            title: 'Try a protein smoothie or eggs',
            description: 'High-protein breakfast for sustained energy'
          },
          {
            id: `simple-${Date.now()}-2`,
            type: 'timer',
            title: '5-minute morning stretch',
            description: 'Gentle movement to wake up your body'
          }
        ]
      }
    } else if (hour >= 12 && hour <= 16) {
      return {
        type: 'timing',
        priority: 'medium',
        message: "Afternoon energy boost time! Perfect opportunity to refuel with nutrient-dense foods and get some movement in.",
        actions: [
          {
            id: `simple-${Date.now()}-1`,
            type: 'checklist',
            title: 'Try a quinoa bowl or turkey wrap',
            description: 'Nutritious lunch for sustained energy'
          },
          {
            id: `simple-${Date.now()}-2`,
            type: 'timer',
            title: '10-minute walk',
            description: 'Boost energy and aid digestion'
          }
        ]
      }
    } else {
      return {
        type: 'timing',
        priority: 'medium',
        message: "Evening wind-down time! Perfect opportunity to reflect on your day and prepare for a restful night.",
        actions: [
          {
            id: `simple-${Date.now()}-1`,
            type: 'checklist',
            title: 'Try salmon or lentil soup for dinner',
            description: 'Anti-inflammatory nutrients for longevity'
          },
          {
            id: `simple-${Date.now()}-2`,
            type: 'timer',
            title: 'Dim lights 2 hours before bed',
            description: 'Signal your body it\'s time for quality sleep'
          }
        ]
      }
    }
  }

  private getTimeOfDay(): string {
    const hour = this.currentTime.hour
    if (hour >= 6 && hour <= 8) return 'morning'
    if (hour >= 12 && hour <= 14) return 'lunch'
    if (hour >= 17 && hour <= 20) return 'evening'
    if (hour >= 20 && hour <= 22) return 'night'
    return 'other'
  }

  private generateCheckInInsight(): CoachingInsight {
    const hour = this.currentTime.hour
    const isWeekend = this.currentTime.isWeekend
    
    const checkInMessages = [
      {
        message: "Hey! How's it going with your health goals? I'd love to hear about your progress! 💪",
        actions: [
          {
            id: `checkin-${Date.now()}-1`,
            type: 'checklist',
            title: 'Share your progress',
            description: 'Tell me what you\'ve accomplished today'
          },
          {
            id: `checkin-${Date.now()}-2`,
            type: 'checklist',
            title: 'Rate your energy (1-10)',
            description: 'How are you feeling right now?'
          }
        ]
      },
      {
        message: "Quick check-in! How are you feeling today? Any wins or challenges you'd like to share? 🌟",
        actions: [
          {
            id: `checkin-${Date.now()}-1`,
            type: 'checklist',
            title: 'Share a win',
            description: 'What went well today?'
          },
          {
            id: `checkin-${Date.now()}-2`,
            type: 'checklist',
            title: 'Ask for help',
            description: 'What do you need support with?'
          }
        ]
      },
      {
        message: "How's your day going? I'm here to support you with your longevity goals! 🎯",
        actions: [
          {
            id: `checkin-${Date.now()}-1`,
            type: 'checklist',
            title: 'Update on goals',
            description: 'How are your health goals progressing?'
          },
          {
            id: `checkin-${Date.now()}-2`,
            type: 'checklist',
            title: 'Request suggestions',
            description: 'What would help you most right now?'
          }
        ]
      },
      {
        message: "Hey there! How are you feeling? Any energy dips or wins you'd like to talk about? 😊",
        actions: [
          {
            id: `checkin-${Date.now()}-1`,
            type: 'checklist',
            title: 'Energy check',
            description: 'Rate your current energy level'
          },
          {
            id: `checkin-${Date.now()}-2`,
            type: 'checklist',
            title: 'Share your mood',
            description: 'How are you feeling emotionally?'
          }
        ]
      }
    ]

    const selectedCheckIn = checkInMessages[Math.floor(Math.random() * checkInMessages.length)]

    return {
      type: 'checkin',
      priority: 'high',
      message: selectedCheckIn.message,
      actions: selectedCheckIn.actions,
      timing: {
        optimalTime: hour >= 6 && hour <= 10 ? '09:00' : hour >= 12 && hour <= 16 ? '14:00' : '18:00',
        frequency: 'daily',
        conditions: ['checkin', 'progress_tracking']
      }
    }
  }
}
