import { CoachAction } from '@/types'

export interface ActionPrompt {
  type: CoachAction['type']
  title: string
  description?: string
}

export function parseActionsFromResponse(response: string): CoachAction[] {
  const actions: CoachAction[] = []
  
  // Only create actions for specific, actionable content
  // Look for explicit action indicators that add real value
  
  // First, check if the response contains any descriptive information that shouldn't be actions
  const descriptivePatterns = [
    /age\s+\d+/gi,
    /years\s+old/gi,
    /male|female/gi,
    /white|black|asian|hispanic/gi,
    /race|gender/gi,
    /cdc\s+age/gi,
    /risk\s+score/gi,
    /total\s+risk/gi,
    /age\s+diff/gi,
    /strength\s+training:\s*\d+/gi,
    /cardio\s+exercise:\s*\d+/gi,
    /physical\s+activity:\s*\d+/gi,
    /flexibility:\s*\d+/gi,
    /sitting\s+time:\s*\d+/gi,
    /fruits\s+and\s+vegetables:\s*\d+/gi,
    /pre-packaged\s+foods:\s*\d+/gi,
    /eating\s+out:\s*\d+/gi,
    /sweetened\s+drinks:\s*\d+/gi,
    /sleep\s+regularity:\s*\d+/gi,
    /sleep\s+quality:\s*\d+/gi,
    /sleep\s+duration:\s*\d+/gi,
    /depression:\s*\d+/gi,
    /stress:\s*\d+/gi,
    /alcohol\s+intake:\s*\d+/gi,
    /smoking\s+or\s+vaping:\s*\d+/gi,
    /obesity:\s*(no|yes)\d+/gi,
    /high\s+cholesterol:\s*(no|yes)\d+/gi,
    /high\s+blood\s+pressure:\s*(no|yes)\d+/gi,
    /diabetes:\s*(no|yes)\d+/gi,
    /loneliness:\s*\d+/gi
  ]
  
  // If the response contains mostly descriptive information, don't create actions
  const hasDescriptiveContent = descriptivePatterns.some(pattern => pattern.test(response))
  const isActionableRequest = response.toLowerCase().includes('what should i do') || 
                             response.toLowerCase().includes('action') || 
                             response.toLowerCase().includes('recommend') ||
                             response.toLowerCase().includes('help me') ||
                             response.toLowerCase().includes('suggest') ||
                             response.toLowerCase().includes('advice')
  
  if (hasDescriptiveContent && !isActionableRequest) {
    return [] // Don't create actions for descriptive responses
  }
  
  // 1. Explicit checklist items with clear formatting
  const explicitChecklistMatches = response.match(/(?:☐|\[ \])\s*(.+?)(?:\n|$)/gi)
  if (explicitChecklistMatches) {
    explicitChecklistMatches.forEach((match, index) => {
      const title = match.replace(/^(?:☐|\[ \])\s*/, '').trim()
      // Only create action if it's specific, actionable, and not descriptive
      if (title && title.length > 10 && title.length < 100 && 
          !title.toLowerCase().includes('general') &&
          !title.toLowerCase().includes('consider') &&
          !title.toLowerCase().includes('think about') &&
          !title.toLowerCase().includes('years old') &&
          !title.toLowerCase().includes('age') &&
          !title.toLowerCase().includes('years') &&
          !title.toLowerCase().includes('male') &&
          !title.toLowerCase().includes('female') &&
          !title.toLowerCase().includes('white') &&
          !title.toLowerCase().includes('race') &&
          !title.toLowerCase().includes('gender') &&
          !title.toLowerCase().includes('cdc') &&
          !title.toLowerCase().includes('risk') &&
          !title.toLowerCase().includes('score') &&
          // Must contain action verbs
          (title.toLowerCase().includes('do') ||
           title.toLowerCase().includes('take') ||
           title.toLowerCase().includes('drink') ||
           title.toLowerCase().includes('eat') ||
           title.toLowerCase().includes('exercise') ||
           title.toLowerCase().includes('walk') ||
           title.toLowerCase().includes('run') ||
           title.toLowerCase().includes('stretch') ||
           title.toLowerCase().includes('meditate') ||
           title.toLowerCase().includes('practice') ||
           title.toLowerCase().includes('try') ||
           title.toLowerCase().includes('perform') ||
           title.toLowerCase().includes('include') ||
           title.toLowerCase().includes('schedule') ||
           title.toLowerCase().includes('book') ||
           title.toLowerCase().includes('set'))) {
        actions.push({
          id: `checklist-${Date.now()}-${index}`,
          type: 'checklist',
          title: title.charAt(0).toUpperCase() + title.slice(1),
          completed: false
        })
      }
    })
  }

  // 2. Specific timer activities with clear duration
  const timerMatches = response.match(/(\d+)[\s-]*(?:minute|min|hour|hr)s?\s+(?:timer|set timer|do|practice|try|walk|run|meditate|stretch|exercise)\s+(.+?)(?:\n|$)/gi)
  if (timerMatches) {
    timerMatches.forEach((match, index) => {
      const parts = match.match(/(\d+)[\s-]*(?:minute|min|hour|hr)s?\s+(?:timer|set timer|do|practice|try|walk|run|meditate|stretch|exercise)\s+(.+)/)
      if (parts) {
        const duration = parts[1]
        const activity = parts[2].trim()
        // Only create timer for specific activities
        if (activity && activity.length > 5 && activity.length < 80) {
          actions.push({
            id: `timer-${Date.now()}-${index}`,
            type: 'timer',
            title: `${duration}-minute ${activity}`,
            description: `Set a timer for ${duration} minutes`,
            completed: false
          })
        }
      }
    })
  }

  // 3. Specific reminders with clear action items
  const reminderMatches = response.match(/(?:remind me to|remember to|don't forget to)\s+(.+?)(?:\n|$)/gi)
  if (reminderMatches) {
    reminderMatches.forEach((match, index) => {
      const title = match.replace(/^(?:remind me to|remember to|don't forget to)\s+/, '').trim()
      // Only create reminder for specific, actionable items
      if (title && title.length > 10 && title.length < 100 &&
          !title.toLowerCase().includes('general') &&
          !title.toLowerCase().includes('consider')) {
        actions.push({
          id: `reminder-${Date.now()}-${index}`,
          type: 'reminder',
          title: title.charAt(0).toUpperCase() + title.slice(1),
          completed: false
        })
      }
    })
  }

  // 4. Specific scheduling items
  const scheduleMatches = response.match(/(?:schedule|book|set up|plan)\s+(?:a|an|the)?\s*(.+?)(?:\n|$)/gi)
  if (scheduleMatches) {
    scheduleMatches.forEach((match, index) => {
      const title = match.replace(/^(?:schedule|book|set up|plan)\s+(?:a|an|the)?\s*/, '').trim()
      // Only create schedule for specific, bookable items
      if (title && title.length > 10 && title.length < 100 &&
          (title.toLowerCase().includes('appointment') ||
           title.toLowerCase().includes('meeting') ||
           title.toLowerCase().includes('class') ||
           title.toLowerCase().includes('session') ||
           title.toLowerCase().includes('checkup'))) {
        actions.push({
          id: `schedule-${Date.now()}-${index}`,
          type: 'schedule',
          title: title.charAt(0).toUpperCase() + title.slice(1),
          completed: false
        })
      }
    })
  }

  // Only return actions if they add real value (max 3 actions)
  return actions.slice(0, 3)
}

export function generateActionPrompts(mode: string, userMessage: string): string {
  // Only suggest actions for specific, actionable requests
  const isActionableRequest = userMessage.toLowerCase().includes('what should i do') ||
                             userMessage.toLowerCase().includes('help me') ||
                             userMessage.toLowerCase().includes('action') ||
                             userMessage.toLowerCase().includes('plan') ||
                             userMessage.toLowerCase().includes('schedule') ||
                             userMessage.toLowerCase().includes('remind') ||
                             userMessage.toLowerCase().includes('timer')

  if (!isActionableRequest) {
    return "Provide helpful information without creating action buttons unless specifically requested."
  }

  const basePrompt = "If the user is asking for specific actions, provide actionable recommendations using clear formatting:"

  switch (mode) {
    case 'plan':
      return `${basePrompt}
- Use explicit checkboxes (☐) for specific action items
- Include specific timeframes when suggesting timers (e.g., "Set a 20-minute timer for walking")
- Use "Remind me to..." for important follow-ups
- Use "Schedule a..." for appointments or activities`

    case 'checkin':
      return `${basePrompt}
- Create checklists for specific daily habits (☐ Drink 8 glasses of water)
- Suggest timers for specific activities (Set a 10-minute timer for meditation)
- Include specific reminders (Remind me to track my sleep)
- Recommend specific scheduling (Schedule a follow-up check-in)`

    case 'motivate':
      return `${basePrompt}
- Provide specific actionable steps (☐ Take a 5-minute walk)
- Suggest specific short-term challenges (Set a 15-minute timer for stretching)
- Include specific reminders (Remind me to celebrate small wins)
- Recommend specific scheduling (Schedule a reward activity)`

    case 'explain':
      return `${basePrompt}
- Create specific implementation checklists (☐ Try the breathing technique)
- Suggest specific practice timers (Set a 5-minute timer for practice)
- Include specific learning reminders (Remind me to research this topic)
- Recommend specific scheduling (Schedule time to apply this knowledge)`

    default:
      return basePrompt
  }
}

export function extractCitations(response: string): string[] {
  const citations: string[] = []
  
  // Look for citation patterns
  const citationPatterns = [
    /\[([^\]]+)\]/g, // [Citation Name]
    /\(([^)]+(?:study|research|journal|paper|article)[^)]*)\)/gi, // (Study Name)
    /(?:according to|based on|research shows|studies indicate)\s+([^.]+)/gi,
    /(?:source|reference|citation):\s*([^.\n]+)/gi
  ]

  citationPatterns.forEach(pattern => {
    const matches = response.match(pattern)
    if (matches) {
      matches.forEach(match => {
        let citation = match.replace(/[\[\]()]/g, '').trim()
        citation = citation.replace(/^(?:according to|based on|research shows|studies indicate|source|reference|citation):\s*/i, '')
        
        if (citation.length > 5 && citation.length < 100) {
          citations.push(citation)
        }
      })
    }
  })

  // Remove duplicates and limit to 5
  return [...new Set(citations)].slice(0, 5)
}