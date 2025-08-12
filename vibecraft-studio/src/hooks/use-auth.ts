'use client'

import { useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setAuthState(prev => ({ ...prev, error, loading: false }))
          return
        }

        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        })
      } catch (error) {
        setAuthState(prev => ({ 
          ...prev, 
          error: error as AuthError, 
          loading: false 
        }))
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        })

        // Handle sign in - create user profile if it doesn't exist
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            // Check if user profile exists
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single()

            // Create user profile if it doesn't exist
            if (!existingUser) {
              const { error: insertError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: session.user.email!,
                  full_name: session.user.user_metadata?.full_name || 
                           session.user.user_metadata?.name || 
                           null,
                  avatar_url: session.user.user_metadata?.avatar_url || null,
                })

              if (insertError) {
                console.error('Error creating user profile:', insertError)
              }
            }
          } catch (error) {
            console.error('Error handling sign in:', error)
          }
        }

        // Refresh the page to update server-side auth state
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signUp = async (email: string, password: string, options?: {
    data?: {
      full_name?: string
    }
  }) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: options?.data,
      },
    })

    if (error) {
      setAuthState(prev => ({ ...prev, error, loading: false }))
      return { data: null, error }
    }

    return { data, error: null }
  }

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setAuthState(prev => ({ ...prev, error, loading: false }))
      return { data: null, error }
    }

    return { data, error: null }
  }

  const signInWithProvider = async (provider: 'google' | 'github') => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setAuthState(prev => ({ ...prev, error, loading: false }))
      return { data: null, error }
    }

    return { data, error: null }
  }

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    const { error } = await supabase.auth.signOut()

    if (error) {
      setAuthState(prev => ({ ...prev, error, loading: false }))
      return { error }
    }

    return { error: null }
  }

  const resetPassword = async (email: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setAuthState(prev => ({ ...prev, loading: false }))

    if (error) {
      setAuthState(prev => ({ ...prev, error }))
      return { data: null, error }
    }

    return { data, error: null }
  }

  const updatePassword = async (password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))
    
    const { data, error } = await supabase.auth.updateUser({
      password,
    })

    setAuthState(prev => ({ ...prev, loading: false }))

    if (error) {
      setAuthState(prev => ({ ...prev, error }))
      return { data: null, error }
    }

    return { data, error: null }
  }

  const updateProfile = async (updates: {
    full_name?: string
    avatar_url?: string
  }) => {
    if (!authState.user) {
      return { data: null, error: new Error('No user logged in') }
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }))

    // Update auth metadata
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: updates,
    })

    if (authError) {
      setAuthState(prev => ({ ...prev, error: authError, loading: false }))
      return { data: null, error: authError }
    }

    // Update user profile in database
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', authState.user.id)
      .select()
      .single()

    setAuthState(prev => ({ ...prev, loading: false }))

    if (error) {
      const authError = new Error(error.message) as AuthError
      setAuthState(prev => ({ ...prev, error: authError }))
      return { data: null, error }
    }

    return { data, error: null }
  }

  return {
    ...authState,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  }
}