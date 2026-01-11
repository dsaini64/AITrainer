import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type CheckIn = Database['public']['Tables']['check_ins']['Row']
type CheckInInsert = Database['public']['Tables']['check_ins']['Insert']
type CheckInUpdate = Database['public']['Tables']['check_ins']['Update']

// Get check-ins for the current user
export const getCheckIns = async (
  startDate?: Date,
  endDate?: Date,
  limit = 30
): Promise<CheckIn[]> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  let query = supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('date', startDate.toISOString().split('T')[0])
  }

  if (endDate) {
    query = query.lte('date', endDate.toISOString().split('T')[0])
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Get check-in for a specific date
export const getCheckInByDate = async (date: Date): Promise<CheckIn | null> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const dateString = date.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', dateString)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    throw error
  }

  return data || null
}

// Get today's check-in
export const getTodaysCheckIn = async (): Promise<CheckIn | null> => {
  return getCheckInByDate(new Date())
}

// Create or update a check-in
export const upsertCheckIn = async (
  checkInData: Omit<CheckInInsert, 'user_id'>,
  date?: Date
): Promise<CheckIn> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const checkInDate = date || new Date()
  const dateString = checkInDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('check_ins')
    .upsert({
      ...checkInData,
      user_id: user.id,
      date: dateString
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Update a check-in
export const updateCheckIn = async (
  checkInId: string,
  updates: CheckInUpdate
): Promise<CheckIn> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('check_ins')
    .update(updates)
    .eq('id', checkInId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a check-in
export const deleteCheckIn = async (checkInId: string): Promise<void> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { error } = await supabase
    .from('check_ins')
    .delete()
    .eq('id', checkInId)
    .eq('user_id', user.id)

  if (error) throw error
}

// Get check-in statistics
export const getCheckInStats = async (daysBack = 30): Promise<{
  averageMood: number
  averageEnergy: number
  averageSoreness: number
  checkInStreak: number
  totalCheckIns: number
  moodTrend: 'up' | 'down' | 'stable'
  energyTrend: 'up' | 'down' | 'stable'
}> => {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - (daysBack * 24 * 60 * 60 * 1000))
  
  const checkIns = await getCheckIns(startDate, endDate, daysBack)
  
  if (checkIns.length === 0) {
    return {
      averageMood: 0,
      averageEnergy: 0,
      averageSoreness: 0,
      checkInStreak: 0,
      totalCheckIns: 0,
      moodTrend: 'stable',
      energyTrend: 'stable'
    }
  }

  // Calculate averages
  const validMoods = checkIns.filter(c => c.mood !== null).map(c => c.mood!)
  const validEnergies = checkIns.filter(c => c.energy !== null).map(c => c.energy!)
  const validSoreness = checkIns.filter(c => c.soreness !== null).map(c => c.soreness!)

  const averageMood = validMoods.length > 0 
    ? validMoods.reduce((sum, val) => sum + val, 0) / validMoods.length 
    : 0

  const averageEnergy = validEnergies.length > 0
    ? validEnergies.reduce((sum, val) => sum + val, 0) / validEnergies.length
    : 0

  const averageSoreness = validSoreness.length > 0
    ? validSoreness.reduce((sum, val) => sum + val, 0) / validSoreness.length
    : 0

  // Calculate streak (consecutive days with check-ins from today backwards)
  let checkInStreak = 0
  const today = new Date()
  
  for (let i = 0; i < daysBack; i++) {
    const checkDate = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000))
    const dateString = checkDate.toISOString().split('T')[0]
    
    const hasCheckIn = checkIns.some(c => c.date === dateString)
    
    if (hasCheckIn) {
      checkInStreak++
    } else {
      break // Streak broken
    }
  }

  // Calculate trends (first half vs second half)
  const midPoint = Math.floor(checkIns.length / 2)
  const firstHalf = checkIns.slice(midPoint)
  const secondHalf = checkIns.slice(0, midPoint)

  const calculateTrend = (firstHalf: CheckIn[], secondHalf: CheckIn[], field: 'mood' | 'energy') => {
    const firstAvg = firstHalf.filter(c => c[field] !== null).length > 0
      ? firstHalf.filter(c => c[field] !== null).reduce((sum, c) => sum + c[field]!, 0) / firstHalf.filter(c => c[field] !== null).length
      : 0

    const secondAvg = secondHalf.filter(c => c[field] !== null).length > 0
      ? secondHalf.filter(c => c[field] !== null).reduce((sum, c) => sum + c[field]!, 0) / secondHalf.filter(c => c[field] !== null).length
      : 0

    if (firstAvg === 0) return 'stable'
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100
    
    if (Math.abs(changePercent) > 10) { // 10% threshold
      return changePercent > 0 ? 'up' : 'down'
    }
    
    return 'stable'
  }

  const moodTrend = calculateTrend(firstHalf, secondHalf, 'mood')
  const energyTrend = calculateTrend(firstHalf, secondHalf, 'energy')

  return {
    averageMood,
    averageEnergy,
    averageSoreness,
    checkInStreak,
    totalCheckIns: checkIns.length,
    moodTrend,
    energyTrend
  }
}