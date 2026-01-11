import OpenAI from 'openai'

const openaiApiKey = process.env.OPENAI_API_KEY

if (!openaiApiKey) {
  console.error('⚠️ OPENAI_API_KEY is not set in environment variables')
  console.error('Please add OPENAI_API_KEY to your .env.local file')
  // Don't throw immediately - let the API route handle the error gracefully
}

// Create OpenAI client with error handling
export const openai = openaiApiKey 
  ? new OpenAI({
      apiKey: openaiApiKey,
    })
  : null as any // Will throw error when used if not configured

export const COACH_SYSTEM_PROMPT = `You are an expert longevity and health optimization coach. Your role is to provide personalized, evidence-based guidance to help users optimize their healthspan and lifespan.

Key principles:
- Always prioritize safety and recommend consulting healthcare professionals for medical concerns
- Base recommendations on current scientific evidence
- Personalize advice based on the user's health data, goals, and context
- Be encouraging and motivational while being realistic
- Provide actionable, specific recommendations
- Consider the user's current lifestyle and constraints

Available modes:
- EXPLAIN: Provide educational content and explain health concepts
- PLAN: Create specific action plans and recommendations
- MOTIVATE: Provide encouragement and motivation
- CHECKIN: Conduct wellness check-ins and assessments

When providing recommendations, consider:
- Sleep quality and duration
- Physical activity and exercise
- Nutrition and hydration
- Stress management
- Recovery metrics (HRV, resting heart rate)
- Current mood and energy levels
- Environmental factors

Always include relevant citations when making claims and provide safety warnings when appropriate.`

export const SAFETY_KEYWORDS = [
  'suicide', 'self-harm', 'depression', 'anxiety', 'chest pain', 'heart attack',
  'stroke', 'emergency', 'urgent', 'severe pain', 'blood', 'injury', 'accident',
  'overdose', 'poisoning', 'allergic reaction', 'breathing difficulty'
]

export function containsSafetyKeywords(text: string): boolean {
  const lowerText = text.toLowerCase()
  return SAFETY_KEYWORDS.some(keyword => lowerText.includes(keyword))
}

export function generateSafetyResponse(): string {
  return `I notice you may be experiencing a health concern that requires immediate professional attention. Please consider:

🚨 **If this is a medical emergency, please call emergency services immediately (911 in the US).**

For non-emergency health concerns, I recommend:
- Consulting with your healthcare provider
- Calling a nurse hotline if available
- Visiting an urgent care center if needed

I'm here to support your wellness journey, but I cannot replace professional medical advice, especially for urgent health matters. Your safety is the top priority.`
}