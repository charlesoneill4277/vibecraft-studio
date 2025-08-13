'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Project } from '@/hooks/use-projects'
import { useProjectContext } from '@/hooks/use-project-context'
import { ProjectSidebar } from './project-sidebar'
import { ProjectHeader } from './project-header'
import { ProjectBreadcrumb } from './project-breadcrumb'
import { cn } from '@/lib/utils'

interface ProjectWorkspaceLayoutProps {
  children: React.ReactNode
  project: Project
  className?: string
}

export function ProjectWorkspaceLayout({
  children,
  project,
  className
}: ProjectWorkspaceLayoutProps) {
  const params = useParams()
  const router = useRouter()
  const {
    sidebarOpen,
    setSidebarOpen,
    currentSection,
    setCurrentSection,
    setCurrentProject,
    addToRecentProjects
  } = useProjectContext()

  // Set current project and add to recent projects
  useEffect(() => {
    setCurrentProject(project)
    addToRecentProjects(project.id)
  }, [project, setCurrentProject, addToRecentProjects])

  // Determine current section from URL
  useEffect(() => {
    const path = window.location.pathname
    if (path.includes('/chat')) {
      setCurrentSection('chat')
    } else if (path.includes('/knowledge')) {
      setCurrentSection('knowledge')
    } else if (path.includes('/code')) {
      setCurrentSection('code')
    } else if (path.includes('/settings')) {
      setCurrentSection('settings')
    } else {
      setCurrentSection('overview')
    }
  }, [params, setCurrentSection])

  const handleSectionChange = (section: string) => {
    setCurrentSection(section)
    const basePath = `/projects/${project.id}`
    
    switch (section) {
      case 'overview':
        router.push(basePath)
        break
      case 'chat':
        router.push(`${basePath}/chat`)
        break
      case 'knowledge':
        router.push(`${basePath}/knowledge`)
        break
      case 'code':
        router.push(`${basePath}/code`)
        break
      case 'settings':
        router.push(`${basePath}/settings`)
        break
      default:
        router.push(basePath)
    }
  }

  return (
    <div className={cn('flex h-screen bg-background', className)}>
      {/* Sidebar */}
      <ProjectSidebar
        project={project}
        isOpen={sidebarOpen}
        currentSection={currentSection}
        onSectionChange={handleSectionChange}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <ProjectHeader
          project={project}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Breadcrumb */}
        <ProjectBreadcrumb
          project={project}
          currentSection={currentSection}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}