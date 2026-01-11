'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AuthUser, getCurrentUserProfile } from '@/lib/api/auth'

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    try {
      const profile = await getCurrentUserProfile()
      setUser(profile)
    } catch (error) {
      console.error('Error refreshing profile:', error)
      setUser(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    // Profile will be loaded by the auth state change listener
  }

  const signUp = async (email: string, password: string, name: string) => {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      const error = new Error('Supabase is not configured. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.')
      console.error('Supabase configuration error:', error.message)
      throw error
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0] // Fallback to email username if no name
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/signin` : undefined
        }
      })
      
      if (error) {
        console.error('Supabase signup error:', error)
        
        // Provide more helpful error messages
        if (error.message.includes('fetch')) {
          throw new Error('Unable to connect to authentication service. Please check your internet connection and Supabase configuration.')
        }
        
        throw error
      }
      
      // If email confirmation is disabled, user is immediately signed in
      // Profile will be created by the database trigger
      if (data?.user && data?.session) {
        // User is immediately signed in (email confirmation disabled)
        // Wait a bit for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 500))
        try {
          await refreshProfile()
        } catch (profileError) {
          console.warn('Profile not yet created, will be available after email confirmation:', profileError)
        }
      }
    } catch (error: any) {
      // Handle network errors
      if (error?.message?.includes('fetch') || error?.message?.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to authentication service. Please check your internet connection and ensure Supabase is properly configured.')
      }
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    setUser(null)
    setSession(null)
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
        setLoading(false)
        return
      }
      
      setSession(session)
      
      if (session?.user) {
        try {
          const profile = await getCurrentUserProfile()
          if (profile) {
            setUser(profile)
          } else {
            console.warn('Profile is null, user may not be fully set up')
            // Create a minimal user object from auth data
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: (session.user.user_metadata?.name as string) || session.user.email?.split('@')[0] || 'User',
              start_date: new Date().toISOString().split('T')[0],
              created_at: session.user.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: null,
              preferences: null
            })
          }
        } catch (error) {
          console.error('Error loading profile:', error)
          // Create a minimal user object from auth data as fallback
          if (session.user) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              name: (session.user.user_metadata?.name as string) || session.user.email?.split('@')[0] || 'User',
              start_date: new Date().toISOString().split('T')[0],
              created_at: session.user.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              avatar_url: null,
              preferences: null
            })
          } else {
            setUser(null)
          }
        }
      } else {
        setUser(null)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        setSession(session)
        
        if (session?.user) {
          try {
            // Small delay to ensure database trigger has completed
            if (event === 'SIGNED_IN') {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
            const profile = await getCurrentUserProfile()
            if (profile) {
              setUser(profile)
            } else {
              console.warn('Profile is null after auth change, creating minimal user')
              // Create a minimal user object from auth data
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: (session.user.user_metadata?.name as string) || session.user.email?.split('@')[0] || 'User',
                start_date: new Date().toISOString().split('T')[0],
                created_at: session.user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                avatar_url: null,
                preferences: null
              })
            }
          } catch (error) {
            console.error('Error loading profile after auth change:', error)
            // Create a minimal user object from auth data as fallback
            if (session.user) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: (session.user.user_metadata?.name as string) || session.user.email?.split('@')[0] || 'User',
                start_date: new Date().toISOString().split('T')[0],
                created_at: session.user.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                avatar_url: null,
                preferences: null
              })
            } else {
              setUser(null)
            }
          }
        } else {
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}