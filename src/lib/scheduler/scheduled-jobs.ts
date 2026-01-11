import { createClient } from '@supabase/supabase-js'
import { sendProactiveMessage, ProactiveTrigger } from '@/lib/coach/proactive-messaging'
import { getActiveUsers } from '@/lib/notifications/push-notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface ScheduledJob {
  id: string
  name: string
  trigger: ProactiveTrigger
  cronExpression: string
  isActive: boolean
  lastRun?: Date
  nextRun?: Date
}

export class ProactiveCoachScheduler {
  private jobs: Map<string, ScheduledJob> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.initializeJobs()
  }

  private initializeJobs() {
    // Morning check-in (8:00 AM)
    this.addJob({
      id: 'morning-checkin',
      name: 'Morning Check-in',
      trigger: 'morning_checkin',
      cronExpression: '0 8 * * *',
      isActive: true
    })

    // Lunch reminder (12:00 PM)
    this.addJob({
      id: 'lunch-reminder',
      name: 'Lunch Reminder',
      trigger: 'lunch_reminder',
      cronExpression: '0 12 * * *',
      isActive: true
    })

    // Evening reflection (8:00 PM)
    this.addJob({
      id: 'evening-reflection',
      name: 'Evening Reflection',
      trigger: 'evening_reflection',
      cronExpression: '0 20 * * *',
      isActive: true
    })

    // Sleep reminder (9:30 PM)
    this.addJob({
      id: 'sleep-reminder',
      name: 'Sleep Reminder',
      trigger: 'sleep_reminder',
      cronExpression: '30 21 * * *',
      isActive: true
    })

    // Goal nudges (2:00 PM on weekdays)
    this.addJob({
      id: 'goal-nudge',
      name: 'Goal Nudge',
      trigger: 'goal_nudge',
      cronExpression: '0 14 * * 1-5',
      isActive: true
    })

    // Habit reminders (6:00 PM)
    this.addJob({
      id: 'habit-reminder',
      name: 'Habit Reminder',
      trigger: 'habit_reminder',
      cronExpression: '0 18 * * *',
      isActive: true
    })
  }

  private addJob(job: ScheduledJob) {
    this.jobs.set(job.id, job)
    this.scheduleJob(job)
  }

  private scheduleJob(job: ScheduledJob) {
    if (!job.isActive) return

    // Parse cron expression and calculate next run time
    const nextRun = this.calculateNextRun(job.cronExpression)
    job.nextRun = nextRun

    // Calculate delay until next run
    const now = new Date()
    const delay = nextRun.getTime() - now.getTime()

    if (delay > 0) {
      const timeout = setTimeout(() => {
        this.executeJob(job)
        this.scheduleJob(job) // Schedule next run
      }, delay)

      this.intervals.set(job.id, timeout)
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    const now = new Date()
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpression.split(' ')

    // Simple cron parser (for production, use a proper cron library)
    const nextRun = new Date(now)
    
    if (minute !== '*') {
      nextRun.setMinutes(parseInt(minute), 0, 0)
    }
    
    if (hour !== '*') {
      nextRun.setHours(parseInt(hour), nextRun.getMinutes(), 0, 0)
    }

    // If the time has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    return nextRun
  }

  private async executeJob(job: ScheduledJob) {
    try {
      console.log(`Executing job: ${job.name}`)
      
      // Get active users
      const activeUsers = await getActiveUsers()
      
      if (activeUsers.length === 0) {
        console.log('No active users found')
        return
      }

      // Send proactive messages to all active users
      let successCount = 0
      let failureCount = 0

      for (const userId of activeUsers) {
        try {
          const sent = await sendProactiveMessage(userId, job.trigger)
          if (sent) {
            successCount++
          } else {
            failureCount++
          }
        } catch (error) {
          console.error(`Error sending message to user ${userId}:`, error)
          failureCount++
        }
      }

      console.log(`Job ${job.name} completed: ${successCount} success, ${failureCount} failures`)
      
      // Update job last run time
      job.lastRun = new Date()
      this.jobs.set(job.id, job)

    } catch (error) {
      console.error(`Error executing job ${job.name}:`, error)
    }
  }

  public start() {
    console.log('Starting Proactive Coach Scheduler...')
    this.jobs.forEach(job => {
      if (job.isActive) {
        this.scheduleJob(job)
      }
    })
  }

  public stop() {
    console.log('Stopping Proactive Coach Scheduler...')
    this.intervals.forEach(timeout => clearTimeout(timeout))
    this.intervals.clear()
  }

  public getJobStatus(): ScheduledJob[] {
    return Array.from(this.jobs.values())
  }

  public toggleJob(jobId: string, isActive: boolean) {
    const job = this.jobs.get(jobId)
    if (job) {
      job.isActive = isActive
      this.jobs.set(jobId, job)
      
      if (isActive) {
        this.scheduleJob(job)
      } else {
        const timeout = this.intervals.get(jobId)
        if (timeout) {
          clearTimeout(timeout)
          this.intervals.delete(jobId)
        }
      }
    }
  }
}

// Global scheduler instance
export const proactiveCoachScheduler = new ProactiveCoachScheduler()

// Start scheduler when module is imported
if (typeof window === 'undefined') {
  proactiveCoachScheduler.start()
}








