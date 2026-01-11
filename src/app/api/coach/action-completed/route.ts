import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, action, type, messageId } = await request.json()

    if (!userId || !action || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Store completed action in database
    const { data, error } = await supabase
      .from('completed_actions')
      .insert({
        user_id: userId,
        action: action,
        type: type,
        message_id: messageId,
        completed_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error storing completed action:', error)
      return NextResponse.json(
        { error: 'Failed to store completed action' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data[0]
    })

  } catch (error) {
    console.error('Error in action-completed API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}








