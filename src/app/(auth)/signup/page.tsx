'use client'

import { useState } from 'react'
import { AuthForm } from '@/components/auth/auth-form'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'

export default function SignupPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signup')
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null
  }

  return <AuthForm mode={mode} onModeChange={setMode} />
}