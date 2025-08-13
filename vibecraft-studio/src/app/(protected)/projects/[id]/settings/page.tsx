'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProjects, Project } from '@/hooks/use-projects'
import { ProjectWorkspaceLayout } from '@/components/project/project-workspace-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ProjectSettingsPage() {
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

  return (
    <ProjectWorkspaceLayout project={project}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                This is the settings page for {project.name}. 
                Notice how the sidebar navigation shows &quot;Settings&quot; as active, 
                and the breadcrumb navigation reflects the current section.
              </p>
              <p className="text-sm text-muted-foreground">
                Settings functionality will be implemented in a future task.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectWorkspaceLayout>
  )
}