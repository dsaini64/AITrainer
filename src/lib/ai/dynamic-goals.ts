export interface DynamicGoal {
  id: string
  category: 'nutrition' | 'exercise' | 'sleep' | 'stress' | 'social' | 'learning'
  title: string
  description: string
  target: number
  current: number
  unit: string
  deadline: Date
  priority: 'high' | 'medium' | 'low'
  difficulty: 'easy' | 'medium' | 'hard'
  progress: number // 0-100
  streak: number
  lastUpdated: Date
  milestones: Array<{
    id: string
    title: string
    target: number
    achieved: boolean
    achievedAt?: Date
  }>
  adaptiveSuggestions: Array<{
    id: string
    title: string
    description: string
    type: 'micro_goal' | 'habit_stack' | 'environment_change' | 'social_support'
    difficulty: 'easy' | 'medium' | 'hard'
    estimatedTime: number // minutes
  }>
}

export interface GoalProgress {
  overall: number
  byCategory: {
    nutrition: number
    exercise: number
    sleep: number
    stress: number
    social: number
    learning: number
  }
  trends: {
    weekly: number[]
    monthly: number[]
    quarterly: number[]
  }
  insights: Array<{
    type: 'success' | 'struggle' | 'pattern' | 'opportunity'
    message: string
    actionable: boolean
    priority: 'high' | 'medium' | 'low'
  }>
}

export class DynamicGoalTracker {
  private goals: DynamicGoal[]
  private userContext: any

  constructor(goals: DynamicGoal[], userContext: any) {
    this.goals = goals
    this.userContext = userContext
  }

  public analyzeGoalProgress(): GoalProgress {
    const overall = this.calculateOverallProgress()
    const byCategory = this.calculateCategoryProgress()
    const trends = this.calculateTrends()
    const insights = this.generateInsights()

    return {
      overall,
      byCategory,
      trends,
      insights
    }
  }

  private calculateOverallProgress(): number {
    if (this.goals.length === 0) return 0

    const totalProgress = this.goals.reduce((sum, goal) => sum + goal.progress, 0)
    return totalProgress / this.goals.length
  }

  private calculateCategoryProgress() {
    const categories = ['nutrition', 'exercise', 'sleep', 'stress', 'social', 'learning']
    const progress: any = {}

    categories.forEach(category => {
      const categoryGoals = this.goals.filter(goal => goal.category === category)
      if (categoryGoals.length === 0) {
        progress[category] = 0
        return
      }

      const totalProgress = categoryGoals.reduce((sum, goal) => sum + goal.progress, 0)
      progress[category] = totalProgress / categoryGoals.length
    })

    return progress
  }

  private calculateTrends() {
    // Mock trend data - in real implementation, this would come from historical data
    return {
      weekly: [65, 70, 68, 72, 75, 78, 80],
      monthly: [60, 65, 70, 75],
      quarterly: [50, 60, 70, 80]
    }
  }

  private generateInsights(): Array<{
    type: 'success' | 'struggle' | 'pattern' | 'opportunity'
    message: string
    actionable: boolean
    priority: 'high' | 'medium' | 'low'
  }> {
    const insights = []

    // Success insights
    const successfulGoals = this.goals.filter(goal => goal.progress > 80)
    if (successfulGoals.length > 0) {
      insights.push({
        type: 'success',
        message: `Great job! You're crushing it with ${successfulGoals[0].title}. Your consistency is paying off!`,
        actionable: true,
        priority: 'high'
      })
    }

    // Struggle insights
    const strugglingGoals = this.goals.filter(goal => goal.progress < 30)
    if (strugglingGoals.length > 0) {
      insights.push({
        type: 'struggle',
        message: `I notice ${strugglingGoals[0].title} could use some attention. Let's break it down into smaller, more manageable steps.`,
        actionable: true,
        priority: 'high'
      })
    }

    // Pattern insights
    const nutritionGoals = this.goals.filter(goal => goal.category === 'nutrition')
    if (nutritionGoals.length > 0 && nutritionGoals[0].progress > 70) {
      insights.push({
        type: 'pattern',
        message: 'Your nutrition habits are really strong! This is a great foundation for your longevity goals.',
        actionable: false,
        priority: 'medium'
      })
    }

    // Opportunity insights
    const exerciseGoals = this.goals.filter(goal => goal.category === 'exercise')
    if (exerciseGoals.length > 0 && exerciseGoals[0].progress < 50) {
      insights.push({
        type: 'opportunity',
        message: 'There\'s a big opportunity to boost your exercise routine. Even small changes can have huge impacts on your longevity.',
        actionable: true,
        priority: 'medium'
      })
    }

    return insights
  }

  public generateAdaptiveSuggestions(goalId: string): Array<{
    id: string
    title: string
    description: string
    type: 'micro_goal' | 'habit_stack' | 'environment_change' | 'social_support'
    difficulty: 'easy' | 'medium' | 'hard'
    estimatedTime: number
  }> {
    const goal = this.goals.find(g => g.id === goalId)
    if (!goal) return []

    const suggestions = []

    // Generate suggestions based on goal category and progress
    switch (goal.category) {
      case 'nutrition':
        suggestions.push(
          {
            id: `nutrition-${Date.now()}-1`,
            title: 'Add one serving of vegetables to your next meal',
            description: 'Small, sustainable changes build lasting habits',
            type: 'micro_goal',
            difficulty: 'easy',
            estimatedTime: 5
          },
          {
            id: `nutrition-${Date.now()}-2`,
            title: 'Prep healthy snacks for the week',
            description: 'Environment change that makes healthy choices easier',
            type: 'environment_change',
            difficulty: 'medium',
            estimatedTime: 30
          }
        )
        break

      case 'exercise':
        suggestions.push(
          {
            id: `exercise-${Date.now()}-1`,
            title: 'Take a 10-minute walk after your next meal',
            description: 'Habit stack exercise onto an existing routine',
            type: 'habit_stack',
            difficulty: 'easy',
            estimatedTime: 10
          },
          {
            id: `exercise-${Date.now()}-2`,
            title: 'Set up a home workout space',
            description: 'Create an environment that supports your fitness goals',
            type: 'environment_change',
            difficulty: 'medium',
            estimatedTime: 15
          }
        )
        break

      case 'sleep':
        suggestions.push(
          {
            id: `sleep-${Date.now()}-1`,
            title: 'Set a consistent bedtime for this week',
            description: 'Consistency is key for quality sleep',
            type: 'micro_goal',
            difficulty: 'easy',
            estimatedTime: 5
          },
          {
            id: `sleep-${Date.now()}-2`,
            title: 'Create a relaxing bedtime routine',
            description: 'Environment change that signals your body it\'s time to sleep',
            type: 'environment_change',
            difficulty: 'medium',
            estimatedTime: 20
          }
        )
        break

      case 'stress':
        suggestions.push(
          {
            id: `stress-${Date.now()}-1`,
            title: 'Practice 5 minutes of deep breathing',
            description: 'Quick stress relief technique you can do anywhere',
            type: 'micro_goal',
            difficulty: 'easy',
            estimatedTime: 5
          },
          {
            id: `stress-${Date.now()}-2`,
            title: 'Identify your top 3 stress triggers',
            description: 'Awareness is the first step to managing stress',
            type: 'micro_goal',
            difficulty: 'medium',
            estimatedTime: 10
          }
        )
        break

      case 'social':
        suggestions.push(
          {
            id: `social-${Date.now()}-1`,
            title: 'Reach out to one friend or family member today',
            description: 'Social connections are crucial for longevity',
            type: 'micro_goal',
            difficulty: 'easy',
            estimatedTime: 10
          },
          {
            id: `social-${Date.now()}-2`,
            title: 'Plan a social activity for this weekend',
            description: 'Proactive social engagement',
            type: 'micro_goal',
            difficulty: 'medium',
            estimatedTime: 15
          }
        )
        break

      case 'learning':
        suggestions.push(
          {
            id: `learning-${Date.now()}-1`,
            title: 'Read for 10 minutes about a topic you\'re curious about',
            description: 'Continuous learning keeps your mind sharp',
            type: 'micro_goal',
            difficulty: 'easy',
            estimatedTime: 10
          },
          {
            id: `learning-${Date.now()}-2`,
            title: 'Try a new skill or hobby',
            description: 'Learning new things is great for brain health',
            type: 'micro_goal',
            difficulty: 'medium',
            estimatedTime: 30
          }
        )
        break
    }

    return suggestions
  }

  public updateGoalProgress(goalId: string, progress: number): void {
    const goal = this.goals.find(g => g.id === goalId)
    if (!goal) return

    goal.current = progress
    goal.progress = (progress / goal.target) * 100
    goal.lastUpdated = new Date()

    // Update streak
    if (goal.progress > 0) {
      goal.streak += 1
    } else {
      goal.streak = 0
    }

    // Check milestones
    this.checkMilestones(goal)
  }

  private checkMilestones(goal: DynamicGoal): void {
    goal.milestones.forEach(milestone => {
      if (!milestone.achieved && goal.progress >= milestone.target) {
        milestone.achieved = true
        milestone.achievedAt = new Date()
      }
    })
  }

  public getNextBestAction(): {
    goal: DynamicGoal
    action: string
    reason: string
    priority: 'high' | 'medium' | 'low'
  } | null {
    // Find the goal that needs the most attention
    const strugglingGoals = this.goals.filter(goal => goal.progress < 50)
    if (strugglingGoals.length === 0) return null

    // Sort by priority and progress
    const sortedGoals = strugglingGoals.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 }
      const aWeight = priorityWeight[a.priority] + (50 - a.progress)
      const bWeight = priorityWeight[b.priority] + (50 - b.progress)
      return bWeight - aWeight
    })

    const goal = sortedGoals[0]
    const suggestions = this.generateAdaptiveSuggestions(goal.id)
    const bestSuggestion = suggestions.find(s => s.difficulty === 'easy') || suggestions[0]

    return {
      goal,
      action: bestSuggestion.title,
      reason: `This goal needs attention and this action is achievable`,
      priority: goal.priority
    }
  }
}








