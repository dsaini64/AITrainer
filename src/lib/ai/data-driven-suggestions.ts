export interface UserData {
  goals: {
    nutrition: string[]
    exercise: string[]
    sleep: string[]
    social: string[]
    habits: string[]
  }
  preferences: {
    foodLikes: string[]
    foodDislikes: string[]
    allergies: string[]
    dietaryRestrictions: string[]
    workSchedule: {
      workDays: string[]
      workHours: string
      lunchBreak: string
    }
    exercisePreferences: {
      types: string[]
      duration: string
      intensity: string
      timeOfDay: string
    }
  }
  recentActivity: {
    lastMeal: {
      type: string
      timestamp: Date
      foods: string[]
    }
    lastWorkout: {
      type: string
      duration: number
      intensity: string
      timestamp: Date
    }
    sleepPattern: {
      bedtime: string
      wakeTime: string
      quality: number
    }
  }
  progress: {
    nutritionScore: number
    exerciseScore: number
    sleepScore: number
    overallProgress: number
  }
}

export interface MealRecommendation {
  name: string
  description: string
  ingredients: string[]
  nutrition: {
    protein: number
    carbs: number
    fat: number
    calories: number
  }
  prepTime: number
  difficulty: 'easy' | 'medium' | 'hard'
  reason: string
}

export interface ExerciseRecommendation {
  name: string
  type: string
  duration: number
  intensity: 'low' | 'medium' | 'high'
  equipment: string[]
  reason: string
}

export class DataDrivenSuggestions {
  private userData: UserData
  private currentTime: { hour: number; dayOfWeek: number; isWeekend: boolean }

  constructor(userData: UserData, currentTime: { hour: number; dayOfWeek: number; isWeekend: boolean }) {
    this.userData = userData
    this.currentTime = currentTime
  }

  // Generate specific meal recommendations based on user data
  generateMealRecommendations(): MealRecommendation[] {
    const recommendations: MealRecommendation[] = []
    const { hour, isWeekend } = this.currentTime
    const { goals, preferences, recentActivity } = this.userData

    // Morning recommendations (6-11 AM)
    if (hour >= 6 && hour <= 11) {
      if (goals.nutrition.includes('increase protein') || goals.nutrition.includes('muscle building')) {
        recommendations.push({
          name: 'High-Protein Breakfast Bowl',
          description: 'Greek yogurt parfait with berries, nuts, and protein powder',
          ingredients: ['Greek yogurt', 'Mixed berries', 'Almonds', 'Protein powder', 'Chia seeds'],
          nutrition: { protein: 35, carbs: 25, fat: 15, calories: 350 },
          prepTime: 5,
          difficulty: 'easy',
          reason: 'Perfect for your muscle building goals - 35g protein to start your day strong'
        })
      }

      if (goals.nutrition.includes('weight loss') || goals.nutrition.includes('fat loss')) {
        recommendations.push({
          name: 'Metabolism-Boosting Smoothie',
          description: 'Green smoothie with spinach, protein powder, and metabolism-boosting ingredients',
          ingredients: ['Spinach', 'Protein powder', 'Green apple', 'Ginger', 'Coconut water'],
          nutrition: { protein: 25, carbs: 20, fat: 8, calories: 220 },
          prepTime: 3,
          difficulty: 'easy',
          reason: 'Low-calorie, high-protein start to boost your metabolism for weight loss'
        })
      }

      if (goals.nutrition.includes('anti-inflammatory') || goals.nutrition.includes('longevity')) {
        recommendations.push({
          name: 'Anti-Inflammatory Oatmeal',
          description: 'Steel-cut oats with turmeric, berries, and healthy fats',
          ingredients: ['Steel-cut oats', 'Turmeric', 'Blueberries', 'Walnuts', 'Flax seeds'],
          nutrition: { protein: 15, carbs: 45, fat: 20, calories: 380 },
          prepTime: 10,
          difficulty: 'easy',
          reason: 'Anti-inflammatory ingredients perfect for your longevity goals'
        })
      }
    }

    // Lunch recommendations (12-2 PM)
    if (hour >= 12 && hour <= 14) {
      if (preferences.workSchedule.workDays.includes(this.currentTime.dayOfWeek.toString())) {
        // Work day lunch
        if (preferences.workSchedule.lunchBreak === 'short') {
          recommendations.push({
            name: 'Quick Protein Wrap',
            description: 'Turkey and avocado wrap with mixed greens',
            ingredients: ['Turkey breast', 'Avocado', 'Mixed greens', 'Whole grain wrap', 'Hummus'],
            nutrition: { protein: 30, carbs: 35, fat: 18, calories: 420 },
            prepTime: 5,
            difficulty: 'easy',
            reason: 'Quick, portable lunch perfect for your work schedule'
          })
        } else {
          recommendations.push({
            name: 'Quinoa Power Bowl',
            description: 'Quinoa bowl with roasted vegetables and grilled chicken',
            ingredients: ['Quinoa', 'Roasted vegetables', 'Grilled chicken', 'Tahini dressing', 'Pumpkin seeds'],
            nutrition: { protein: 40, carbs: 45, fat: 22, calories: 520 },
            prepTime: 15,
            difficulty: 'medium',
            reason: 'Nutrient-dense lunch to fuel your afternoon work'
          })
        }
      } else {
        // Weekend lunch
        recommendations.push({
          name: 'Weekend Salmon Salad',
          description: 'Grilled salmon with mixed greens and anti-inflammatory ingredients',
          ingredients: ['Salmon fillet', 'Mixed greens', 'Avocado', 'Cherry tomatoes', 'Olive oil'],
          nutrition: { protein: 35, carbs: 15, fat: 25, calories: 380 },
          prepTime: 20,
          difficulty: 'medium',
          reason: 'Perfect weekend meal with omega-3s for brain health and longevity'
        })
      }
    }

    // Dinner recommendations (5-8 PM)
    if (hour >= 17 && hour <= 20) {
      if (goals.nutrition.includes('muscle building') && recentActivity.lastWorkout) {
        recommendations.push({
          name: 'Post-Workout Recovery Meal',
          description: 'High-protein dinner to support muscle recovery and growth',
          ingredients: ['Grilled chicken breast', 'Sweet potato', 'Broccoli', 'Quinoa', 'Olive oil'],
          nutrition: { protein: 45, carbs: 50, fat: 20, calories: 580 },
          prepTime: 25,
          difficulty: 'medium',
          reason: 'Perfect post-workout meal with 45g protein to support your muscle building goals'
        })
      }

      if (goals.nutrition.includes('anti-inflammatory') || goals.nutrition.includes('longevity')) {
        recommendations.push({
          name: 'Longevity-Boosting Dinner',
          description: 'Mediterranean-inspired meal with anti-aging ingredients',
          ingredients: ['Salmon', 'Roasted vegetables', 'Brown rice', 'Olive oil', 'Herbs'],
          nutrition: { protein: 30, carbs: 40, fat: 25, calories: 480 },
          prepTime: 30,
          difficulty: 'medium',
          reason: 'Anti-inflammatory ingredients and omega-3s for longevity and brain health'
        })
      }

      if (goals.nutrition.includes('weight loss') || goals.nutrition.includes('fat loss')) {
        recommendations.push({
          name: 'Metabolism-Boosting Dinner',
          description: 'Lean protein with metabolism-boosting vegetables',
          ingredients: ['Turkey breast', 'Zucchini noodles', 'Bell peppers', 'Spices', 'Olive oil'],
          nutrition: { protein: 35, carbs: 20, fat: 15, calories: 320 },
          prepTime: 20,
          difficulty: 'easy',
          reason: 'Low-calorie, high-protein dinner to support your weight loss goals'
        })
      }
    }

    return recommendations
  }

  // Generate specific exercise recommendations based on user data
  generateExerciseRecommendations(): ExerciseRecommendation[] {
    const recommendations: ExerciseRecommendation[] = []
    const { hour, isWeekend } = this.currentTime
    const { goals, preferences, recentActivity } = this.userData

    // Morning exercise (6-11 AM)
    if (hour >= 6 && hour <= 11) {
      if (goals.exercise.includes('strength training') || goals.exercise.includes('muscle building')) {
        recommendations.push({
          name: 'Morning Strength Circuit',
          type: 'strength',
          duration: 30,
          intensity: 'medium',
          equipment: ['dumbbells', 'resistance bands'],
          reason: 'Morning strength training boosts metabolism and energy for the day'
        })
      }

      if (goals.exercise.includes('cardio') || goals.exercise.includes('weight loss')) {
        recommendations.push({
          name: 'Morning Cardio Blast',
          type: 'cardio',
          duration: 20,
          intensity: 'high',
          equipment: ['none'],
          reason: 'Morning cardio on empty stomach maximizes fat burning for weight loss'
        })
      }

      if (goals.exercise.includes('flexibility') || goals.exercise.includes('mobility')) {
        recommendations.push({
          name: 'Morning Yoga Flow',
          type: 'flexibility',
          duration: 15,
          intensity: 'low',
          equipment: ['yoga mat'],
          reason: 'Morning yoga improves flexibility and sets a calm tone for the day'
        })
      }
    }

    // Afternoon exercise (12-4 PM)
    if (hour >= 12 && hour <= 16) {
      if (preferences.workSchedule.workDays.includes(this.currentTime.dayOfWeek.toString())) {
        recommendations.push({
          name: 'Lunch Break Walk',
          type: 'cardio',
          duration: 15,
          intensity: 'low',
          equipment: ['none'],
          reason: 'Perfect for your work schedule - boosts energy and aids digestion'
        })
      } else {
        recommendations.push({
          name: 'Weekend Afternoon Workout',
          type: 'mixed',
          duration: 45,
          intensity: 'medium',
          equipment: ['dumbbells', 'resistance bands'],
          reason: 'Longer weekend workout to make up for weekday constraints'
        })
      }
    }

    // Evening exercise (5-8 PM)
    if (hour >= 17 && hour <= 20) {
      if (goals.exercise.includes('strength training')) {
        recommendations.push({
          name: 'Evening Strength Session',
          type: 'strength',
          duration: 45,
          intensity: 'high',
          equipment: ['dumbbells', 'barbell', 'resistance bands'],
          reason: 'Evening strength training when energy is highest for maximum performance'
        })
      }

      if (goals.exercise.includes('recovery') || goals.exercise.includes('flexibility')) {
        recommendations.push({
          name: 'Evening Recovery Session',
          type: 'recovery',
          duration: 20,
          intensity: 'low',
          equipment: ['foam roller', 'yoga mat'],
          reason: 'Evening recovery session to unwind and prepare for quality sleep'
        })
      }
    }

    return recommendations
  }

  // Generate personalized message based on user data and recommendations
  generatePersonalizedMessage(): string {
    const { goals, preferences, recentActivity, progress } = this.userData
    const { hour, isWeekend } = this.currentTime

    let message = ""

    // Time-based greeting
    if (hour >= 6 && hour <= 11) {
      message += "Good morning! "
    } else if (hour >= 12 && hour <= 16) {
      message += "Good afternoon! "
    } else if (hour >= 17 && hour <= 20) {
      message += "Good evening! "
    } else {
      message += "Hello! "
    }

    // Add progress context
    if (progress.overallProgress > 0.8) {
      message += "You're crushing your goals! "
    } else if (progress.overallProgress > 0.6) {
      message += "Great progress so far! "
    } else {
      message += "Let's get you back on track! "
    }

    // Add specific goal context
    if (goals.nutrition.includes('muscle building')) {
      message += "Since you're focused on muscle building, "
    } else if (goals.nutrition.includes('weight loss')) {
      message += "For your weight loss goals, "
    } else if (goals.nutrition.includes('longevity')) {
      message += "For your longevity goals, "
    }

    // Add time-specific context
    if (hour >= 6 && hour <= 11) {
      message += "here's your perfect morning routine:"
    } else if (hour >= 12 && hour <= 14) {
      message += "here's your ideal lunch:"
    } else if (hour >= 17 && hour <= 20) {
      message += "here's your perfect evening routine:"
    } else {
      message += "here's what I recommend:"
    }

    return message
  }

  // Get specific meal recommendation for current time
  getCurrentMealRecommendation(): MealRecommendation | null {
    const recommendations = this.generateMealRecommendations()
    return recommendations.length > 0 ? recommendations[0] : null
  }

  // Get specific exercise recommendation for current time
  getCurrentExerciseRecommendation(): ExerciseRecommendation | null {
    const recommendations = this.generateExerciseRecommendations()
    return recommendations.length > 0 ? recommendations[0] : null
  }
}
