'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Github, Mail } from 'lucide-react'
import Link from 'next/link'

interface AuthFormProps {
  mode: 'signin' | 'signup' | 'reset'
  onModeChange?: (mode: 'signin' | 'signup' | 'reset') => void
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const { 
    signIn, 
    signUp, 
    signInWithProvider, 
    resetPassword, 
    loading, 
    error 
  } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) {
          setMessage({ type: 'error', text: error.message })
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, {
          data: { full_name: fullName }
        })
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Check your email for a confirmation link!' 
          })
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email)
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else {
          setMessage({ 
            type: 'success', 
            text: 'Password reset email sent! Check your inbox.' 
          })
        }
      }
    } catch (_err) {
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred. Please try again.' 
      })
    }
  }

  const handleProviderSignIn = async (provider: 'google' | 'github') => {
    setMessage(null)
    const { error } = await signInWithProvider(provider)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'signin': return 'Welcome back'
      case 'signup': return 'Create your account'
      case 'reset': return 'Reset your password'
    }
  }

  const getDescription = () => {
    switch (mode) {
      case 'signin': return 'Sign in to your VibeCraft Studio account'
      case 'signup': return 'Get started with VibeCraft Studio'
      case 'reset': return 'Enter your email to receive a password reset link'
    }
  }

  const getButtonText = () => {
    switch (mode) {
      case 'signin': return 'Sign In'
      case 'signup': return 'Create Account'
      case 'reset': return 'Send Reset Link'
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Social Sign In - only show for signin and signup */}
        {mode !== 'reset' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleProviderSignIn('google')}
                disabled={loading}
                className="w-full"
              >
                <Mail className="w-4 h-4" />
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleProviderSignIn('github')}
                disabled={loading}
                className="w-full"
              >
                <Github className="w-4 h-4" />
                GitHub
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {mode !== 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          {/* Error/Success Messages */}
          {(message || error) && (
            <div className={`p-3 rounded-md text-sm ${
              message?.type === 'error' || error
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message?.text || error?.message}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Loading...' : getButtonText()}
          </Button>
        </form>

        {/* Mode switching links */}
        <div className="text-center text-sm space-y-2">
          {mode === 'signin' && (
            <>
              <div>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => onModeChange?.('signup')}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onModeChange?.('reset')}
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </>
          )}
          
          {mode === 'signup' && (
            <div>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onModeChange?.('signin')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </div>
          )}
          
          {mode === 'reset' && (
            <div>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => onModeChange?.('signin')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}