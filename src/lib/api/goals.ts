import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type Goal = Database['public']['Tables']['goals']['Row']
type Habit = Database['public']['Tables']['habits']['Row']
type GoalInsert = Database['public']['Tables']['goals']['Insert']
type HabitInsert = Database['public']['Tables']['habits']['Insert']
type GoalUpdate = Database['public']['Tables']['goals']['Update']
type HabitUpdate = Database['public']['Tables']['habits']['Update']

export interface GoalWithHabits extends Goal {
  habits: Habit[]
}

// Get all goals for the current user
export const getGoals = async (includeInactive = false): Promise<GoalWithHabits[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  let query = supabase
    .from('goals')
    .select(`
      *,
      habits(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get a single goal by ID
export const getGoal = async (goalId: string): Promise<GoalWithHabits | null> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      habits(*)
    `)
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data
}

// Create a new goal
export const createGoal = async (goalData: Omit<GoalInsert, 'user_id'>): Promise<Goal> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      ...goalData,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update a goal
export const updateGoal = async (goalId: string, updates: GoalUpdate): Promise<Goal> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a goal (soft delete by setting is_active to false)
export const deleteGoal = async (goalId: string): Promise<void> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { error } = await supabase
    .from('goals')
    .update({ is_active: false })
    .eq('id', goalId)
    .eq('user_id', user.id)

  if (error) throw error
}

// Get goals by category
export const getGoalsByCategory = async (category: Database['public']['Enums']['goal_category']): Promise<GoalWithHabits[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('goals')
    .select(`
      *,
      habits(*)
    `)
    .eq('user_id', user.id)
    .eq('category', category)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Create a habit for a goal
export const createHabit = async (habitData: Omit<HabitInsert, 'goal_id'>, goalId: string): Promise<Habit> => {
  const { data, error } = await supabase
    .from('habits')
    .insert({
      ...habitData,
      goal_id: goalId
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update a habit
export const updateHabit = async (habitId: string, updates: HabitUpdate): Promise<Habit> => {
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a habit (soft delete)
export const deleteHabit = async (habitId: string): Promise<void> => {
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId)

  if (error) throw error
}

// Calculate and update habit adherence
export const updateHabitAdherence = async (habitId: string, daysBack = 30): Promise<number> => {
  const { data, error } = await supabase
    .rpc('calculate_habit_adherence', {
      habit_uuid: habitId,
      days_back: daysBack
    })

  if (error) throw error

  // Update the habit with the new adherence
  await supabase
    .from('habits')
    .update({ adherence: data })
    .eq('id', habitId)

  return data
}

// Update habit streak
export const updateHabitStreak = async (habitId: string): Promise<number> => {
  const { data, error } = await supabase
    .rpc('update_habit_streak', {
      habit_uuid: habitId
    })

  if (error) throw error
  return data
}