'use client'

import { Project } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useFeatureFlags } from '@/hooks/use-feature-flags'
import {
  Home,
  MessageSquare,
  BookOpen,
  Code,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Activity
} from 'lucide-react'

interface ProjectSidebarProps {
  project: Project
  isOpen: boolean
  currentSection: string
  onSectionChange: (section: string) => void
  onToggle: () => void
}

const sidebarItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    description: 'Project dashboard and overview'
  },
  {
    id: 'chat',
    label: 'AI Chat',
    icon: MessageSquare,
    description: 'AI conversations and prompts'
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    icon: BookOpen,
    description: 'Documents and resources'
  },
  {
    id: 'code',
    label: 'Code Integration',
    icon: Code,
    description: 'GitHub and local code'
  },
  {
    id: 'collaboration',
    label: 'Team',
    icon: Users,
    description: 'Team members and collaboration'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: Activity,
    description: 'Project insights and metrics'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Project configuration'
  }
]

export function ProjectSidebar({
  project,
  isOpen,
  currentSection,
  onSectionChange,
  onToggle
}: ProjectSidebarProps) {
  const { isEnabled } = useFeatureFlags()
  return (
    <div
      className={cn(
        'bg-card border-r transition-all duration-300 ease-in-out flex flex-col',
        isOpen ? 'w-64' : 'w-16'
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {isOpen && (
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate" title={project.name}>
                {project.name}
              </h2>
              {project.description && (
                <p className="text-sm text-muted-foreground truncate" title={project.description}>
                  {project.description}
                </p>
              )}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="shrink-0"
          >
            {isOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 space-y-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = currentSection === item.id
          
          // Check feature flags for each section
          const featureFlagMap: Record<string, string> = {
            'chat': 'ai_chat',
            'knowledge': 'knowledge_base',
            'code': 'code_integration',
            'collaboration': 'collaboration',
            'analytics': 'analytics'
          }
          
          const flagName = featureFlagMap[item.id]
          const isComingSoon = flagName ? !isEnabled(flagName) : false

          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start h-auto p-3',
                !isOpen && 'px-3',
                isComingSoon && 'opacity-60 cursor-not-allowed'
              )}
              onClick={() => !isComingSoon && onSectionChange(item.id)}
              disabled={isComingSoon}
              title={!isOpen ? item.label : isComingSoon ? `${item.label} (Coming Soon)` : item.description}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isOpen && 'mr-3')} />
              {isOpen && (
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {isComingSoon && (
                      <span className="text-xs text-muted-foreground ml-2">Soon</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
              )}
            </Button>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      {isOpen && (
        <>
          <Separator />
          <div className="p-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Members:</span>
                <span>{project.project_members.length}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}