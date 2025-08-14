'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project, useProjects } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
// import { cn } from '@/lib/utils'
import {
  Menu,
  ChevronDown,
  Plus,
  Clock,
  Folder,
  ArrowLeft
} from 'lucide-react'

interface ProjectHeaderProps {
  project: Project
  sidebarOpen?: boolean
  onToggleSidebar: () => void
}

export function ProjectHeader({
  project,
  onToggleSidebar
}: ProjectHeaderProps) {
  const router = useRouter()
  const { projects } = useProjects()
  const [recentProjects, setRecentProjects] = useState<Project[]>([])

  // Get recent projects from localStorage and filter current project
  useEffect(() => {
    const recent = localStorage.getItem('recent-projects')
    if (recent) {
      try {
        const recentIds = JSON.parse(recent) as string[]
        const recentProjectsList = recentIds
          .map(id => projects.find(p => p.id === id))
          .filter((p): p is Project => p !== undefined && p.id !== project.id)
          .slice(0, 5) // Show max 5 recent projects
        setRecentProjects(recentProjectsList)
      } catch (error) {
        console.error('Error parsing recent projects:', error)
      }
    }
  }, [projects, project.id])

  // Add current project to recent projects
  useEffect(() => {
    const recent = localStorage.getItem('recent-projects')
    let recentIds: string[] = []
    
    if (recent) {
      try {
        recentIds = JSON.parse(recent)
      } catch (error) {
        console.error('Error parsing recent projects:', error)
      }
    }

    // Remove current project if it exists and add it to the beginning
    recentIds = recentIds.filter(id => id !== project.id)
    recentIds.unshift(project.id)
    
    // Keep only the last 10 projects
    recentIds = recentIds.slice(0, 10)
    
    localStorage.setItem('recent-projects', JSON.stringify(recentIds))
  }, [project.id])

  const handleProjectSwitch = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const handleNewProject = () => {
    router.push('/dashboard?create=true')
  }

  const userRole = project.project_members?.find(
    member => member.user_id === project.user_id
  )?.role || 'owner'

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Mobile sidebar toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="md:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Back to Dashboard */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToDashboard}
          className="hidden md:flex"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Dashboard
        </Button>

        {/* Project Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 max-w-xs">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {project.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {project.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  Switch project
                </span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>Current Project</DropdownMenuLabel>
            <DropdownMenuItem className="flex items-center gap-3 p-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {project.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{project.name}</div>
                {project.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {project.description}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                {userRole}
              </Badge>
            </DropdownMenuItem>

            {recentProjects.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Projects
                </DropdownMenuLabel>
                {recentProjects.map((recentProject) => (
                  <DropdownMenuItem
                    key={recentProject.id}
                    onClick={() => handleProjectSwitch(recentProject.id)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {recentProject.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{recentProject.name}</div>
                      {recentProject.description && (
                        <div className="text-sm text-muted-foreground truncate">
                          {recentProject.description}
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleNewProject}
              className="flex items-center gap-2 p-3 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create New Project
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 p-3 cursor-pointer"
            >
              <Folder className="h-4 w-4" />
              View All Projects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Project Status */}
        <div className="hidden md:flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {project.project_members?.length || 1} member{(project.project_members?.length || 1) !== 1 ? 's' : ''}
          </Badge>
          {project.github_repo && (
            <Badge variant="outline" className="text-xs">
              GitHub Connected
            </Badge>
          )}
          {project.local_path && (
            <Badge variant="outline" className="text-xs">
              Local Folder
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}