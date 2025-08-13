'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { User, Mail, LogOut, Key } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserProfileProps {
  onSignOut?: () => void
}

export function UserProfile({ onSignOut }: UserProfileProps) {
  const { user, updateProfile, signOut, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const { error } = await updateProfile({
      full_name: fullName,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setIsEditing(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (!error) {
      onSignOut?.()
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!user) {
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="w-20 h-20">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-lg">
              {user.user_metadata?.full_name 
                ? getInitials(user.user_metadata.full_name)
                : <User className="w-8 h-8" />
              }
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">
          {user.user_metadata?.full_name || 'User Profile'}
        </CardTitle>
        <CardDescription className="flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" />
          {user.email}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Profile Information */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Profile Information</h3>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
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

              {message && (
                <div className={`p-3 rounded-md text-sm ${
                  message.type === 'error'
                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setFullName(user.user_metadata?.full_name || '')
                    setMessage(null)
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{user.user_metadata?.full_name || 'No name set'}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Account Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Account</h3>
          
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.location.href = '/auth/reset-password'}
          >
            <Key className="w-4 h-4 mr-2" />
            Change Password
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleSignOut}
            disabled={loading}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {loading ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}