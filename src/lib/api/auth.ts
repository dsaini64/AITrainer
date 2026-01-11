import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type User = Database['public']['Tables']['users']['Row']
type UserPreferences = Database['public']['Tables']['user_preferences']['Row']

export interface AuthUser extends User {
  preferences?: UserPreferences
}

// Sign up with email and password
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      }
    }
  })
  
  if (error) throw error
  return data
}

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get current user profile with preferences
export const getCurrentUserProfile = async (): Promise<AuthUser | null> => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      preferences:user_preferences(*)
    `)
    .eq('id', user.id)
    .maybeSingle()

  // If profile doesn't exist, create it
  if (profileError || !profile) {
    console.warn('User profile not found, creating one...', profileError)
    
    // Try to create the profile
    const { data: newProfile, error: createError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || '',
        name: (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'User',
        start_date: new Date().toISOString().split('T')[0]
      })
      .select(`
        *,
        preferences:user_preferences(*)
      `)
      .single()

    if (createError) {
      console.error('Error creating user profile:', createError)
      // Return a minimal profile with auth user data
      return {
        id: user.id,
        email: user.email || '',
        name: (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'User',
        start_date: new Date().toISOString().split('T')[0],
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar_url: null,
        preferences: null
      } as AuthUser
    }

    // Also create preferences if they don't exist
    if (!newProfile.preferences || (Array.isArray(newProfile.preferences) && newProfile.preferences.length === 0)) {
      await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id
        })
    }

    return {
      ...newProfile,
      preferences: Array.isArray(newProfile.preferences) ? newProfile.preferences[0] : newProfile.preferences || null
    }
  }
  
  return {
    ...profile,
    preferences: Array.isArray(profile.preferences) ? profile.preferences[0] : profile.preferences || null
  }
}

// Update user profile
export const updateUserProfile = async (updates: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Update user preferences
export const updateUserPreferences = async (updates: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw authError || new Error('No user found')
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Reset password
export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  })
  
  if (error) throw error
}

// Update password
export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  })
  
  if (error) throw error
}