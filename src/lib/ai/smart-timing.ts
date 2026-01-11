export interface TimingContext {
  currentTime: Date
  userTimezone: string
  lastInteraction: Date | null
  userActivityPattern: {
    mostActiveHours: number[]
    leastActiveHours: number[]
    preferredCheckinTimes: number[]
  }
  goalDeadlines: Array<{
    goal: string
    deadline: Date
    urgency: 'high' | 'medium' | 'low'
  }>
}

export interface OptimalTiming {
  shouldSend: boolean
  reason: string
  delayMinutes?: number
  alternativeTime?: Date
}

export class SmartTimingEngine {
  private context: TimingContext

  constructor(context: TimingContext) {
    this.context = context
  }

  public shouldSendProactiveMessage(): OptimalTiming {
    const now = this.context.currentTime
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Check if user is likely to be available
    if (!this.isUserLikelyAvailable()) {
      return {
        shouldSend: false,
        reason: 'User likely not available',
        alternativeTime: this.getNextOptimalTime()
      }
    }

    // Check if it's been too soon since last interaction
    if (this.isTooSoonSinceLastInteraction()) {
      return {
        shouldSend: false,
        reason: 'Too soon since last interaction',
        delayMinutes: this.getOptimalDelay()
      }
    }

    // Check if it's an optimal time for the user's goals
    if (!this.isOptimalForUserGoals()) {
      return {
        shouldSend: false,
        reason: 'Not optimal for current goals',
        alternativeTime: this.getNextOptimalTime()
      }
    }

    // Check if there are urgent goal deadlines
    if (this.hasUrgentDeadlines()) {
      return {
        shouldSend: true,
        reason: 'Urgent goal deadline approaching'
      }
    }

    // Check if it's a good time for the type of message
    if (this.isGoodTimeForMessageType()) {
      return {
        shouldSend: true,
        reason: 'Optimal timing for this message type'
      }
    }

    return {
      shouldSend: false,
      reason: 'Not an optimal time',
      alternativeTime: this.getNextOptimalTime()
    }
  }

  private isUserLikelyAvailable(): boolean {
    const hour = this.context.currentTime.getHours()
    const dayOfWeek = this.context.currentTime.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Weekday availability (9 AM - 9 PM)
    if (!isWeekend) {
      return hour >= 9 && hour <= 21
    }

    // Weekend availability (8 AM - 10 PM)
    return hour >= 8 && hour <= 22
  }

  private isTooSoonSinceLastInteraction(): boolean {
    if (!this.context.lastInteraction) return false

    const timeSinceLastInteraction = Date.now() - this.context.lastInteraction.getTime()
    const minutesSinceLastInteraction = timeSinceLastInteraction / (1000 * 60)

    // Don't send if it's been less than 30 minutes
    return minutesSinceLastInteraction < 30
  }

  private isOptimalForUserGoals(): boolean {
    const hour = this.context.currentTime.getHours()
    const dayOfWeek = this.context.currentTime.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Morning goals (6-10 AM)
    if (hour >= 6 && hour <= 10) {
      return true // Good time for nutrition, exercise, planning
    }

    // Afternoon goals (12-2 PM)
    if (hour >= 12 && hour <= 14) {
      return true // Good time for nutrition, energy management
    }

    // Evening goals (5-8 PM)
    if (hour >= 17 && hour <= 20) {
      return true // Good time for exercise, stress management, planning
    }

    // Night goals (8-10 PM)
    if (hour >= 20 && hour <= 22) {
      return true // Good time for sleep preparation, reflection
    }

    return false
  }

  private hasUrgentDeadlines(): boolean {
    const now = this.context.currentTime
    const urgentDeadlines = this.context.goalDeadlines.filter(
      deadline => deadline.urgency === 'high' && 
      deadline.deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000 // Less than 24 hours
    )

    return urgentDeadlines.length > 0
  }

  private isGoodTimeForMessageType(): boolean {
    const hour = this.context.currentTime.getHours()
    const dayOfWeek = this.context.currentTime.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Morning messages (6-10 AM)
    if (hour >= 6 && hour <= 10) {
      return true // Good for motivation, planning, nutrition
    }

    // Lunch messages (12-2 PM)
    if (hour >= 12 && hour <= 14) {
      return true // Good for nutrition, energy management
    }

    // Evening messages (5-8 PM)
    if (hour >= 17 && hour <= 20) {
      return true // Good for exercise, stress management, reflection
    }

    // Night messages (8-10 PM)
    if (hour >= 20 && hour <= 22) {
      return true // Good for sleep preparation, reflection
    }

    return false
  }

  private getNextOptimalTime(): Date {
    const now = this.context.currentTime
    const hour = now.getHours()
    const dayOfWeek = now.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Find next optimal time
    let nextOptimalHour: number

    if (hour < 6) {
      nextOptimalHour = 6 // Morning
    } else if (hour < 12) {
      nextOptimalHour = 12 // Lunch
    } else if (hour < 17) {
      nextOptimalHour = 17 // Evening
    } else if (hour < 20) {
      nextOptimalHour = 20 // Night
    } else {
      // Next day morning
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(6, 0, 0, 0)
      return tomorrow
    }

    const nextTime = new Date(now)
    nextTime.setHours(nextOptimalHour, 0, 0, 0)
    return nextTime
  }

  private getOptimalDelay(): number {
    const now = this.context.currentTime
    const hour = now.getHours()

    // Calculate delay based on current time
    if (hour < 6) {
      return 60 // Wait 1 hour if it's very early
    } else if (hour < 12) {
      return 30 // Wait 30 minutes if it's morning
    } else if (hour < 17) {
      return 45 // Wait 45 minutes if it's afternoon
    } else if (hour < 20) {
      return 30 // Wait 30 minutes if it's evening
    } else {
      return 60 // Wait 1 hour if it's night
    }
  }

  public getOptimalMessageFrequency(): {
    maxPerDay: number
    maxPerWeek: number
    minIntervalHours: number
  } {
    const dayOfWeek = this.context.currentTime.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    return {
      maxPerDay: isWeekend ? 3 : 4, // More messages on weekdays
      maxPerWeek: 20,
      minIntervalHours: 2 // Minimum 2 hours between messages
    }
  }

  public shouldSendBasedOnUserEngagement(): boolean {
    if (!this.context.lastInteraction) return true // First interaction

    const timeSinceLastInteraction = Date.now() - this.context.lastInteraction.getTime()
    const hoursSinceLastInteraction = timeSinceLastInteraction / (1000 * 60 * 60)

    // If user hasn't interacted in 24 hours, send a check-in
    if (hoursSinceLastInteraction > 24) {
      return true
    }

    // If user has been active recently, be more selective
    if (hoursSinceLastInteraction < 4) {
      return false
    }

    return true
  }
}








