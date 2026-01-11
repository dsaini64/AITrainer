import { NextRequest, NextResponse } from 'next/server'
import { openai, COACH_SYSTEM_PROMPT, containsSafetyKeywords, generateSafetyResponse } from '@/lib/ai/openai'
import { buildUserContext, formatContextForAI, getRecentConversation } from '@/lib/ai/context'
import { parseActionsFromResponse, extractCitations, generateActionPrompts } from '@/lib/ai/actions'
import { getRAGRetriever } from '@/lib/ai/rag/retriever'
import { getMCPServer } from '@/lib/ai/mcp/server'
// import { supabase } from '@/lib/supabase/client' // Not needed on server side
import { createClient } from '@supabase/supabase-js'

// Create a service role client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseServiceKey) {
  console.warn('Missing SUPABASE_SERVICE_ROLE_KEY - some features may not work')
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY')
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    // Add timeout to prevent infinite loops
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    )
    
    const { message, mode = 'explain', userId, onboardingData } = await request.json()

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      )
    }

    // Check for safety keywords
    const isSafetyIssue = containsSafetyKeywords(message)
    
    if (isSafetyIssue) {
      const safetyResponse = generateSafetyResponse()
      
      // Save safety message to database (if supabaseAdmin is available)
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('coach_messages').insert([
            {
              user_id: userId,
              type: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            },
            {
              user_id: userId,
              type: 'coach',
              content: safetyResponse,
              timestamp: new Date().toISOString(),
              mode,
              is_safety_card: true,
            }
          ])
        } catch (dbError) {
          console.error('Error saving safety message to database:', dbError)
          // Continue even if database save fails
        }
      }

      return NextResponse.json({
        response: safetyResponse,
        actions: [],
        citations: [],
        isSafetyCard: true
      })
    }

    // Wrap main logic in Promise.race with timeout
    const mainLogic = async () => {
      // Build user context (with error handling)
      let userContext
      try {
        userContext = await buildUserContext(userId)
      } catch (error) {
        console.error('Error building user context:', error)
        // Use minimal context if build fails - create a basic context object
        const now = new Date()
        userContext = {
          userId,
          profile: { age: null, gender: null, race: null, cdcAge: null, ageDiff: null, totalRisk: null },
          healthMetrics: {},
          onboarding: onboardingData || {},
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
          schedule: { workHours: { start: 9, end: 17 }, typicalWakeTime: 7, typicalBedtime: 22, mealTimes: { breakfast: 8, lunch: 12, dinner: 18 } },
          location: { timezone: 'UTC', weather: { temperature: 22, condition: 'sunny' }, isIndoors: true },
          recentActivity: { lastWorkout: undefined, lastMeal: undefined, lastSocialInteraction: undefined },
          preferences: { units: 'metric', timeFormat: '24h', dietaryRestrictions: [], fitnessLevel: 'intermediate', equipment: ['bodyweight'], favoriteActivities: [], dislikedActivities: [] }
        }
      }
      
      // Override onboarding data if provided from client
      if (onboardingData && Object.keys(onboardingData).length > 0) {
        userContext.onboarding = onboardingData
      }
      
      // RAG: Retrieve relevant context from knowledge base
      let ragContext = ''
      try {
        const ragRetriever = getRAGRetriever()
        const retrievalResult = await ragRetriever.retrieve(message, userId, {
          limit: 5,
          includeUserData: true
        })
        ragContext = ragRetriever.formatContext(retrievalResult)
      } catch (error) {
        console.error('RAG retrieval error:', error)
        // Continue without RAG context if retrieval fails
      }
      
      const contextString = formatContextForAI(userContext, mode)
      
      // Get recent conversation for continuity (with error handling)
      let recentMessages = []
      try {
        recentMessages = await getRecentConversation(userId, 6)
      } catch (error) {
        console.error('Error fetching recent conversation:', error)
        // Continue with empty conversation history if fetch fails
      }
      
      // Build conversation history for OpenAI
      const conversationHistory = recentMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))

      // Generate action prompts based on mode
      const actionPrompts = generateActionPrompts(mode, message)

      // Get MCP tools for function calling
      let mcpTools: any[] = []
      try {
        const mcpServer = getMCPServer()
        mcpTools = mcpServer.getOpenAITools()
      } catch (error) {
        console.error('MCP server initialization error:', error)
        // Continue without MCP tools if initialization fails
      }

      // Special handling for proactive responses
      let fullSystemPrompt = `${COACH_SYSTEM_PROMPT}

${contextString}

${ragContext ? `\n${ragContext}\n` : ''}

${actionPrompts}

You have access to MCP (Model Context Protocol) tools that allow you to:
- Retrieve user health metrics, goals, and preferences
- Get nutrition information for foods
- Get exercise suggestions
- Create goals and log actions
- Access weather information

Use these tools when you need specific data to provide accurate, personalized responses.

Remember to:
- Personalize responses based on the user's current health data and context
- Use RAG context and MCP tools to provide evidence-based, accurate information
- Provide specific, actionable advice that's relevant to their situation
- Be encouraging and supportive in your responses
- Ask relevant questions to understand their needs better
- Explain concepts clearly and simply
- Include relevant citations for scientific claims
- Format action items clearly for easy parsing`

    // Add special instructions for proactive responses
    if (mode === 'proactive_response') {
      fullSystemPrompt += `

IMPORTANT: This is a response to a proactive message from the coach. The user is responding to a suggestion or recommendation. 

- Acknowledge their response positively
- Offer specific alternatives based on their feedback
- Adapt to their preferences, constraints, or situation
- Maintain motivation and encouragement
- Provide concrete, actionable alternatives
- Remember their preferences for future suggestions
- Be conversational and build on the previous context

Examples of good responses:
- If they don't like a food: "No problem! Let's find alternatives that work for you. How about [specific alternative]? Or if you prefer, [another specific option]."
- If they're at work: "Ah, you're at work! That makes sense. For takeout options, how about [specific takeout suggestion]? I'll remember that you need takeout options during work days!"
- If they couldn't do something: "I understand! Let's find something that works better for your schedule. How about [specific alternative]? What feels more doable for you?"`
    }

    // Add special instructions for action feedback
    if (mode === 'action_feedback') {
      fullSystemPrompt += `

IMPORTANT: The user just completed an action from a coach suggestion. Give a brief, encouraging response.

- Be natural and conversational (1-2 sentences max)
- Acknowledge what they did specifically
- Show you're learning from their actions
- Be encouraging but not overly formal
- Use appropriate language for the action type

Examples:
- For food: "Nice! I see you're giving that quinoa bowl a try - I'll remember what works for you."
- For exercise: "Great! Starting that 20-minute walk - I'm tracking what clicks for you."
- For reminders: "Perfect! I'll remind you about that - learning what helps you stay on track."`
    }

    // Simplified - no special mode handling needed

    // Create streaming response with MCP tools support
    if (!openai) {
      throw new Error('OpenAI client is not initialized. Please check OPENAI_API_KEY environment variable.')
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: fullSystemPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ],
      tools: mcpTools.length > 0 ? mcpTools : undefined,
      tool_choice: mcpTools.length > 0 ? 'auto' : undefined,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    })

    // Create a readable stream for the response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let toolCalls: any[] = []
          
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta
            
            // Handle tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index || 0
                if (!toolCalls[index]) {
                  toolCalls[index] = {
                    id: toolCall.id,
                    type: 'function',
                    function: { name: '', arguments: '' }
                  }
                }
                if (toolCall.function?.name) {
                  toolCalls[index].function.name = toolCall.function.name
                }
                if (toolCall.function?.arguments) {
                  toolCalls[index].function.arguments += toolCall.function.arguments
                }
              }
            }
            
            // Handle content
            const content = delta?.content || ''
            if (content) {
              fullResponse += content
              
              if (controller.desiredSize !== null) {
                try {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                } catch (error) {
                  console.log('Controller already closed, stopping stream')
                  break
                }
              }
            }
          }

          // Process tool calls if any
          if (toolCalls.length > 0) {
            let mcpServer
            try {
              mcpServer = getMCPServer()
            } catch (error) {
              console.error('MCP server error during tool execution:', error)
              throw error
            }
            const toolResults: any[] = []
            
            for (const toolCall of toolCalls) {
              if (toolCall.function?.name) {
                try {
                  const args = JSON.parse(toolCall.function.arguments || '{}')
                  const result = await mcpServer.execute({
                    tool: toolCall.function.name,
                    parameters: args,
                    userId
                  })
                  
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool' as const,
                    name: toolCall.function.name,
                    content: JSON.stringify(result)
                  })
                } catch (error) {
                  console.error('Tool execution error:', error)
                  toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool' as const,
                    name: toolCall.function.name,
                    content: JSON.stringify({ error: 'Tool execution failed' })
                  })
                }
              }
            }
            
            // If we have tool results, make a follow-up call with the results
            if (toolResults.length > 0) {
              if (!openai) {
                throw new Error('OpenAI client is not initialized')
              }
              
              const followUpStream = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: fullSystemPrompt },
                  ...conversationHistory,
                  { role: 'user', content: message },
                  {
                    role: 'assistant',
                    content: null,
                    tool_calls: toolCalls.map(tc => ({
                      id: tc.id,
                      type: 'function',
                      function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments
                      }
                    }))
                  },
                  ...toolResults
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 1000,
              })
              
              // Stream the follow-up response
              fullResponse = ''
              for await (const chunk of followUpStream) {
                const content = chunk.choices[0]?.delta?.content || ''
                fullResponse += content
                
                if (content && controller.desiredSize !== null) {
                  try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                  } catch (error) {
                    console.log('Controller already closed, stopping stream')
                    break
                  }
                }
              }
            }
          }

          // Process the complete response for actions and citations
          const actions = parseActionsFromResponse(fullResponse)
          const citations = extractCitations(fullResponse)

          // Send final metadata
          if (controller.desiredSize !== null) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                actions, 
                citations, 
                complete: true 
              })}\n\n`))
            } catch (error) {
              console.log('Controller already closed, skipping final metadata')
            }
          }

      // Save messages to database (if supabaseAdmin is available)
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('coach_messages').insert([
            {
              user_id: userId,
              type: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            },
            {
              user_id: userId,
              type: 'coach',
              content: fullResponse,
              timestamp: new Date().toISOString(),
              mode,
              citations: citations.length > 0 ? citations : null,
            }
          ])
        } catch (dbError) {
          console.error('Error saving messages to database:', dbError)
          // Continue even if database save fails
        }
      }

          if (controller.desiredSize !== null) {
            controller.close()
          }
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
    }

    // Execute main logic with timeout
    return await Promise.race([mainLogic(), timeoutPromise])

  } catch (error) {
    console.error('Chat API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    
    // Log full error details for debugging
    console.error('Full error details:', errorDetails)
    
    // Provide helpful error messages
    let userFriendlyError = 'Failed to process chat message'
    if (errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('OpenAI')) {
      userFriendlyError = 'OpenAI API key is not configured. Please check your environment variables.'
    } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      userFriendlyError = 'Network error: Unable to connect to AI service. Please check your internet connection.'
    } else if (errorMessage.includes('timeout')) {
      userFriendlyError = 'Request timed out. Please try again.'
    } else if (errorMessage.includes('Supabase') || errorMessage.includes('database')) {
      userFriendlyError = 'Database connection error. Please check your Supabase configuration.'
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyError,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Chat API is running' })
}