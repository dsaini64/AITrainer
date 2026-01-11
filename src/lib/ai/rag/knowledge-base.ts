/**
 * Knowledge Base Content
 * 
 * Curated health, fitness, and longevity knowledge for RAG
 */

import { Document } from './vector-store'
import { getVectorStore } from './vector-store'

export const KNOWLEDGE_BASE_CONTENT: Document[] = [
  // Nutrition & Diet
  {
    id: 'nutrition-protein',
    content: `Protein is essential for muscle maintenance, especially as we age. Aim for 1.6-2.2g per kg of body weight daily. High-quality sources include lean meats, fish, eggs, dairy, legumes, and plant-based proteins. Protein timing matters - spreading intake throughout the day (20-30g per meal) is more effective than consuming most at one meal.`,
    metadata: {
      type: 'knowledge_base',
      category: 'nutrition',
      source: 'Longevity Research',
      tags: ['protein', 'muscle', 'aging', 'diet']
    }
  },
  {
    id: 'nutrition-anti-inflammatory',
    content: `Anti-inflammatory foods can reduce chronic inflammation linked to aging. Focus on: fatty fish (salmon, mackerel), leafy greens, berries, nuts, olive oil, and whole grains. Avoid processed foods, refined sugars, and excessive alcohol. The Mediterranean diet pattern is particularly effective for reducing inflammation.`,
    metadata: {
      type: 'knowledge_base',
      category: 'nutrition',
      source: 'Nutrition Science',
      tags: ['inflammation', 'diet', 'longevity', 'health']
    }
  },
  {
    id: 'nutrition-hydration',
    content: `Proper hydration is crucial for healthspan. Aim for 30-35ml per kg body weight daily, adjusting for activity and climate. Water is best, but herbal teas and water-rich foods count. Signs of dehydration include dark urine, fatigue, and headaches. Older adults may have reduced thirst sensation, so regular hydration reminders help.`,
    metadata: {
      type: 'knowledge_base',
      category: 'nutrition',
      source: 'Hydration Research',
      tags: ['hydration', 'water', 'health']
    }
  },

  // Exercise & Fitness
  {
    id: 'exercise-strength-training',
    content: `Strength training is critical for longevity. It preserves muscle mass, bone density, and metabolic health. Aim for 2-3 sessions per week, focusing on compound movements (squats, deadlifts, presses). Even 15-20 minutes can be effective. Progressive overload is key - gradually increase weight or reps over time.`,
    metadata: {
      type: 'knowledge_base',
      category: 'exercise',
      source: 'Exercise Science',
      tags: ['strength', 'muscle', 'longevity', 'fitness']
    }
  },
  {
    id: 'exercise-cardio',
    content: `Cardiovascular exercise improves heart health, cognitive function, and longevity. Aim for 150 minutes of moderate-intensity or 75 minutes of vigorous-intensity weekly. Zone 2 training (conversational pace) is particularly beneficial for mitochondrial health. Activities include walking, cycling, swimming, and running.`,
    metadata: {
      type: 'knowledge_base',
      category: 'exercise',
      source: 'Cardiology Research',
      tags: ['cardio', 'heart', 'endurance', 'health']
    }
  },
  {
    id: 'exercise-recovery',
    content: `Recovery is as important as training. Allow 48 hours between intense strength sessions for the same muscle groups. Monitor HRV (heart rate variability) and resting heart rate - elevated values may indicate overtraining. Sleep quality directly impacts recovery. Active recovery (light walking, stretching) can aid the process.`,
    metadata: {
      type: 'knowledge_base',
      category: 'exercise',
      source: 'Sports Science',
      tags: ['recovery', 'rest', 'overtraining', 'performance']
    }
  },

  // Sleep
  {
    id: 'sleep-quality',
    content: `Sleep quality matters more than quantity for many. Aim for 7-9 hours, but prioritize consistency. Maintain a regular sleep schedule, even on weekends. Create a dark, cool (18-20°C), quiet environment. Avoid screens 2 hours before bed. Blue light exposure disrupts melatonin production.`,
    metadata: {
      type: 'knowledge_base',
      category: 'sleep',
      source: 'Sleep Medicine',
      tags: ['sleep', 'recovery', 'health', 'circadian']
    }
  },
  {
    id: 'sleep-circadian',
    content: `Circadian rhythm alignment is crucial for healthspan. Get morning sunlight exposure (10-30 minutes) to reset your internal clock. Avoid bright lights in the evening. Meal timing affects circadian rhythm - try to eat within a 10-12 hour window. Shift work and jet lag disrupt circadian rhythms significantly.`,
    metadata: {
      type: 'knowledge_base',
      category: 'sleep',
      source: 'Chronobiology Research',
      tags: ['circadian', 'sleep', 'rhythm', 'health']
    }
  },

  // Stress Management
  {
    id: 'stress-management',
    content: `Chronic stress accelerates aging through inflammation and hormonal changes. Effective strategies include: meditation (10-20 min daily), deep breathing exercises, regular exercise, social connection, and time in nature. HRV biofeedback can help monitor stress levels. Chronic stress requires professional support.`,
    metadata: {
      type: 'knowledge_base',
      category: 'stress',
      source: 'Stress Research',
      tags: ['stress', 'mental health', 'longevity', 'wellbeing']
    }
  },
  {
    id: 'stress-breathing',
    content: `Controlled breathing techniques can reduce stress quickly. Try 4-7-8 breathing: inhale for 4 counts, hold for 7, exhale for 8. Repeat 4 times. Box breathing (4-4-4-4) is also effective. These techniques activate the parasympathetic nervous system, reducing cortisol and promoting relaxation.`,
    metadata: {
      type: 'knowledge_base',
      category: 'stress',
      source: 'Mindfulness Research',
      tags: ['breathing', 'stress', 'relaxation', 'techniques']
    }
  },

  // Longevity Principles
  {
    id: 'longevity-principles',
    content: `Longevity optimization focuses on healthspan, not just lifespan. Key pillars: nutrition (whole foods, adequate protein), exercise (strength + cardio), sleep (quality and consistency), stress management, social connection, and avoiding harmful substances. Regular health monitoring helps track progress.`,
    metadata: {
      type: 'knowledge_base',
      category: 'longevity',
      source: 'Longevity Research',
      tags: ['longevity', 'healthspan', 'principles', 'optimization']
    }
  },
  {
    id: 'longevity-metrics',
    content: `Key longevity metrics to track: VO2 max (cardiorespiratory fitness), muscle mass, bone density, HRV, resting heart rate, blood pressure, blood glucose, inflammation markers (CRP), and cognitive function. Regular monitoring helps identify issues early and track improvement.`,
    metadata: {
      type: 'knowledge_base',
      category: 'longevity',
      source: 'Biomarker Research',
      tags: ['metrics', 'monitoring', 'health', 'longevity']
    }
  },

  // Meal Timing
  {
    id: 'meal-timing',
    content: `Meal timing affects metabolism and circadian rhythm. Time-restricted eating (12-14 hour window) can improve metabolic health. Protein at breakfast supports muscle maintenance. Avoid large meals close to bedtime - finish eating 2-3 hours before sleep. Consistent meal times help regulate circadian rhythms.`,
    metadata: {
      type: 'knowledge_base',
      category: 'nutrition',
      source: 'Chrononutrition Research',
      tags: ['meal timing', 'metabolism', 'circadian', 'nutrition']
    }
  },

  // Exercise for Older Adults
  {
    id: 'exercise-aging',
    content: `Exercise adaptations for older adults: focus on balance and flexibility (yoga, tai chi), maintain strength training (lighter weights, more reps if needed), include low-impact cardio (walking, swimming), prioritize recovery time, and listen to your body. Even small amounts of activity provide significant benefits.`,
    metadata: {
      type: 'knowledge_base',
      category: 'exercise',
      source: 'Geriatric Exercise Science',
      tags: ['aging', 'exercise', 'safety', 'adaptation']
    }
  }
]

/**
 * Initialize knowledge base with embeddings
 */
export async function initializeKnowledgeBase(): Promise<void> {
  const vectorStore = getVectorStore()
  
  try {
    // Check if knowledge base already has content
    const existing = await vectorStore.search('protein', { limit: 1 })
    
    if (existing && existing.length > 0) {
      console.log('Knowledge base already initialized')
      return
    }

    // Store all knowledge base documents
    console.log(`Initializing knowledge base with ${KNOWLEDGE_BASE_CONTENT.length} documents...`)
    const ids = await vectorStore.storeDocuments(KNOWLEDGE_BASE_CONTENT)
    console.log(`Knowledge base initialized with ${ids.length} documents`)
  } catch (error) {
    console.error('Error initializing knowledge base:', error)
    throw error
  }
}

