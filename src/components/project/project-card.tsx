'use client'

import { useState } from 'react'
import { Project } from '@/hooks/use-projects'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Calendar, 
  Users, 
  GitBranch, 
  Folder, 
  Settings, 
  Trash2, 
  ExternalLink,
  Clock,
  Activity
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

interface ProjectCardProps {
  project: Project
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onSettings?: (project: Project) => void
}

export function ProjectCard({ project, onEdit, onDelete, onSettings }: ProjectCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const userRole = project.project_members.find(member => member.user_id === project.user_id)?.role || 'viewer'
  const canEdit = ['owner', 'admin', 'editor'].includes(userRole)
  const canDelete = userRole === 'owner'

  const getStatusColor = () => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceUpdate <= 1) return 'bg-green-500'
    if (daysSinceUpdate <= 7) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const getStatusText = () => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(project.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceUpdate <= 1) return 'Active'
    if (daysSinceUpdate <= 7) return 'Recent'
    return 'Inactive'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="group hover:shadow-md transition-all duration-200 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg truncate">{project.name}</CardTitle>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                <span className="text-xs text-muted-foreground">{getStatusText()}</span>
              </div>
            </div>
            {project.description && (
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}`} className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open Project
                </Link>
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => onEdit?.(project)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onSettings?.(project)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(project)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(project.created_at), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Updated</p>
              <p className="font-medium">{formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</p>
            </div>
          </div>
        </div>

        {/* Integration Indicators */}
        <div className="flex items-center gap-2">
          {project.github_repo && (
            <Badge variant="secondary" className="text-xs">
              <GitBranch className="w-3 h-3 mr-1" />
              GitHub
            </Badge>
          )}
          {project.local_path && (
            <Badge variant="secondary" className="text-xs">
              <Folder className="w-3 h-3 mr-1" />
              Local
            </Badge>
          )}
          {project.settings?.defaultAIProvider && (
            <Badge variant="secondary" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              {project.settings.defaultAIProvider}
            </Badge>
          )}
        </div>

        {/* Team Members */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {project.project_members.length} member{project.project_members.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex -space-x-2">
            {project.project_members.slice(0, 3).map((member, index) => (
              <Avatar key={index} className="w-6 h-6 border-2 border-background">
                <AvatarImage src={member.users.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {member.users.full_name 
                    ? getInitials(member.users.full_name)
                    : member.users.email.charAt(0).toUpperCase()
                  }
                </AvatarFallback>
              </Avatar>
            ))}
            {project.project_members.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs text-muted-foreground">
                  +{project.project_members.length - 3}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/projects/${project.id}`}>
              Open Project
            </Link>
          </Button>
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit?.(project)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}