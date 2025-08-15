'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProjects, Project } from '@/hooks/use-projects'
import { ProjectWorkspaceLayout } from '@/components/project/project-workspace-layout'
import { ProjectNavigationTest } from '@/components/project/project-navigation-test'
import { ComingSoonCard } from '@/components/feature-flags/feature-gate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, GitBranch, Folder, Activity, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

export default function ProjectPage() {
  const params = useParams()
  const { getProject } = useProjects()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const projectId = params.id as string

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return

      setLoading(true)
      const { project: fetchedProject, error } = await getProject(projectId)
      
      if (error) {
        setError(error)
      } else {
        setProject(fetchedProject)
      }
      
      setLoading(false)
    }

    fetchProject()
  }, [projectId, getProject])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error || 'The project you are looking for does not exist or you do not have access to it.'}
            </p>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // const userRole = project.project_members.find(member => member.user_id === project.user_id)?.role || 'viewer'

  return (
    <ProjectWorkspaceLayout project={project}>
      <div className="space-y-6">
        {/* Project Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Project Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(project.created_at), 'PPP')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{format(new Date(project.updated_at), 'PPP')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Provider</p>
                <p className="font-medium">{project.settings?.defaultAIProvider || 'Not configured'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {project.project_members.map((member, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.users.full_name || member.users.email}</p>
                      <p className="text-sm text-muted-foreground">{member.users.email}</p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.github_repo && (
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={project.github_repo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate"
                  >
                    GitHub Repository
                  </a>
                </div>
              )}
              {project.local_path && (
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono truncate">{project.local_path}</span>
                </div>
              )}
              {!project.github_repo && !project.local_path && (
                <p className="text-sm text-muted-foreground">No integrations configured</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Test */}
        <ProjectNavigationTest />

        {/* Feature-Gated Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                AI Chat
              </CardTitle>
              <CardDescription>
                Intelligent conversations with full project context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get AI assistance tailored to your project with access to your codebase, documentation, and project history.
              </p>
              <Button asChild>
                <a href={`/projects/${project.id}/chat`}>
                  Start Chatting
                </a>
              </Button>
            </CardContent>
          </Card>

          <ComingSoonCard
            flagName="knowledge_base"
            featureName="Knowledge Base"
            description="Project documentation and resources"
            estimatedRelease="Q2 2025"
          />
        </div>
      </div>
    </ProjectWorkspaceLayout>
  )
}