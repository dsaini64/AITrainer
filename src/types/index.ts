export interface User {
  id: string
  name: string
  email: string
  startDate: Date
  preferences: UserPreferences
}

export interface UserPreferences {
  units: 'metric' | 'imperial'
  timeFormat: '12h' | '24h'
  quietHours: {
    start: string
    end: string
  }
  notifications: {
    morning: boolean
    evening: boolean
    nudges: boolean
  }
}

export interface Goal {
  id: string
  category: 'sleep' | 'movement' | 'nutrition' | 'stress' | 'body' | 'cognitive'
  title: string
  description: string
  target: number
  unit: string
  baseline: number
  isActive: boolean
  createdAt: Date
  habits: Habit[]
}

export interface Habit {
  id: string
  goalId: string
  title: string
  description: string
  level: 'starter' | 'solid' | 'stretch'
  frequency: 'daily' | 'weekly' | 'custom'
  targetValue: number
  unit: string
  adherence: number
  streak: number
  isActive: boolean
}

export interface Metric {
  id: string
  type: 'sleep_duration' | 'sleep_efficiency' | 'hrv' | 'resting_hr' | 'steps' | 'zone2_minutes' | 'protein' | 'hydration' | 'mood' | 'energy' | 'weight'
  value: number
  unit: string
  timestamp: Date
  source: string
  quality: 'high' | 'medium' | 'low'
}

export interface CheckIn {
  id: string
  date: Date
  mood: number
  energy: number
  soreness: number
  cravings: boolean
  alcoholUnits: number
  notes?: string
  gratitude?: string
  winOfDay?: string
}

export interface CoachMessage {
  id: string
  type: 'user' | 'coach'
  content: string
  timestamp: Date
  mode?: 'explain' | 'plan' | 'motivate' | 'checkin'
  actions?: CoachAction[]
  citations?: string[]
  isSafetyCard?: boolean
}

export interface CoachAction {
  id: string
  type: 'checklist' | 'timer' | 'reminder' | 'schedule'
  title: string
  description?: string
  completed: boolean
}

export interface Device {
  id: string
  name: string
  type: 'wearable' | 'scale' | 'app'
  status: 'connected' | 'syncing' | 'attention' | 'disconnected'
  lastSync: Date
  dataQuality: 'high' | 'medium' | 'low'
}

export interface Program {
  id: string
  title: string
  description: string
  duration: number // weeks
  category: string
  weeks: ProgramWeek[]
  adherence: number
  isActive: boolean
}

export interface ProgramWeek {
  week: number
  tasks: ProgramTask[]
  reading?: string[]
  review?: string
}

export interface ProgramTask {
  id: string
  type: 'nutrition' | 'training' | 'recovery' | 'mindset'
  title: string
  description: string
  completed: boolean
  dueDate?: Date
}