import { NextRequest, NextResponse } from 'next/server'
import { sendProactiveMessage, ProactiveTrigger } from '@/lib/coach/proactive-messaging'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, goalCategory, trigger } = await request.json()

    if (!userId || !goalCategory) {
      return NextResponse.json(
        { error: 'userId and goalCategory are required' },
        { status: 400 }
      )
    }

    // Get user's goals in the specific category
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('category', goalCategory)
      .eq('is_active', true)

    if (goalsError) {
      return NextResponse.json(
        { error: 'Failed to fetch goals' },
        { status: 500 }
      )
    }

    if (!goals || goals.length === 0) {
      return NextResponse.json(
        { error: `No active ${goalCategory} goals found` },
        { status: 404 }
      )
    }

    // Determine the best trigger based on goal category and time
    const now = new Date()
    const hour = now.getHours()
    
    let selectedTrigger: ProactiveTrigger
    
    if (trigger) {
      selectedTrigger = trigger as ProactiveTrigger
    } else {
      // Auto-select trigger based on goal category and time
      switch (goalCategory) {
        case 'nutrition':
          if (hour >= 11 && hour <= 14) {
            selectedTrigger = 'lunch_reminder'
          } else if (hour >= 7 && hour <= 9) {
            selectedTrigger = 'morning_checkin'
          } else {
            selectedTrigger = 'goal_nudge'
          }
          break
        case 'exercise':
          if (hour >= 6 && hour <= 10) {
            selectedTrigger = 'morning_checkin'
          } else if (hour >= 16 && hour <= 19) {
            selectedTrigger = 'habit_reminder'
          } else {
            selectedTrigger = 'goal_nudge'
          }
          break
        case 'sleep':
          if (hour >= 20 && hour <= 23) {
            selectedTrigger = 'sleep_reminder'
          } else if (hour >= 7 && hour <= 9) {
            selectedTrigger = 'morning_checkin'
          } else {
            selectedTrigger = 'goal_nudge'
          }
          break
        case 'social':
          if (hour >= 12 && hour <= 14) {
            selectedTrigger = 'lunch_reminder'
          } else if (hour >= 18 && hour <= 20) {
            selectedTrigger = 'evening_reflection'
          } else {
            selectedTrigger = 'goal_nudge'
          }
          break
        case 'habits':
          if (hour >= 18 && hour <= 20) {
            selectedTrigger = 'habit_reminder'
          } else if (hour >= 7 && hour <= 9) {
            selectedTrigger = 'morning_checkin'
          } else {
            selectedTrigger = 'goal_nudge'
          }
          break
        default:
          selectedTrigger = 'goal_nudge'
      }
    }

    // Send goal-specific proactive message
    const success = await sendProactiveMessage(userId, selectedTrigger)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send goal-specific message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Goal-specific message sent for ${goalCategory} goals`,
      trigger: selectedTrigger,
      goals: goals.length
    })

  } catch (error) {
    console.error('Error in goal-specific message endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const goalCategory = searchParams.get('goalCategory')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get user's goals in the specific category (if provided)
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (goalCategory) {
      query = query.eq('category', goalCategory)
    }

    const { data: goals, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch goals' },
        { status: 500 }
      )
    }

    // Group goals by category
    const goalsByCategory = goals?.reduce((acc: any, goal: any) => {
      if (!acc[goal.category]) {
        acc[goal.category] = []
      }
      acc[goal.category].push(goal)
      return acc
    }, {}) || {}

    return NextResponse.json({
      goals: goals || [],
      goalsByCategory,
      totalGoals: goals?.length || 0
    })

  } catch (error) {
    console.error('Error fetching goal-specific data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








