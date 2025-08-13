'use client'

import { useAuth } from '@/hooks/use-auth'
import { UserProfile } from '@/components/auth/user-profile'
import { ProjectDashboard } from '@/components/project/project-dashboard'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = () => {
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null // Middleware will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between py-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user.user_metadata?.full_name || 'Developer'}!</h1>
            <p className="text-muted-foreground">
              Your AI-powered web development workspace
            </p>
          </div>
          <div className="hidden lg:block">
            <UserProfile onSignOut={handleSignOut} />
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Project Dashboard - Main Content */}
          <div className="lg:col-span-4">
            <ProjectDashboard />
          </div>
        </div>

        {/* Mobile User Profile */}
        <div className="lg:hidden">
          <UserProfile onSignOut={handleSignOut} />
        </div>
      </div>
    </div>
  )
}