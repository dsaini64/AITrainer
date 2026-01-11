export interface UserPreference {
  category: 'food' | 'exercise' | 'timing' | 'location' | 'schedule'
  key: string
  value: any
  confidence: number // 0-1, how confident we are in this preference
  lastUpdated: Date
  source: 'explicit' | 'inferred' | 'pattern' // how we learned this
}

export interface CompletedAction {
  id: string
  action: string
  type: 'checklist' | 'timer' | 'reminder' | 'schedule'
  completedAt: Date
  success: boolean // did they actually do it?
  feedback?: string // any feedback they gave
  context: {
    timeOfDay: string
    dayOfWeek: string
    location?: string
    mood?: string
  }
}

export interface UserPattern {
  preferredTimes: {
    breakfast: string[]
    lunch: string[]
    dinner: string[]
    exercise: string[]
    sleep: string[]
  }
  foodPreferences: {
    likes: string[]
    dislikes: string[]
    allergies: string[]
    dietaryRestrictions: string[]
  }
  exercisePreferences: {
    types: string[]
    duration: string
    intensity: string
    timeOfDay: string
  }
  workSchedule: {
    workDays: string[]
    workHours: string
    lunchBreak: string
    commuteTime: string
  }
  successPatterns: {
    whatWorks: string[]
    whatDoesntWork: string[]
    optimalTiming: string[]
  }
}

export class PersonalMemory {
  private preferences: UserPreference[] = []
  private completedActions: CompletedAction[] = []
  public patterns: UserPattern

  constructor(userId: string) {
    this.patterns = this.initializePatterns()
    this.loadFromStorage(userId)
  }

  private initializePatterns(): UserPattern {
    return {
      preferredTimes: {
        breakfast: [],
        lunch: [],
        dinner: [],
        exercise: [],
        sleep: []
      },
      foodPreferences: {
        likes: [],
        dislikes: [],
        allergies: [],
        dietaryRestrictions: []
      },
      exercisePreferences: {
        types: [],
        duration: '',
        intensity: '',
        timeOfDay: ''
      },
      workSchedule: {
        workDays: [],
        workHours: '',
        lunchBreak: '',
        commuteTime: ''
      },
      successPatterns: {
        whatWorks: [],
        whatDoesntWork: [],
        optimalTiming: []
      }
    }
  }

  // Learn from user actions and feedback
  learnFromAction(action: CompletedAction, feedback?: string) {
    this.completedActions.push(action)
    
    // Update patterns based on what works
    if (action.success) {
      this.patterns.successPatterns.whatWorks.push(action.action)
      this.patterns.successPatterns.optimalTiming.push(action.context.timeOfDay)
    } else {
      this.patterns.successPatterns.whatDoesntWork.push(action.action)
    }

    // Learn from feedback
    if (feedback) {
      this.parseFeedback(feedback)
    }

    this.saveToStorage()
  }

  // Learn from explicit user statements
  learnFromStatement(statement: string, context: any) {
    const preferences = this.extractPreferences(statement, context)
    preferences.forEach(pref => {
      const existing = this.preferences.find(p => p.key === pref.key)
      if (existing) {
        existing.value = pref.value
        existing.confidence = Math.min(1, existing.confidence + 0.1)
        existing.lastUpdated = new Date()
      } else {
        this.preferences.push(pref)
      }
    })
    this.saveToStorage()
  }

  // Get personalized suggestions based on memory
  getPersonalizedSuggestions(timeOfDay: string, goal: string): string[] {
    const suggestions: string[] = []
    
    // Get food preferences
    const foodLikes = this.patterns.foodPreferences.likes
    const foodDislikes = this.patterns.foodPreferences.dislikes
    
    // Get work schedule
    const isWorkDay = this.isWorkDay()
    const workHours = this.patterns.workSchedule.workHours
    
    // Get success patterns
    const whatWorks = this.patterns.successPatterns.whatWorks
    const optimalTiming = this.patterns.successPatterns.optimalTiming
    
    // Generate suggestions based on memory
    if (timeOfDay === 'lunch' && goal === 'nutrition') {
      if (isWorkDay) {
        // Suggest based on work schedule and preferences
        if (this.patterns.workSchedule.lunchBreak) {
          suggestions.push(`Since you have ${this.patterns.workSchedule.lunchBreak} for lunch, try a quick but nutritious option`)
        }
        
        // Avoid disliked foods
        if (foodDislikes.includes('quinoa')) {
          suggestions.push('How about a turkey and avocado wrap instead?')
        } else {
          suggestions.push('Try a quinoa bowl with your favorite vegetables')
        }
        
        // Suggest what has worked before
        if (whatWorks.includes('protein smoothie')) {
          suggestions.push('Your protein smoothie worked well last time - want to try that again?')
        }
      } else {
        // Weekend suggestions
        suggestions.push('Perfect time to prepare a nutritious meal at home')
        if (foodLikes.includes('salmon')) {
          suggestions.push('How about that salmon salad you enjoyed last weekend?')
        }
      }
    }
    
    return suggestions
  }

  // Get personalized message based on user history
  getPersonalizedMessage(baseMessage: string, context: any): string {
    let personalizedMessage = baseMessage
    
    // Add personal touches based on memory
    const userName = this.getUserPreference('name')
    if (userName) {
      personalizedMessage = personalizedMessage.replace('you', userName)
    }
    
    // Add context about what's worked before
    const recentSuccesses = this.getRecentSuccesses(7) // last 7 days
    if (recentSuccesses.length > 0) {
      personalizedMessage += ` I noticed you've been doing great with ${recentSuccesses[0]} lately - keep it up!`
    }
    
    // Add reminders about preferences
    const foodDislikes = this.patterns.foodPreferences.dislikes
    if (foodDislikes.length > 0) {
      personalizedMessage += ` I'll make sure to avoid ${foodDislikes.join(', ')} in my suggestions.`
    }
    
    return personalizedMessage
  }

  // Get user preference by key
  getUserPreference(key: string): any {
    const pref = this.preferences.find(p => p.key === key)
    return pref ? pref.value : null
  }

  // Get recent successful actions
  getRecentSuccesses(days: number): string[] {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    
    return this.completedActions
      .filter(action => action.success && action.completedAt >= cutoff)
      .map(action => action.action)
  }

  // Check if it's a work day
  private isWorkDay(): boolean {
    const today = new Date().getDay()
    const workDays = this.patterns.workSchedule.workDays
    return workDays.includes(today.toString())
  }

  // Extract preferences from user statements
  private extractPreferences(statement: string, context: any): UserPreference[] {
    const preferences: UserPreference[] = []
    const now = new Date()
    
    // Food preferences
    if (statement.toLowerCase().includes('don\'t like') || statement.toLowerCase().includes('hate')) {
      const food = this.extractFoodFromStatement(statement)
      if (food) {
        preferences.push({
          category: 'food',
          key: 'dislikes',
          value: food,
          confidence: 0.8,
          lastUpdated: now,
          source: 'explicit'
        })
      }
    }
    
    if (statement.toLowerCase().includes('like') || statement.toLowerCase().includes('love')) {
      const food = this.extractFoodFromStatement(statement)
      if (food) {
        preferences.push({
          category: 'food',
          key: 'likes',
          value: food,
          confidence: 0.8,
          lastUpdated: now,
          source: 'explicit'
        })
      }
    }
    
    // Work schedule
    if (statement.toLowerCase().includes('work') || statement.toLowerCase().includes('office')) {
      preferences.push({
        category: 'schedule',
        key: 'workLocation',
        value: 'office',
        confidence: 0.7,
        lastUpdated: now,
        source: 'inferred'
      })
    }
    
    // Timing preferences
    if (statement.toLowerCase().includes('morning') || statement.toLowerCase().includes('afternoon')) {
      const time = this.extractTimeFromStatement(statement)
      if (time) {
        preferences.push({
          category: 'timing',
          key: 'preferredTime',
          value: time,
          confidence: 0.6,
          lastUpdated: now,
          source: 'inferred'
        })
      }
    }
    
    return preferences
  }

  // Extract food from statement
  private extractFoodFromStatement(statement: string): string | null {
    const foodKeywords = ['quinoa', 'salmon', 'chicken', 'vegetables', 'smoothie', 'eggs', 'nuts', 'avocado']
    for (const food of foodKeywords) {
      if (statement.toLowerCase().includes(food)) {
        return food
      }
    }
    return null
  }

  // Extract time from statement
  private extractTimeFromStatement(statement: string): string | null {
    if (statement.toLowerCase().includes('morning')) return 'morning'
    if (statement.toLowerCase().includes('afternoon')) return 'afternoon'
    if (statement.toLowerCase().includes('evening')) return 'evening'
    return null
  }

  // Parse feedback for learning
  private parseFeedback(feedback: string) {
    // Learn from positive feedback
    if (feedback.toLowerCase().includes('great') || feedback.toLowerCase().includes('love')) {
      // Mark recent actions as successful
      const recentActions = this.completedActions.slice(-3)
      recentActions.forEach(action => {
        action.success = true
      })
    }
    
    // Learn from negative feedback
    if (feedback.toLowerCase().includes('don\'t like') || feedback.toLowerCase().includes('hate')) {
      // Mark recent actions as unsuccessful
      const recentActions = this.completedActions.slice(-3)
      recentActions.forEach(action => {
        action.success = false
      })
    }
  }

  // Save to localStorage
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('personalMemory', JSON.stringify({
        preferences: this.preferences,
        completedActions: this.completedActions,
        patterns: this.patterns
      }))
    }
  }

  // Load from localStorage
  private loadFromStorage(userId: string) {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('personalMemory')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          this.preferences = data.preferences || []
          this.completedActions = data.completedActions || []
          this.patterns = data.patterns || this.initializePatterns()
        } catch (error) {
          console.error('Error loading personal memory:', error)
        }
      }
    }
  }

  // Get memory summary for AI context
  getMemorySummary(): string {
    const summary = []
    
    // Recent successes
    const recentSuccesses = this.getRecentSuccesses(7)
    if (recentSuccesses.length > 0) {
      summary.push(`Recent successes: ${recentSuccesses.join(', ')}`)
    }
    
    // Food preferences
    const likes = this.patterns.foodPreferences.likes
    const dislikes = this.patterns.foodPreferences.dislikes
    if (likes.length > 0) {
      summary.push(`Likes: ${likes.join(', ')}`)
    }
    if (dislikes.length > 0) {
      summary.push(`Dislikes: ${dislikes.join(', ')}`)
    }
    
    // Work schedule
    if (this.patterns.workSchedule.workDays.length > 0) {
      summary.push(`Works: ${this.patterns.workSchedule.workDays.join(', ')}`)
    }
    
    return summary.join('. ')
  }
}
