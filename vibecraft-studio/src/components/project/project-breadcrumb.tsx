'use client'

import { Project } from '@/hooks/use-projects'
import { Button } from '@/components/ui/button'
// import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Home,
  MessageSquare,
  BookOpen,
  Code,
  Settings,
  ChevronRight,
  Users,
  Activity
} from 'lucide-react'
import Link from 'next/link'

interface ProjectBreadcrumbProps {
  project: Project
  currentSection: string
  className?: string
}

const sectionConfig = {
  overview: {
    label: 'Overview',
    icon: Home,
    description: 'Project dashboard and overview'
  },
  chat: {
    label: 'AI Chat',
    icon: MessageSquare,
    description: 'AI conversations and prompts'
  },
  knowledge: {
    label: 'Knowledge Base',
    icon: BookOpen,
    description: 'Documents and resources'
  },
  code: {
    label: 'Code Integration',
    icon: Code,
    description: 'GitHub and local code'
  },
  collaboration: {
    label: 'Team',
    icon: Users,
    description: 'Team members and collaboration'
  },
  analytics: {
    label: 'Analytics',
    icon: Activity,
    description: 'Project insights and metrics'
  },
  settings: {
    label: 'Settings',
    icon: Settings,
    description: 'Project configuration'
  }
}

export function ProjectBreadcrumb({
  project,
  currentSection,
  className
}: ProjectBreadcrumbProps) {
  const section = sectionConfig[currentSection as keyof typeof sectionConfig] || sectionConfig.overview
  const Icon = section.icon

  return (
    <div className={cn('border-b bg-muted/30 px-6 py-3', className)}>
      <div className="flex items-center space-x-2 text-sm">
        {/* Dashboard Link */}
        <Button variant="ghost" size="sm" asChild className="h-auto p-1 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard">
            Dashboard
          </Link>
        </Button>

        <ChevronRight className="h-4 w-4 text-muted-foreground" />

        {/* Project Link */}
        <Button variant="ghost" size="sm" asChild className="h-auto p-1 text-muted-foreground hover:text-foreground">
          <Link href={`/projects/${project.id}`}>
            {project.name}
          </Link>
        </Button>

        {/* Current Section (if not overview) */}
        {currentSection !== 'overview' && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 text-foreground">
              <Icon className="h-4 w-4" />
              <span className="font-medium">{section.label}</span>
            </div>
          </>
        )}
      </div>

      {/* Section Description */}
      {section.description && (
        <p className="text-xs text-muted-foreground mt-1 ml-1">
          {section.description}
        </p>
      )}
    </div>
  )
}