import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/ai/openai'
import { supabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const { userId, timeOfDay, userGoals, recentActions, preferences } = await request.json()

    // Get user's goals from database
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (goalsError) {
      console.log('No goals found, using default context')
    }

    // Get recent completed actions for context
    const { data: recentCompletedActions } = await supabase
      .from('completed_actions')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('completed_at', { ascending: false })
      .limit(10)

    // Build context for GPT
    const goalsContext = goals?.map(goal => 
      `${goal.category}: ${goal.title} (${goal.description})`
    ).join(', ') || 'General health and wellness'

    const recentActionsContext = recentCompletedActions?.map(action => 
      action.action
    ).join(', ') || 'No recent actions'

    const currentHour = new Date().getHours()
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6

    // Create dynamic prompt for GPT
    const systemPrompt = `You are an intelligent longevity coach that generates personalized, actionable suggestions based on the user's goals, time of day, and recent activity.

User Context:
- Goals: ${goalsContext}
- Recent Actions: ${recentActionsContext}
- Current Time: ${currentHour}:00 (${isWeekend ? 'Weekend' : 'Weekday'})
- Time of Day: ${timeOfDay}
- User Preferences: ${JSON.stringify(preferences || {})}

Generate a proactive suggestion that:
1. Is specific to their goals and current time
2. Builds on their recent positive actions
3. Avoids repetition of recent suggestions
4. Is actionable with clear steps
5. Explains the benefit (why it helps them feel better now and in the future)
6. Is encouraging and motivating

Return a JSON response with:
{
  "message": "Personalized suggestion message",
  "actions": [
    {
      "id": "unique-id",
      "type": "checklist|timer|reminder|schedule",
      "title": "Action title",
      "description": "Brief description of benefit"
    }
  ],
  "reasoning": "Why this suggestion is relevant for them right now"
}

Make it feel personal and avoid generic advice. Focus on their specific goals and what they've been working on.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a personalized suggestion for this user at ${timeOfDay} time.` }
      ],
      temperature: 0.8,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from GPT')
    }

    // Parse JSON response
    let suggestionData
    try {
      suggestionData = JSON.parse(response)
    } catch (parseError) {
      console.error('Failed to parse GPT response:', parseError)
      // Fallback to simple suggestion
      suggestionData = {
        message: "How about taking a moment to check in with your goals today?",
        actions: [{
          id: `fallback-${Date.now()}`,
          type: 'checklist',
          title: 'Review your progress',
          description: 'Take a moment to appreciate your efforts'
        }],
        reasoning: "General wellness check-in"
      }
    }

    return NextResponse.json({
      success: true,
      suggestion: suggestionData
    })

  } catch (error) {
    console.error('Error generating dynamic suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 }
    )
  }
}



