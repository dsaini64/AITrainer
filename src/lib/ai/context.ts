import { supabase } from '@/lib/supabase/client'
import { CoachMessage } from '@/types'

export interface UserContext {
  userId: string
  // Real user profile data
  profile?: {
    age: number
    gender: string
    race: string
    cdcAge: number
    ageDiff: number
    totalRisk: number
  }
  // Onboarding data
  onboarding?: {
    mainGoal: string
    goalImportance: string
    confidence: number
    coachingStyle: string
    motivationType: string
    wakeUpTime: string
    bedTime: string
    busyDays: string[]
    exerciseLocation: string
    equipment: string[]
    checkInFrequency: string
    preferredTime: string
    tone: string
    wearables: string[]
    supportSystem: string
    daysPerWeek: number
    motivationStatement: string
  }
  healthMetrics?: {
    strengthTraining: { level: number; score: number }
    cardioExercise: { level: number; score: number }
    physicalActivity: { level: number; score: number }
    flexibility: { level: number; score: number }
    sittingTime: { level: number; score: number }
    fruitsVegetables: { level: number; score: number }
    prepackagedFoods: { level: number; score: number }
    eatingOut: { level: number; score: number }
    sweetenedDrinks: { level: number; score: number }
    sleepRegularity: { level: number; score: number }
    sleepQuality: { level: number; score: number }
    sleepDuration: { level: number; score: number }
    depression: { level: number; score: number }
    stress: { level: number; score: number }
    alcoholIntake: { level: number; score: number }
    smokingVaping: { level: number; score: number }
    obesity: { status: string; score: number }
    highCholesterol: { status: string; score: number }
    highBloodPressure: { status: string; score: number }
    diabetes: { status: string; score: number }
    loneliness: { level: number; score: number }
  }
  recentMetrics: {
    sleep?: { duration: number; efficiency: number; timestamp: Date }
    hrv?: { value: number; timestamp: Date }
    restingHR?: { value: number; timestamp: Date }
    steps?: { value: number; timestamp: Date }
    mood?: { value: number; timestamp: Date }
    energy?: { value: number; timestamp: Date }
  }
  activeGoals: Array<{
    category: string
    title: string
    target: number
    unit: string
    adherence: number
  }>
  recentHabits: Array<{
    title: string
    adherence: number
    streak: number
    level: string
  }>
  lastCheckin?: {
    mood: number
    energy: number
    soreness: number
    date: Date
  }
  completedActions?: Array<{
    action: string
    type: string
    completedAt: string
    messageId: string
  }>
  // Enhanced context for specific timing
  currentTime: {
    hour: number
    dayOfWeek: number
    isWeekend: boolean
    season: string
    timezone: string
  }
  schedule: {
    workHours?: { start: number; end: number }
    typicalWakeTime?: number
    typicalBedtime?: number
    mealTimes?: { breakfast: number; lunch: number; dinner: number }
  }
  location: {
    timezone: string
    weather?: { temperature: number; condition: string }
    isIndoors: boolean
  }
  recentActivity: {
    lastWorkout?: { type: string; duration: number; intensity: string; timestamp: Date }
    lastMeal?: { type: string; timestamp: Date }
    lastSocialInteraction?: { type: string; timestamp: Date }
  }
  preferences: {
    units: 'metric' | 'imperial'
    timeFormat: '12h' | '24h'
    dietaryRestrictions?: string[]
    fitnessLevel?: 'beginner' | 'intermediate' | 'advanced'
    equipment?: string[]
    favoriteActivities?: string[]
    dislikedActivities?: string[]
  }
}

// Fetch real user data from database
async function getRealUserData(userId: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase credentials not configured, using default values')
      return getDefaultUserData()
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Fetch user profile
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    // Fetch health metrics from check-ins and metrics
    let latestCheckIn = null
    try {
      const { data } = await supabaseAdmin
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      latestCheckIn = data
    } catch (error) {
      console.warn('Error fetching latest check-in:', error)
      // Continue with null if check-in fetch fails
    }
    
    // Return structured data or defaults
    return {
      profile: profile || {
        age: null,
        gender: null,
        race: null,
        cdcAge: null,
        ageDiff: null,
        totalRisk: null
      },
      healthMetrics: {
        // Use check-in data or defaults
        strengthTraining: { level: 1, score: 0 },
        cardioExercise: { level: 2, score: -0.075 },
        physicalActivity: { level: 2, score: -0.062 },
        flexibility: { level: 5, score: -0.223 },
        sittingTime: { level: 3, score: 0.068 },
        fruitsVegetables: { level: 1, score: 0 },
        prepackagedFoods: { level: 1, score: 0 },
        eatingOut: { level: 1, score: 0 },
        sweetenedDrinks: { level: 4, score: 0.131 },
        sleepRegularity: { level: 4, score: -0.078 },
        sleepQuality: latestCheckIn?.sleep_quality ? { level: latestCheckIn.sleep_quality, score: 0 } : { level: 3, score: 0.174 },
        sleepDuration: { level: 4, score: 0 },
        depression: latestCheckIn?.mood ? { level: Math.round(latestCheckIn.mood), score: 0.27 } : { level: 3, score: 0.27 },
        stress: latestCheckIn?.stress ? { level: Math.round(latestCheckIn.stress), score: 0.227 } : { level: 3, score: 0.227 },
        alcoholIntake: { level: 1, score: -0.105 },
        smokingVaping: { level: 4, score: 0.754 },
        obesity: { status: 'no', score: 0 },
        highCholesterol: { status: 'no', score: 0 },
        highBloodPressure: { status: 'no', score: 0 },
        diabetes: { status: 'no', score: 0 },
        loneliness: { level: 1, score: -0.357 }
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
    return getDefaultUserData()
  }
}

// Default user data fallback
function getDefaultUserData() {
  return {
    profile: {
      age: null,
      gender: null,
      race: null,
      cdcAge: null,
      ageDiff: null,
      totalRisk: null
    },
    healthMetrics: {
      strengthTraining: { level: 1, score: 0 },
      cardioExercise: { level: 2, score: -0.075 },
      physicalActivity: { level: 2, score: -0.062 },
      flexibility: { level: 5, score: -0.223 },
      sittingTime: { level: 3, score: 0.068 },
      fruitsVegetables: { level: 1, score: 0 },
      prepackagedFoods: { level: 1, score: 0 },
      eatingOut: { level: 1, score: 0 },
      sweetenedDrinks: { level: 4, score: 0.131 },
      sleepRegularity: { level: 4, score: -0.078 },
      sleepQuality: { level: 3, score: 0.174 },
      sleepDuration: { level: 4, score: 0 },
      depression: { level: 3, score: 0.27 },
      stress: { level: 3, score: 0.227 },
      alcoholIntake: { level: 1, score: -0.105 },
      smokingVaping: { level: 4, score: 0.754 },
      obesity: { status: 'no', score: 0 },
      highCholesterol: { status: 'no', score: 0 },
      highBloodPressure: { status: 'no', score: 0 },
      diabetes: { status: 'no', score: 0 },
      loneliness: { level: 1, score: -0.357 }
    }
  }
}

export async function buildUserContext(userId: string): Promise<UserContext> {
  try {
    const now = new Date()
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const month = now.getMonth()
    const season = month >= 2 && month <= 4 ? 'spring' : 
                   month >= 5 && month <= 7 ? 'summer' : 
                   month >= 8 && month <= 10 ? 'fall' : 'winter'
    
    // Get real user data from database
    const realUserData = await getRealUserData(userId)
    
    // Get onboarding data from localStorage
    const onboardingData = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('onboardingData') || '{}')
      : {}
    
    // Enhanced context with specific timing and contextual information
    return {
      userId,
      ...realUserData,
      onboarding: onboardingData,
      recentMetrics: {},
      activeGoals: [],
      recentHabits: [],
      lastCheckin: undefined,
      completedActions: [],
      currentTime: {
        hour,
        dayOfWeek,
        isWeekend,
        season,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      schedule: {
        workHours: { start: 9, end: 17 }, // Default work hours
        typicalWakeTime: 7,
        typicalBedtime: 22,
        mealTimes: { breakfast: 8, lunch: 12, dinner: 18 }
      },
      location: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        weather: { temperature: 22, condition: 'sunny' }, // Default weather
        isIndoors: hour >= 9 && hour <= 17 // Assume indoors during work hours
      },
      recentActivity: {
        lastWorkout: undefined,
        lastMeal: undefined,
        lastSocialInteraction: undefined
      },
      preferences: {
        units: 'metric',
        timeFormat: '24h',
        dietaryRestrictions: [],
        fitnessLevel: 'intermediate',
        equipment: ['bodyweight'],
        favoriteActivities: [],
        dislikedActivities: []
      }
    }
  } catch (error) {
    console.error('Error building user context:', error)
    const now = new Date()
    return {
      userId,
      recentMetrics: {},
      activeGoals: [],
      recentHabits: [],
      lastCheckin: undefined,
      completedActions: [],
      currentTime: {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        season: 'summer',
        timezone: 'UTC'
      },
      schedule: {
        workHours: { start: 9, end: 17 },
        typicalWakeTime: 7,
        typicalBedtime: 22,
        mealTimes: { breakfast: 8, lunch: 12, dinner: 18 }
      },
      location: {
        timezone: 'UTC',
        weather: { temperature: 22, condition: 'sunny' },
        isIndoors: true
      },
      recentActivity: {
        lastWorkout: undefined,
        lastMeal: undefined,
        lastSocialInteraction: undefined
      },
      preferences: {
        units: 'metric',
        timeFormat: '24h',
        dietaryRestrictions: [],
        fitnessLevel: 'intermediate',
        equipment: ['bodyweight'],
        favoriteActivities: [],
        dislikedActivities: []
      }
    }
  }
}

export function formatContextForAI(context: UserContext, mode: string): string {
  const { profile, onboarding, healthMetrics, recentMetrics, activeGoals, recentHabits, lastCheckin, preferences, completedActions, currentTime, schedule, location, recentActivity } = context
  
  let contextString = `User Context (Mode: ${mode.toUpperCase()}):\n\n`
  
  // Real user profile data
  if (profile) {
    contextString += `User Profile:\n`
    contextString += `- Age: ${profile.age} years old (${profile.gender}, ${profile.race})\n`
    contextString += `- CDC Age: ${profile.cdcAge} years\n`
    if (profile.ageDiff !== null && profile.ageDiff !== undefined) {
      contextString += `- Age Difference: ${profile.ageDiff.toFixed(2)} years\n`
    }
    if (profile.totalRisk !== null && profile.totalRisk !== undefined) {
      contextString += `- Total Risk Score: ${profile.totalRisk.toFixed(3)}\n`
    }
    contextString += `\n`
  }
  
  // Onboarding data
  if (onboarding && Object.keys(onboarding).length > 0) {
    contextString += `User Goals & Preferences:\n`
    if (onboarding.mainGoal) contextString += `- Main Goal: ${onboarding.mainGoal}\n`
    if (onboarding.goalImportance) contextString += `- Goal Importance: ${onboarding.goalImportance}\n`
    if (onboarding.confidence) contextString += `- Confidence Level: ${onboarding.confidence}/5\n`
    if (onboarding.coachingStyle) contextString += `- Preferred Coaching Style: ${onboarding.coachingStyle}\n`
    if (onboarding.motivationType) contextString += `- Motivation Type: ${onboarding.motivationType}\n`
    if (onboarding.wakeUpTime) contextString += `- Wake Up Time: ${onboarding.wakeUpTime}\n`
    if (onboarding.bedTime) contextString += `- Bed Time: ${onboarding.bedTime}\n`
    if (onboarding.busyDays && onboarding.busyDays.length > 0) contextString += `- Busy Days: ${onboarding.busyDays.join(', ')}\n`
    if (onboarding.exerciseLocation) contextString += `- Exercise Location: ${onboarding.exerciseLocation}\n`
    if (onboarding.equipment && onboarding.equipment.length > 0) contextString += `- Available Equipment: ${onboarding.equipment.join(', ')}\n`
    if (onboarding.checkInFrequency) contextString += `- Check-in Frequency: ${onboarding.checkInFrequency}\n`
    if (onboarding.preferredTime) contextString += `- Preferred Time: ${onboarding.preferredTime}\n`
    if (onboarding.tone) contextString += `- Preferred Tone: ${onboarding.tone}\n`
    if (onboarding.daysPerWeek) contextString += `- Days Per Week Commitment: ${onboarding.daysPerWeek}\n`
    if (onboarding.motivationStatement) contextString += `- Motivation Statement: "${onboarding.motivationStatement}"\n`
    contextString += `\n`
  }
  
  // Health metrics and risk factors
  if (healthMetrics) {
    contextString += `Health Metrics & Risk Factors:\n`
    
    // Exercise and physical activity
    contextString += `Exercise & Physical Activity:\n`
    contextString += `- Strength Training: Level ${healthMetrics.strengthTraining.level} (Score: ${healthMetrics.strengthTraining.score})\n`
    contextString += `- Cardio Exercise: Level ${healthMetrics.cardioExercise.level} (Score: ${healthMetrics.cardioExercise.score})\n`
    contextString += `- Physical Activity: Level ${healthMetrics.physicalActivity.level} (Score: ${healthMetrics.physicalActivity.score})\n`
    contextString += `- Flexibility: Level ${healthMetrics.flexibility.level} (Score: ${healthMetrics.flexibility.score})\n`
    contextString += `- Sitting Time: Level ${healthMetrics.sittingTime.level} (Score: ${healthMetrics.sittingTime.score})\n`
    contextString += `\n`
    
    // Diet and nutrition
    contextString += `Diet & Nutrition:\n`
    contextString += `- Fruits & Vegetables: Level ${healthMetrics.fruitsVegetables.level} (Score: ${healthMetrics.fruitsVegetables.score})\n`
    contextString += `- Pre-packaged Foods: Level ${healthMetrics.prepackagedFoods.level} (Score: ${healthMetrics.prepackagedFoods.score})\n`
    contextString += `- Eating Out: Level ${healthMetrics.eatingOut.level} (Score: ${healthMetrics.eatingOut.score})\n`
    contextString += `- Sweetened Drinks: Level ${healthMetrics.sweetenedDrinks.level} (Score: ${healthMetrics.sweetenedDrinks.score})\n`
    contextString += `\n`
    
    // Sleep quality
    contextString += `Sleep Quality:\n`
    contextString += `- Sleep Regularity: Level ${healthMetrics.sleepRegularity.level} (Score: ${healthMetrics.sleepRegularity.score})\n`
    contextString += `- Sleep Quality: Level ${healthMetrics.sleepQuality.level} (Score: ${healthMetrics.sleepQuality.score})\n`
    contextString += `- Sleep Duration: Level ${healthMetrics.sleepDuration.level} (Score: ${healthMetrics.sleepDuration.score})\n`
    contextString += `\n`
    
    // Mental health
    contextString += `Mental Health:\n`
    contextString += `- Depression: Level ${healthMetrics.depression.level} (Score: ${healthMetrics.depression.score})\n`
    contextString += `- Stress: Level ${healthMetrics.stress.level} (Score: ${healthMetrics.stress.score})\n`
    contextString += `- Loneliness: Level ${healthMetrics.loneliness.level} (Score: ${healthMetrics.loneliness.score})\n`
    contextString += `\n`
    
    // Lifestyle factors
    contextString += `Lifestyle Factors:\n`
    contextString += `- Alcohol Intake: Level ${healthMetrics.alcoholIntake.level} (Score: ${healthMetrics.alcoholIntake.score})\n`
    contextString += `- Smoking/Vaping: Level ${healthMetrics.smokingVaping.level} (Score: ${healthMetrics.smokingVaping.score})\n`
    contextString += `\n`
    
    // Health conditions
    contextString += `Health Conditions:\n`
    contextString += `- Obesity: ${healthMetrics.obesity.status} (Score: ${healthMetrics.obesity.score})\n`
    contextString += `- High Cholesterol: ${healthMetrics.highCholesterol.status} (Score: ${healthMetrics.highCholesterol.score})\n`
    contextString += `- High Blood Pressure: ${healthMetrics.highBloodPressure.status} (Score: ${healthMetrics.highBloodPressure.score})\n`
    contextString += `- Diabetes: ${healthMetrics.diabetes.status} (Score: ${healthMetrics.diabetes.score})\n`
    contextString += `\n`
  }
  
  // Enhanced timing and contextual information
  contextString += `Current Time & Context:\n`
  contextString += `- Current time: ${currentTime.hour}:00 (${currentTime.isWeekend ? 'Weekend' : 'Weekday'})\n`
  contextString += `- Season: ${currentTime.season}\n`
  contextString += `- Timezone: ${currentTime.timezone}\n`
  contextString += `- Location: ${location.isIndoors ? 'Indoors' : 'Outdoors'}\n`
  if (location.weather) {
    contextString += `- Weather: ${location.weather.temperature}°C, ${location.weather.condition}\n`
  }
  contextString += `\n`
  
  // Schedule information
  contextString += `Typical Schedule:\n`
  if (schedule.workHours) {
    contextString += `- Work hours: ${schedule.workHours.start}:00 - ${schedule.workHours.end}:00\n`
  }
  if (schedule.typicalWakeTime) {
    contextString += `- Wake time: ${schedule.typicalWakeTime}:00\n`
  }
  if (schedule.typicalBedtime) {
    contextString += `- Bedtime: ${schedule.typicalBedtime}:00\n`
  }
  if (schedule.mealTimes) {
    contextString += `- Meal times: Breakfast ${schedule.mealTimes.breakfast}:00, Lunch ${schedule.mealTimes.lunch}:00, Dinner ${schedule.mealTimes.dinner}:00\n`
  }
  contextString += `\n`
  
  // Recent activity
  if (recentActivity.lastWorkout) {
    const workout = recentActivity.lastWorkout
    const hoursAgo = Math.floor((Date.now() - workout.timestamp.getTime()) / (1000 * 60 * 60))
    contextString += `Recent Activity:\n`
    contextString += `- Last workout: ${workout.type} (${workout.duration} min, ${workout.intensity}) - ${hoursAgo} hours ago\n`
  }
  if (recentActivity.lastMeal) {
    const meal = recentActivity.lastMeal
    const hoursAgo = Math.floor((Date.now() - meal.timestamp.getTime()) / (1000 * 60 * 60))
    contextString += `- Last meal: ${meal.type} - ${hoursAgo} hours ago\n`
  }
  if (recentActivity.lastSocialInteraction) {
    const social = recentActivity.lastSocialInteraction
    const hoursAgo = Math.floor((Date.now() - social.timestamp.getTime()) / (1000 * 60 * 60))
    contextString += `- Last social interaction: ${social.type} - ${hoursAgo} hours ago\n`
  }
  if (recentActivity.lastWorkout || recentActivity.lastMeal || recentActivity.lastSocialInteraction) {
    contextString += `\n`
  }
  
  // User preferences
  contextString += `User Preferences:\n`
  contextString += `- Fitness level: ${preferences.fitnessLevel || 'intermediate'}\n`
  if (preferences.equipment && preferences.equipment.length > 0) {
    contextString += `- Available equipment: ${preferences.equipment.join(', ')}\n`
  }
  if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
    contextString += `- Dietary restrictions: ${preferences.dietaryRestrictions.join(', ')}\n`
  }
  if (preferences.favoriteActivities && preferences.favoriteActivities.length > 0) {
    contextString += `- Favorite activities: ${preferences.favoriteActivities.join(', ')}\n`
  }
  if (preferences.dislikedActivities && preferences.dislikedActivities.length > 0) {
    contextString += `- Disliked activities: ${preferences.dislikedActivities.join(', ')}\n`
  }
  contextString += `\n`

  // Recent metrics
  if (Object.keys(recentMetrics).length > 0) {
    contextString += "Recent Health Metrics:\n"
    
    if (recentMetrics.sleep) {
      contextString += `- Sleep: ${recentMetrics.sleep.duration}h (${recentMetrics.sleep.efficiency}% efficiency)\n`
    }
    
    if (recentMetrics.hrv) {
      contextString += `- HRV: ${recentMetrics.hrv.value}ms\n`
    }
    
    if (recentMetrics.restingHR) {
      contextString += `- Resting HR: ${recentMetrics.restingHR.value} bpm\n`
    }
    
    if (recentMetrics.steps) {
      contextString += `- Steps: ${recentMetrics.steps.value.toLocaleString()}\n`
    }
    
    if (recentMetrics.mood) {
      contextString += `- Mood: ${recentMetrics.mood.value}/5\n`
    }
    
    if (recentMetrics.energy) {
      contextString += `- Energy: ${recentMetrics.energy.value}/5\n`
    }
    
    contextString += "\n"
  }

  // Active goals
  if (activeGoals && activeGoals.length > 0) {
    contextString += "Active Goals:\n"
    activeGoals.forEach(goal => {
      const adherence = goal.adherence ?? 0
      contextString += `- ${goal.title} (${goal.category}): ${adherence.toFixed(1)}% adherence\n`
    })
    contextString += "\n"
  }

  // Recent habits
  if (recentHabits && recentHabits.length > 0) {
    contextString += "Current Habits:\n"
    recentHabits.slice(0, 5).forEach(habit => {
      const adherence = habit.adherence ?? 0
      const streak = habit.streak ?? 0
      contextString += `- ${habit.title} (${habit.level}): ${adherence.toFixed(1)}% adherence, ${streak} day streak\n`
    })
    contextString += "\n"
  }

  // Completed actions
  if (completedActions && completedActions.length > 0) {
    contextString += "Recently Completed Actions:\n"
    completedActions.slice(-5).forEach(action => {
      const date = new Date(action.completedAt).toLocaleDateString()
      contextString += `- ${action.action} (${action.type}) - completed on ${date}\n`
    })
    contextString += "\n"
  }

  // Last check-in
  if (lastCheckin) {
    const daysAgo = Math.floor((Date.now() - lastCheckin.date.getTime()) / (1000 * 60 * 60 * 24))
    contextString += `Last Check-in (${daysAgo} days ago):\n`
    contextString += `- Mood: ${lastCheckin.mood}/5\n`
    contextString += `- Energy: ${lastCheckin.energy}/5\n`
    contextString += `- Soreness: ${lastCheckin.soreness}/5\n\n`
  }

  // Preferences
  contextString += `Preferences:\n`
  contextString += `- Units: ${preferences.units}\n`
  contextString += `- Time format: ${preferences.timeFormat}\n\n`

  return contextString
}

export async function getRecentConversation(userId: string, limit: number = 10): Promise<CoachMessage[]> {
  try {
    // Use admin client for server-side calls
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase not configured for conversation history')
      return []
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: messages, error } = await supabaseAdmin
      .from('coach_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching conversation history:', error)
      return []
    }

    if (!messages) return []
    
    return messages.reverse().map(msg => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      timestamp: new Date(msg.timestamp || new Date()),
      mode: msg.mode || undefined,
      actions: [],
      citations: msg.citations || [],
      isSafetyCard: msg.is_safety_card || false,
      contextData: msg.context_data
    }))
  } catch (error) {
    console.error('Error fetching conversation history:', error)
    return []
  }
}