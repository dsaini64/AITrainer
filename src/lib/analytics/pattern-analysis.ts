import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface UserPattern {
  userId: string
  patterns: {
    sleepPattern?: {
      averageBedtime: string
      averageWakeTime: string
      averageDuration: number
      consistency: number
    }
    energyPattern?: {
      peakHours: string[]
      lowHours: string[]
      averageEnergy: number
    }
    moodPattern?: {
      averageMood: number
      moodTrend: 'improving' | 'declining' | 'stable'
      triggers: string[]
    }
    habitPattern?: {
      mostConsistent: string[]
      leastConsistent: string[]
      streakPatterns: Record<string, number>
    }
    goalProgress?: {
      onTrack: string[]
      struggling: string[]
      completed: string[]
    }
  }
  insights: string[]
  recommendations: string[]
}

export async function analyzeUserPatterns(userId: string): Promise<UserPattern | null> {
  try {
    // Get user data from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Get metrics data
    const { data: metrics } = await supabase
      .from('metrics')
      .select('type, value, timestamp')
      .eq('user_id', userId)
      .gte('timestamp', thirtyDaysAgo)
      .order('timestamp', { ascending: true })

    // Get check-ins data
    const { data: checkIns } = await supabase
      .from('check_ins')
      .select('mood, energy, soreness, date, notes')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo.split('T')[0])
      .order('date', { ascending: true })

    // Get goals and habits
    const { data: goals } = await supabase
      .from('goals')
      .select(`
        id, title, category, target, unit, is_active,
        habits (id, title, adherence, streak, level)
      `)
      .eq('user_id', userId)

    // Analyze patterns
    const patterns = await analyzePatterns(metrics || [], checkIns || [], goals || [])
    const insights = generateInsights(patterns, goals || [])
    const recommendations = generateRecommendations(patterns, insights)

    return {
      userId,
      patterns,
      insights,
      recommendations
    }
  } catch (error) {
    console.error('Error analyzing user patterns:', error)
    return null
  }
}

async function analyzePatterns(metrics: any[], checkIns: any[], goals: any[]) {
  const patterns: any = {}

  // Analyze sleep patterns
  const sleepMetrics = metrics.filter(m => m.type === 'sleep_duration')
  if (sleepMetrics.length > 0) {
    patterns.sleepPattern = analyzeSleepPattern(sleepMetrics)
  }

  // Analyze energy patterns
  const energyCheckIns = checkIns.filter(c => c.energy !== null)
  if (energyCheckIns.length > 0) {
    patterns.energyPattern = analyzeEnergyPattern(energyCheckIns)
  }

  // Analyze mood patterns
  const moodCheckIns = checkIns.filter(c => c.mood !== null)
  if (moodCheckIns.length > 0) {
    patterns.moodPattern = analyzeMoodPattern(moodCheckIns)
  }

  // Analyze habit patterns
  const activeGoals = goals.filter(g => g.is_active)
  if (activeGoals.length > 0) {
    patterns.habitPattern = analyzeHabitPattern(activeGoals)
  }

  // Analyze goal progress
  if (activeGoals.length > 0) {
    patterns.goalProgress = analyzeGoalProgress(activeGoals)
  }

  return patterns
}

function analyzeSleepPattern(sleepMetrics: any[]) {
  const durations = sleepMetrics.map(m => m.value)
  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length
  
  // Calculate consistency (standard deviation)
  const variance = durations.reduce((acc, val) => acc + Math.pow(val - averageDuration, 2), 0) / durations.length
  const consistency = Math.max(0, 100 - Math.sqrt(variance) * 10) // Higher is more consistent

  return {
    averageDuration,
    consistency: Math.round(consistency),
    averageBedtime: '22:30', // Would calculate from actual data
    averageWakeTime: '07:00'   // Would calculate from actual data
  }
}

function analyzeEnergyPattern(energyCheckIns: any[]) {
  const energies = energyCheckIns.map(c => ({ value: c.energy, hour: new Date(c.date).getHours() }))
  const averageEnergy = energies.reduce((acc, e) => acc + e.value, 0) / energies.length

  // Group by hour to find patterns
  const hourlyEnergy: Record<number, number[]> = {}
  energies.forEach(e => {
    if (!hourlyEnergy[e.hour]) hourlyEnergy[e.hour] = []
    hourlyEnergy[e.hour].push(e.value)
  })

  const peakHours = Object.entries(hourlyEnergy)
    .map(([hour, values]) => ({
      hour: parseInt(hour),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)
    .map(h => `${h.hour}:00`)

  const lowHours = Object.entries(hourlyEnergy)
    .map(([hour, values]) => ({
      hour: parseInt(hour),
      avg: values.reduce((a, b) => a + b, 0) / values.length
    }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 3)
    .map(h => `${h.hour}:00`)

  return {
    averageEnergy: Math.round(averageEnergy * 10) / 10,
    peakHours,
    lowHours
  }
}

function analyzeMoodPattern(moodCheckIns: any[]) {
  const moods = moodCheckIns.map(c => c.mood)
  const averageMood = moods.reduce((a, b) => a + b, 0) / moods.length

  // Calculate trend
  const firstHalf = moods.slice(0, Math.floor(moods.length / 2))
  const secondHalf = moods.slice(Math.floor(moods.length / 2))
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
  
  let moodTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (secondAvg > firstAvg + 0.3) moodTrend = 'improving'
  else if (secondAvg < firstAvg - 0.3) moodTrend = 'declining'

  return {
    averageMood: Math.round(averageMood * 10) / 10,
    moodTrend,
    triggers: [] // Would analyze notes for triggers
  }
}

function analyzeHabitPattern(goals: any[]) {
  const allHabits = goals.flatMap(g => g.habits || [])
  
  const habitStreaks = allHabits.map(h => ({
    title: h.title,
    streak: h.streak || 0,
    adherence: h.adherence || 0
  }))

  const mostConsistent = habitStreaks
    .sort((a, b) => b.adherence - a.adherence)
    .slice(0, 3)
    .map(h => h.title)

  const leastConsistent = habitStreaks
    .sort((a, b) => a.adherence - b.adherence)
    .slice(0, 3)
    .map(h => h.title)

  const streakPatterns = habitStreaks.reduce((acc, h) => {
    acc[h.title] = h.streak
    return acc
  }, {} as Record<string, number>)

  return {
    mostConsistent,
    leastConsistent,
    streakPatterns
  }
}

function analyzeGoalProgress(goals: any[]) {
  const onTrack: string[] = []
  const struggling: string[] = []
  const completed: string[] = []

  goals.forEach(goal => {
    const habits = goal.habits || []
    const avgAdherence = habits.reduce((acc: number, h: any) => acc + (h.adherence || 0), 0) / habits.length

    if (avgAdherence >= 80) {
      onTrack.push(goal.title)
    } else if (avgAdherence < 50) {
      struggling.push(goal.title)
    }
  })

  return { onTrack, struggling, completed }
}

function generateInsights(patterns: any, goals: any[] = []): string[] {
  const insights: string[] = []
  
  // Extract goal categories
  const goalCategories = goals.map(g => g.category)
  const hasNutritionGoals = goalCategories.includes('nutrition')
  const hasExerciseGoals = goalCategories.includes('exercise')
  const hasSocialGoals = goalCategories.includes('social')
  const hasSleepGoals = goalCategories.includes('sleep')
  const hasHabitGoals = goalCategories.includes('habits')

  if (patterns.sleepPattern) {
    if (patterns.sleepPattern.consistency < 60) {
      insights.push('Your sleep schedule could be more consistent')
      if (hasSleepGoals) {
        insights.push('Consider setting a consistent bedtime routine to improve your sleep goals')
      }
    }
    if (patterns.sleepPattern.averageDuration < 7) {
      insights.push('You might benefit from more sleep')
      if (hasSleepGoals) {
        insights.push('Aim for 7-9 hours of sleep to support your sleep targets')
      }
    }
  }

  if (patterns.energyPattern) {
    if (patterns.energyPattern.averageEnergy < 3) {
      insights.push('Your energy levels have been consistently low')
      if (hasNutritionGoals) {
        insights.push('Consider reviewing your nutrition - balanced meals can boost energy')
      }
      if (hasExerciseGoals) {
        insights.push('Light exercise might help increase your energy levels')
      }
      if (hasSleepGoals) {
        insights.push('Poor sleep quality could be affecting your energy - focus on sleep hygiene')
      }
    }
  }

  if (patterns.moodPattern) {
    if (patterns.moodPattern.moodTrend === 'declining') {
      insights.push('Your mood has been trending downward recently')
      if (hasSocialGoals) {
        insights.push('Social connections can improve mood - consider reaching out to friends')
      }
      if (hasExerciseGoals) {
        insights.push('Exercise releases endorphins that can boost your mood')
      }
    }
  }

  if (patterns.habitPattern) {
    const strugglingHabits = patterns.habitPattern.leastConsistent
    if (strugglingHabits.length > 0) {
      insights.push(`You're having trouble with: ${strugglingHabits.join(', ')}`)
      if (hasHabitGoals) {
        insights.push('Try breaking down struggling habits into smaller, manageable steps')
      }
    }
  }

  // Goal-specific insights
  if (hasNutritionGoals && patterns.energyPattern?.averageEnergy < 3) {
    insights.push('Your nutrition goals might help improve your energy levels')
  }
  
  if (hasExerciseGoals && patterns.moodPattern?.moodTrend === 'declining') {
    insights.push('Regular exercise can help improve your mood and overall wellbeing')
  }
  
  if (hasSocialGoals && patterns.moodPattern?.moodTrend === 'declining') {
    insights.push('Social connections are important for mental health - consider reaching out to friends')
  }

  return insights
}

function generateRecommendations(patterns: any, insights: string[]): string[] {
  const recommendations: string[] = []

  if (patterns.sleepPattern?.consistency < 60) {
    recommendations.push('Try setting a consistent bedtime routine')
  }

  if (patterns.energyPattern?.averageEnergy < 3) {
    recommendations.push('Consider adjusting your nutrition or exercise routine')
  }

  if (patterns.moodPattern?.moodTrend === 'declining') {
    recommendations.push('Focus on stress management and social connections')
  }

  if (patterns.goalProgress?.struggling.length > 0) {
    recommendations.push('Break down struggling goals into smaller, manageable steps')
  }

  return recommendations
}
