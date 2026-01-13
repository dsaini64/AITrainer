import { createClient } from '@supabase/supabase-js'
import { buildUserContext, formatContextForAI } from '@/lib/ai/context'
import { openai } from '@/lib/ai/openai'
import { sendPushNotification, NotificationPayload } from '@/lib/notifications/push-notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ProactiveTrigger = 
  | 'morning_checkin'
  | 'lunch_reminder'
  | 'evening_reflection'
  | 'goal_nudge'
  | 'habit_reminder'
  | 'progress_celebration'
  | 'low_energy_alert'
  | 'sleep_reminder'

export interface ProactiveMessage {
  trigger: ProactiveTrigger
  title: string
  content: string
  actions?: Array<{
    type: 'timer' | 'reminder' | 'checklist' | 'schedule'
    title: string
    description?: string
  }>
  priority: 'low' | 'medium' | 'high'
}

export async function generateProactiveMessage(
  userId: string,
  trigger: ProactiveTrigger
): Promise<ProactiveMessage | null> {
  try {
    // Build user context
    const userContext = await buildUserContext(userId)
    
    // Generate context-aware prompt based on trigger
    const prompt = generateTriggerPrompt(trigger, userContext)
    
    // Get AI response
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a proactive longevity coach. Generate HIGHLY SPECIFIC, DETAILED messages based on the user's context and the specific trigger. 

CRITICAL REQUIREMENTS:
- Be EXTREMELY SPECIFIC with exact ingredients, amounts, timing, and methods
- Provide DETAILED recipes, exercises, and routines with exact steps
- Include SPECIFIC people, places, and activities when relevant
- Give EXACT measurements, durations, and quantities
- Suggest SPECIFIC alternatives and modifications
- Include EXACT timing for all activities
- Provide SPECIFIC tools, apps, and resources
- Be ACTIONABLE with concrete, implementable steps

Examples of SPECIFIC vs GENERIC:
❌ Generic: "Try a healthy lunch"
✅ Specific: "Mediterranean quinoa bowl: 1 cup cooked quinoa, 1/2 cup chickpeas, 1/4 avocado, 10 cherry tomatoes, 1/2 cucumber, 2 tbsp olive oil, 1 tbsp lemon juice, salt. Takes 10 minutes to prepare. 25g protein, 450 calories."

❌ Generic: "Do some exercise"
✅ Specific: "20-minute HIIT workout: 4 rounds of 30 seconds burpees, 30 seconds rest, 30 seconds mountain climbers, 30 seconds rest, 30 seconds jumping jacks, 30 seconds rest. Total: 20 minutes, burns 200-300 calories."

Keep messages concise but HIGHLY SPECIFIC and actionable.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    // Parse the response to extract title, content, and actions
    const parsed = parseProactiveResponse(content, trigger)
    
    return parsed
  } catch (error) {
    console.error('Error generating proactive message:', error)
    return null
  }
}

function generateTriggerPrompt(trigger: ProactiveTrigger, userContext: any): string {
  // Extract goal categories from active goals
  const goalCategories = userContext.activeGoals?.map((goal: any) => goal.category) || []
  const nutritionGoals = goalCategories.includes('nutrition')
  const exerciseGoals = goalCategories.includes('exercise') 
  const socialGoals = goalCategories.includes('social')
  const sleepGoals = goalCategories.includes('sleep')
  const habitGoals = goalCategories.includes('habits')

  const baseContext = `User Context:
- Recent metrics: ${JSON.stringify(userContext.recentMetrics)}
- Active goals: ${JSON.stringify(userContext.activeGoals)}
- Goal categories: ${goalCategories.join(', ')}
- Last check-in: ${JSON.stringify(userContext.lastCheckin)}
- Current time: ${userContext.currentTime.hour}:00 (${userContext.currentTime.isWeekend ? 'Weekend' : 'Weekday'})
- Season: ${userContext.currentTime.season}
- Location: ${userContext.location.isIndoors ? 'Indoors' : 'Outdoors'}
- Weather: ${userContext.location.weather?.temperature}°C, ${userContext.location.weather?.condition}
- Work hours: ${userContext.schedule.workHours?.start}:00 - ${userContext.schedule.workHours?.end}:00
- Typical wake time: ${userContext.schedule.typicalWakeTime}:00
- Typical bedtime: ${userContext.schedule.typicalBedtime}:00
- Meal times: Breakfast ${userContext.schedule.mealTimes?.breakfast}:00, Lunch ${userContext.schedule.mealTimes?.lunch}:00, Dinner ${userContext.schedule.mealTimes?.dinner}:00
- Fitness level: ${userContext.preferences.fitnessLevel}
- Available equipment: ${userContext.preferences.equipment?.join(', ')}
- Dietary restrictions: ${userContext.preferences.dietaryRestrictions?.join(', ')}
- Favorite activities: ${userContext.preferences.favoriteActivities?.join(', ')}
- Disliked activities: ${userContext.preferences.dislikedActivities?.join(', ')}

Goal-Specific Context:
- Nutrition goals: ${nutritionGoals ? 'YES' : 'NO'}
- Exercise goals: ${exerciseGoals ? 'YES' : 'NO'} 
- Social connection goals: ${socialGoals ? 'YES' : 'NO'}
- Sleep goals: ${sleepGoals ? 'YES' : 'NO'}
- Habit goals: ${habitGoals ? 'YES' : 'NO'}`

  switch (trigger) {
    case 'morning_checkin':
      return `${baseContext}

Generate a morning check-in message that:
- Encourages the user to start their day mindfully with SPECIFIC techniques
- References their specific health goals and recent progress with exact metrics
- Suggests SPECIFIC morning routines with exact timing and steps
- Asks about their energy level and mood with specific questions
- Provides SPECIFIC, actionable morning habits

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Suggest SPECIFIC breakfast recipes with exact ingredients, preparation time, and macros. Examples: "Protein smoothie: 1 cup Greek yogurt, 1 scoop protein powder, 1/2 banana, 1 cup spinach, 1 tbsp almond butter, 1 cup almond milk. Blend for 2 minutes. 35g protein, 400 calories."' : ''}
${exerciseGoals ? '- If they have exercise goals: Suggest SPECIFIC morning workouts with exact exercises, sets, reps, and duration. Examples: "7-minute morning routine: 30 seconds jumping jacks, 30 seconds push-ups, 30 seconds squats, 30 seconds planks, 30 seconds lunges, 30 seconds mountain climbers, 30 seconds burpees. Repeat 2 rounds."' : ''}
${sleepGoals ? '- If they have sleep goals: Ask SPECIFIC sleep quality questions and suggest SPECIFIC sleep hygiene improvements. Examples: "How many hours did you sleep? Rate your sleep quality 1-10. Try: No screens 1 hour before bed, room temperature 65-68°F, blackout curtains, white noise machine."' : ''}
${socialGoals ? '- If they have social goals: Suggest SPECIFIC social activities with exact timing and people. Examples: "Text your mom good morning, call your best friend for 5 minutes, or send a voice message to your workout buddy about today\'s goals."' : ''}
${habitGoals ? '- If they have habit goals: Remind them of SPECIFIC morning habits with exact timing and track progress. Examples: "Your morning routine: 5 minutes meditation at 7am, 10 minutes journaling at 7:05am, 5 minutes stretching at 7:15am. You\'ve completed 12 days in a row!"' : ''}

IMPORTANT: Be extremely specific with:
- Exact timing for activities
- Specific ingredients, exercises, or techniques
- Exact measurements and amounts
- Specific people to contact
- Exact duration and frequency
- Specific environmental factors

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    case 'lunch_reminder':
      return `${baseContext}

Generate a lunch reminder message that:
- Suggests SPECIFIC, DETAILED lunch options with exact ingredients and preparation
- References their recent eating patterns and preferences
- Provides quick, actionable nutrition tips with specific timing
- Encourages mindful eating with specific techniques
- Suggests hydration with specific amounts and timing

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Suggest SPECIFIC recipes with exact ingredients, cooking methods, and portion sizes. Include alternatives for dietary restrictions. Examples: "Mediterranean quinoa bowl: 1 cup cooked quinoa, 1/2 cup chickpeas, 1/4 avocado, cherry tomatoes, cucumber, 2 tbsp olive oil, lemon juice, salt. Takes 10 minutes to prepare."' : ''}
${exerciseGoals ? '- If they have exercise goals: Suggest SPECIFIC pre/post-workout meals with exact macros and timing. Examples: "Pre-workout: 1 banana with 1 tbsp almond butter 30 minutes before. Post-workout: 4oz grilled chicken breast with 1 cup sweet potato and steamed broccoli within 1 hour."' : ''}
${sleepGoals ? '- If they have sleep goals: Suggest SPECIFIC sleep-promoting foods with exact timing. Examples: "Try 1 cup chamomile tea with 1 tbsp honey 2 hours before bed, or 1/2 cup Greek yogurt with 1 tbsp pumpkin seeds for magnesium."' : ''}
${socialGoals ? '- If they have social goals: Suggest SPECIFIC social lunch activities with exact plans. Examples: "Invite Sarah from accounting to try the new Mediterranean place at 12:30pm, or schedule a 20-minute virtual lunch with your sister at 1pm."' : ''}
${habitGoals ? '- If they have habit goals: Remind them of SPECIFIC meal prep habits with exact timing. Examples: "Your Sunday meal prep: 2 cups quinoa, 1 lb roasted vegetables, 4 grilled chicken breasts. Takes 45 minutes total, saves 2 hours during the week."' : ''}

IMPORTANT: Be extremely specific with:
- Exact ingredients and amounts
- Specific preparation methods
- Exact timing (when to eat, how long to prepare)
- Specific alternatives for different preferences
- Exact portion sizes
- Specific cooking techniques

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    case 'evening_reflection':
      return `${baseContext}

Generate an evening reflection message that:
- Encourages reflection on the day's wins
- Asks about challenges or areas for improvement
- Suggests a wind-down routine
- Promotes gratitude or positive thinking
- Prepares them for better sleep

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Ask about their eating today, suggest a light evening snack, or meal prep for tomorrow' : ''}
${exerciseGoals ? '- If they have exercise goals: Ask about their movement today, suggest gentle stretching, or plan tomorrow\'s workout' : ''}
${sleepGoals ? '- If they have sleep goals: Focus on sleep hygiene, suggest a bedtime routine, or ask about sleep preparation' : ''}
${socialGoals ? '- If they have social goals: Ask about social interactions today, suggest reaching out to someone, or plan social activities' : ''}
${habitGoals ? '- If they have habit goals: Review habit completion today, celebrate streaks, or plan tomorrow\'s habit focus' : ''}

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    case 'goal_nudge':
      return `${baseContext}

Generate a goal-focused nudge message that:
- References their SPECIFIC active goals with exact targets and current progress
- Provides encouragement based on SPECIFIC recent progress with exact metrics
- Suggests SPECIFIC, DETAILED actions to move closer to their goals
- Addresses SPECIFIC obstacles or challenges with concrete solutions
- Celebrates SPECIFIC small wins with exact achievements

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Suggest SPECIFIC nutrition actions with exact recipes, meal prep schedules, and macro targets. Examples: "You\'re 15g protein short today. Try: 1 cup Greek yogurt (20g protein) with 1 tbsp hemp seeds (3g protein) and 1/2 cup berries. Meal prep: Sunday batch cook 2 lbs chicken breast, 3 cups quinoa, 2 lbs roasted vegetables. Takes 2 hours, feeds you for 5 days."' : ''}
${exerciseGoals ? '- If they have exercise goals: Suggest SPECIFIC workout plans with exact exercises, sets, reps, and timing. Examples: "You\'ve done 3 workouts this week, need 2 more. Try: 20-minute HIIT: 4 rounds of 30 seconds burpees, 30 seconds rest, 30 seconds mountain climbers, 30 seconds rest, 30 seconds jumping jacks, 30 seconds rest. Or 30-minute strength: 3 sets of 12 squats, 10 push-ups, 8 lunges each leg."' : ''}
${sleepGoals ? '- If they have sleep goals: Suggest SPECIFIC sleep improvements with exact timing and environmental changes. Examples: "Your sleep score is 6/10. Try: 1 hour before bed - dim lights to 20%, 30 minutes before bed - 10 minutes meditation, bedroom temperature 65°F, blackout curtains, white noise at 60dB. Track: bedtime, wake time, sleep quality 1-10."' : ''}
${socialGoals ? '- If they have social goals: Suggest SPECIFIC social activities with exact people, timing, and plans. Examples: "You\'ve connected with 2 people this week, target is 5. Try: Call your mom for 10 minutes today, text your college friend about weekend plans, invite your neighbor for coffee Saturday 10am, join the book club meeting Thursday 7pm, send a voice message to your workout buddy."' : ''}
${habitGoals ? '- If they have habit goals: Suggest SPECIFIC habit strategies with exact timing and tracking. Examples: "Your meditation streak is 5 days, target is 30. Try: 5 minutes every morning at 7am, use Insight Timer app, track in habit tracker, if you miss a day, do 2 minutes before bed. Habit stack: after brushing teeth, before coffee."' : ''}

IMPORTANT: Be extremely specific with:
- Exact targets and current progress
- Specific actions with exact timing
- Specific people, places, and activities
- Exact measurements and amounts
- Specific tools and methods
- Exact tracking and measurement

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    case 'habit_reminder':
      return `${baseContext}

Generate a habit reminder message that:
- References their SPECIFIC habit streaks and progress with exact numbers
- Provides motivation to maintain consistency with SPECIFIC encouragement
- Suggests SPECIFIC habit stacking or environmental changes with exact timing
- Addresses any missed days with SPECIFIC encouragement and recovery strategies
- Celebrates SPECIFIC habit milestones with exact achievements

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Focus on SPECIFIC nutrition habits with exact timing and methods. Examples: "Your hydration streak is 8 days! Today: Drink 8oz water every hour from 9am-5pm, set phone reminders, track in app. Meal prep habit: Sunday 2pm - batch cook 2 lbs chicken, 3 cups quinoa, 2 lbs vegetables, takes 90 minutes, saves 5 hours during week."' : ''}
${exerciseGoals ? '- If they have exercise goals: Focus on SPECIFIC movement habits with exact exercises, sets, reps, and timing. Examples: "Your morning workout streak is 12 days! Today: 7am - 20 minutes: 3 sets of 12 squats, 10 push-ups, 8 lunges each leg, 30 seconds plank, 1 minute jumping jacks. Track: sets completed, time taken, energy level 1-10."' : ''}
${sleepGoals ? '- If they have sleep goals: Focus on SPECIFIC sleep habits with exact timing and environmental settings. Examples: "Your bedtime routine streak is 15 days! Tonight: 9pm - no screens, 9:30pm - 10 minutes journaling, 10pm - bedroom, 10:05pm - 5 minutes meditation, 10:10pm - lights out. Environment: 65°F, blackout curtains, white noise."' : ''}
${socialGoals ? '- If they have social goals: Focus on SPECIFIC social habits with exact people, timing, and activities. Examples: "Your daily check-in streak is 6 days! Today: Text your mom good morning, call your best friend for 5 minutes, send voice message to workout buddy, invite neighbor for coffee Saturday 10am."' : ''}
${habitGoals ? '- If they have habit goals: Focus on SPECIFIC habit targets with exact timing, tracking, and stacking. Examples: "Your meditation streak is 18 days, target is 30! Today: 5 minutes at 7am, use Insight Timer app, track in habit tracker. Habit stack: after brushing teeth, before coffee. If you miss: do 2 minutes before bed."' : ''}

IMPORTANT: Be extremely specific with:
- Exact streak numbers and targets
- Specific exercises with exact sets, reps, and timing
- Specific people and activities
- Exact timing and duration
- Specific tools and tracking methods
- Exact environmental settings

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    case 'progress_celebration':
      return `${baseContext}

Generate a progress celebration message that:
- Highlights SPECIFIC improvements or achievements with exact metrics
- Uses SPECIFIC positive reinforcement and encouragement
- Suggests SPECIFIC next steps or challenges with exact targets
- Promotes continued momentum with SPECIFIC strategies
- Celebrates SPECIFIC wins with exact achievements

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Celebrate SPECIFIC nutrition wins with exact metrics. Examples: "Amazing! You hit your protein target 5 days this week (120g daily), tried 3 new vegetables (kale, Brussels sprouts, beets), and meal prepped 4 days. Next week: Try 1 new protein source (tofu, tempeh, or lentils) and hit 130g protein daily."' : ''}
${exerciseGoals ? '- If they have exercise goals: Celebrate SPECIFIC fitness wins with exact metrics. Examples: "Fantastic! You completed 4 workouts this week (2 strength, 2 cardio), hit 10,000 steps 6 days, and increased your squat weight by 10lbs. Next week: Try 1 new exercise (deadlifts, pull-ups, or burpees) and aim for 12,000 steps daily."' : ''}
${sleepGoals ? '- If they have sleep goals: Celebrate SPECIFIC sleep wins with exact metrics. Examples: "Excellent! You maintained 7-8 hours sleep 6 nights, improved sleep quality from 6/10 to 8/10, and kept consistent bedtime (10pm). Next week: Try 1 new sleep habit (blue light glasses, white noise, or room temperature 65°F)."' : ''}
${socialGoals ? '- If they have social goals: Celebrate SPECIFIC social wins with exact metrics. Examples: "Wonderful! You connected with 5 people this week (mom, best friend, 2 colleagues, neighbor), had 3 meaningful conversations, and joined 1 social activity. Next week: Try 1 new social activity (book club, volunteer, or hobby group)."' : ''}
${habitGoals ? '- If they have habit goals: Celebrate SPECIFIC habit wins with exact metrics. Examples: "Incredible! You maintained your meditation streak for 21 days, journaled 6 days, and completed your morning routine 5 days. Next week: Try 1 new habit (gratitude practice, reading, or stretching) and aim for 7 days straight."' : ''}

IMPORTANT: Be extremely specific with:
- Exact metrics and achievements
- Specific next steps with exact targets
- Specific strategies and methods
- Exact timing and duration
- Specific tools and resources
- Exact measurements and progress

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    case 'low_energy_alert':
      return `${baseContext}

Generate a low energy support message that:
- Acknowledges their SPECIFIC current energy level with exact rating
- Suggests SPECIFIC quick energy-boosting activities with exact timing
- Provides SPECIFIC gentle motivation without pressure
- Suggests SPECIFIC rest or recovery strategies if needed
- Offers SPECIFIC practical energy management tips

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Suggest SPECIFIC energy-boosting foods with exact timing and amounts. Examples: "Energy boost: 1 banana with 1 tbsp almond butter (quick carbs + protein), or 1 cup green tea with 1 tsp honey (caffeine + natural sugar). Avoid: processed foods, sugar crashes. Try: 1 cup water every hour, 1 handful nuts for sustained energy."' : ''}
${exerciseGoals ? '- If they have exercise goals: Suggest SPECIFIC gentle movement with exact exercises and duration. Examples: "5-minute energy boost: 2 minutes walking, 1 minute arm circles, 1 minute leg swings, 1 minute deep breathing. Or 10-minute gentle yoga: cat-cow, child\'s pose, legs up the wall. Avoid: intense workouts when energy is low."' : ''}
${sleepGoals ? '- If they have sleep goals: Connect SPECIFIC low energy to sleep quality with exact metrics. Examples: "Low energy often means poor sleep. Tonight: 1 hour before bed - no screens, 30 minutes before bed - 10 minutes meditation, bedroom 65°F, blackout curtains. Track: sleep hours, quality 1-10, energy next morning."' : ''}
${socialGoals ? '- If they have social goals: Suggest SPECIFIC social activities that energize with exact timing. Examples: "Social energy boost: Call your mom for 5 minutes, text your best friend a funny meme, or invite a colleague for a 10-minute walk. Avoid: draining social situations when energy is low."' : ''}
${habitGoals ? '- If they have habit goals: Suggest SPECIFIC energy-boosting habits with exact timing. Examples: "Energy habits: 5 minutes of sunlight (morning), 2 minutes deep breathing (every 2 hours), 1 cup water (every hour), 10 minutes walking (afternoon). Adjust: lighter habits when energy is low, focus on basics."' : ''}

IMPORTANT: Be extremely specific with:
- Exact energy level ratings and causes
- Specific activities with exact timing
- Specific foods and amounts
- Exact environmental factors
- Specific recovery strategies
- Exact measurement and tracking

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    case 'sleep_reminder':
      return `${baseContext}

Generate a sleep preparation message that:
- Encourages a SPECIFIC bedtime routine with exact timing and steps
- Suggests SPECIFIC sleep-promoting activities with exact duration
- References their sleep goals and recent patterns with specific metrics
- Provides SPECIFIC relaxation or mindfulness techniques
- Promotes SPECIFIC sleep hygiene with exact environmental settings

GOAL-SPECIFIC GUIDANCE:
${nutritionGoals ? '- If they have nutrition goals: Suggest SPECIFIC sleep-promoting foods with exact timing and amounts. Examples: "2 hours before bed: 1 cup chamomile tea with 1 tsp honey, or 1/2 cup Greek yogurt with 1 tbsp pumpkin seeds and 1 tsp magnesium powder. Avoid caffeine after 2pm."' : ''}
${exerciseGoals ? '- If they have exercise goals: Suggest SPECIFIC gentle evening movement with exact exercises and duration. Examples: "30 minutes before bed: 10 minutes gentle yoga (child\'s pose, cat-cow, legs up the wall), 5 minutes deep breathing (4-7-8 technique), 5 minutes progressive muscle relaxation."' : ''}
${sleepGoals ? '- If they have sleep goals: Focus on SPECIFIC sleep targets with exact timing and environmental settings. Examples: "Target: 7-8 hours sleep, bedtime 10pm, wake 6am. Environment: 65-68°F, blackout curtains, white noise at 60dB, phone in another room, blue light glasses 2 hours before bed."' : ''}
${socialGoals ? '- If they have social goals: Suggest SPECIFIC social wind-down activities with exact timing. Examples: "8pm: Call family for 15 minutes, 9pm: Send goodnight text to 3 close friends, 9:30pm: No social media, read a book or listen to calming music."' : ''}
${habitGoals ? '- If they have habit goals: Focus on SPECIFIC sleep-related habits with exact timing and tracking. Examples: "Your sleep routine: 9pm - no screens, 9:30pm - 10 minutes journaling, 10pm - bedroom, 10:05pm - 5 minutes meditation, 10:10pm - lights out. Track: sleep quality 1-10, hours slept, energy level next morning."' : ''}

IMPORTANT: Be extremely specific with:
- Exact timing for each activity
- Specific environmental settings (temperature, lighting, sound)
- Exact duration for each activity
- Specific techniques and methods
- Exact measurements and amounts
- Specific tracking methods

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`

    default:
      return `${baseContext}

Generate a supportive, personalized message that:
- Is relevant to their current health journey
- Provides actionable advice
- Is encouraging and motivating
- Considers their goals and recent data

Format: Title: [short title] | Content: [message] | Actions: [actionable items]`
  }
}

function parseProactiveResponse(content: string, trigger: ProactiveTrigger): ProactiveMessage {
  // Extract title
  const titleMatch = content.match(/Title:\s*(.+?)(?:\n|$)/)
  const title = titleMatch?.[1]?.trim() || `${trigger.replace('_', ' ')} Reminder`

  // Extract content
  const contentMatch = content.match(/Content:\s*(.+?)(?:\n|$)/)
  const messageContent = contentMatch?.[1]?.trim() || content

  // Extract actions
  const actionsMatch = content.match(/Actions:\s*(.+?)(?:\n|$)/)
  const actionsText = actionsMatch?.[1]?.trim()
  
  const actions = actionsText ? parseActions(actionsText) : []

  return {
    trigger,
    title,
    content: messageContent,
    actions,
    priority: getPriorityForTrigger(trigger)
  }
}

function parseActions(actionsText: string): Array<{ type: 'timer' | 'reminder' | 'checklist' | 'schedule'; title: string; description?: string }> {
  const actions: Array<{ type: 'timer' | 'reminder' | 'checklist' | 'schedule'; title: string; description?: string }> = []
  
  // Simple parsing - in a real implementation, you'd want more sophisticated parsing
  const actionItems = actionsText.split(/[•\-\*]/).map(item => item.trim()).filter(Boolean)
  
  for (const item of actionItems) {
    let type: 'timer' | 'reminder' | 'checklist' | 'schedule' = 'checklist'
    const title = item
    
    // Detect action type based on keywords
    if (item.toLowerCase().includes('timer') || item.toLowerCase().includes('minute')) {
      type = 'timer'
    } else if (item.toLowerCase().includes('remind') || item.toLowerCase().includes('remember')) {
      type = 'reminder'
    } else if (item.toLowerCase().includes('schedule') || item.toLowerCase().includes('plan')) {
      type = 'schedule'
    }
    
    actions.push({ type, title })
  }
  
  return actions
}

function getPriorityForTrigger(trigger: ProactiveTrigger): 'low' | 'medium' | 'high' {
  switch (trigger) {
    case 'low_energy_alert':
    case 'progress_celebration':
      return 'high'
    case 'morning_checkin':
    case 'evening_reflection':
      return 'medium'
    default:
      return 'low'
  }
}

export async function sendProactiveMessage(
  userId: string,
  trigger: ProactiveTrigger
): Promise<boolean> {
  try {
    // Generate the proactive message
    const message = await generateProactiveMessage(userId, trigger)
    if (!message) return false

    // Send as push notification
    const notificationPayload: NotificationPayload = {
      title: message.title,
      body: message.content,
      data: {
        trigger,
        actions: message.actions,
        priority: message.priority
      },
      icon: '/favicon.ico',
      tag: `proactive-${trigger}`
    }

    const sent = await sendPushNotification(userId, notificationPayload)
    if (!sent) return false

    // Store in coach_messages table for history with conversation context
    const { error } = await supabase
      .from('coach_messages')
      .insert({
        user_id: userId,
        type: 'coach',
        content: message.content,
        mode: 'proactive',
        actions: message.actions,
        context_data: {
          trigger,
          priority: message.priority,
          generated_at: new Date().toISOString(),
          conversation_id: `proactive-${trigger}-${Date.now()}`,
          expects_response: true,
          response_type: 'feedback'
        }
      })

    if (error) {
      console.error('Error storing proactive message:', error)
    }

    return true
  } catch (error) {
    console.error('Error sending proactive message:', error)
    return false
  }
}

export async function handleProactiveResponse(
  userId: string,
  messageId: string,
  userResponse: string,
  actionCompleted?: boolean
): Promise<string> {
  try {
    // Get the original proactive message
    const { data: originalMessage, error: fetchError } = await supabase
      .from('coach_messages')
      .select('*')
      .eq('id', messageId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !originalMessage) {
      throw new Error('Original message not found')
    }

    // Store user's response
    const { error: responseError } = await supabase
      .from('coach_messages')
      .insert({
        user_id: userId,
        type: 'user',
        content: userResponse,
        mode: 'proactive_response',
        context_data: {
          original_message_id: messageId,
          action_completed: actionCompleted,
          response_timestamp: new Date().toISOString()
        }
      })

    if (responseError) {
      console.error('Error storing user response:', responseError)
    }

    // Generate adaptive response based on user feedback
    const adaptiveResponse = await generateAdaptiveResponse(
      userId,
      originalMessage,
      userResponse,
      actionCompleted
    )

    // Store the coach's adaptive response
    const { error: adaptiveError } = await supabase
      .from('coach_messages')
      .insert({
        user_id: userId,
        type: 'coach',
        content: adaptiveResponse,
        mode: 'proactive_adaptive',
        context_data: {
          original_message_id: messageId,
          user_response: userResponse,
          action_completed: actionCompleted,
          generated_at: new Date().toISOString()
        }
      })

    if (adaptiveError) {
      console.error('Error storing adaptive response:', adaptiveError)
    }

    return adaptiveResponse
  } catch (error) {
    console.error('Error handling proactive response:', error)
    return "I understand your feedback. Let me help you find a better approach that works for you."
  }
}

async function generateAdaptiveResponse(
  userId: string,
  originalMessage: any,
  userResponse: string,
  actionCompleted?: boolean
): Promise<string> {
  try {
    // Build context for adaptive response
    const userContext = await buildUserContext(userId)
    
    const prompt = `You are a proactive longevity coach. A user responded to your proactive message with feedback. Generate an adaptive response that:

1. Acknowledges their feedback positively
2. Offers SPECIFIC alternative suggestions based on their response
3. Adapts to their preferences, allergies, or constraints
4. Maintains motivation and encouragement
5. Provides concrete, actionable alternatives
6. LEARNS from their feedback to improve future suggestions

IMPORTANT: Be very specific with alternatives. If they don't like quinoa, suggest tofu, brown rice, or sweet potato. If they're allergic to chickpeas, suggest black beans, lentils, or edamame. If they're at work, suggest takeout options. If they're busy, suggest quick 5-minute alternatives.

Original Message: "${originalMessage.content}"
User Response: "${userResponse}"
Action Completed: ${actionCompleted ? 'Yes' : 'No'}

User Context:
- Recent metrics: ${JSON.stringify(userContext.recentMetrics)}
- Active goals: ${JSON.stringify(userContext.activeGoals)}
- Last check-in: ${JSON.stringify(userContext.lastCheckin)}
- Current time: ${userContext.currentTime.hour}:00 (${userContext.currentTime.isWeekend ? 'Weekend' : 'Weekday'})
- Location: ${userContext.location.isIndoors ? 'Indoors' : 'Outdoors'}
- Fitness level: ${userContext.preferences.fitnessLevel}
- Available equipment: ${userContext.preferences.equipment?.join(', ')}
- Dietary restrictions: ${userContext.preferences.dietaryRestrictions?.join(', ')}
- Favorite activities: ${userContext.preferences.favoriteActivities?.join(', ')}
- Disliked activities: ${userContext.preferences.dislikedActivities?.join(', ')}

LEARNING INSTRUCTIONS:
- If they don't like a food, suggest 3 SPECIFIC alternatives with exact ingredients
- If they're allergic to something, suggest 3 SPECIFIC safe alternatives
- If they're at work, suggest SPECIFIC takeout or quick options
- If they're busy, suggest SPECIFIC 5-minute alternatives
- If they don't have equipment, suggest SPECIFIC bodyweight alternatives
- If they're tired, suggest SPECIFIC gentle alternatives
- Remember their preferences for future suggestions

Generate a helpful, adaptive response with SPECIFIC alternatives:`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a proactive longevity coach who adapts to user feedback. Always be encouraging, offer specific alternatives, and maintain motivation.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    return response.choices[0]?.message?.content || "I understand your feedback. Let me help you find a better approach that works for you."
  } catch (error) {
    console.error('Error generating adaptive response:', error)
    return "I understand your feedback. Let me help you find a better approach that works for you."
  }
}
