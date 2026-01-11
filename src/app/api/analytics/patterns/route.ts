import { NextRequest, NextResponse } from 'next/server'
import { analyzeUserPatterns } from '@/lib/analytics/pattern-analysis'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Analyze user patterns
    const patterns = await analyzeUserPatterns(userId)

    if (!patterns) {
      return NextResponse.json(
        { error: 'Failed to analyze patterns' },
        { status: 500 }
      )
    }

    return NextResponse.json(patterns)

  } catch (error) {
    console.error('Error analyzing user patterns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, triggerAnalysis = false } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Analyze patterns
    const patterns = await analyzeUserPatterns(userId)

    if (!patterns) {
      return NextResponse.json(
        { error: 'Failed to analyze patterns' },
        { status: 500 }
      )
    }

    // If triggerAnalysis is true, determine if we should send proactive messages
    if (triggerAnalysis) {
      const shouldTrigger = await determineProactiveTriggers(patterns)
      
      return NextResponse.json({
        patterns,
        triggers: shouldTrigger
      })
    }

    return NextResponse.json(patterns)

  } catch (error) {
    console.error('Error in pattern analysis endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function determineProactiveTriggers(patterns: any): Promise<string[]> {
  const triggers: string[] = []

  // Check for low energy patterns
  if (patterns.patterns.energyPattern?.averageEnergy < 3) {
    triggers.push('low_energy_alert')
  }

  // Check for sleep issues
  if (patterns.patterns.sleepPattern?.consistency < 60) {
    triggers.push('sleep_reminder')
  }

  // Check for mood decline
  if (patterns.patterns.moodPattern?.moodTrend === 'declining') {
    triggers.push('goal_nudge')
  }

  // Check for struggling habits
  if (patterns.patterns.goalProgress?.struggling.length > 0) {
    triggers.push('habit_reminder')
  }

  // Check for progress worth celebrating
  if (patterns.patterns.goalProgress?.onTrack.length > 0) {
    triggers.push('progress_celebration')
  }

  return triggers
}








