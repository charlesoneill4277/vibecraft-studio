'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useProjects, Project } from '@/hooks/use-projects'
import { ProjectWorkspaceLayout } from '@/components/project/project-workspace-layout'
import { ProjectChatInterface } from '@/components/project/project-chat-interface'
import { ConversationHistorySidebar } from '@/components/project/conversation-history-sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, Zap, Settings } from 'lucide-react'

export default function ProjectChatPage() {
  const params = useParams()
  const { getProject } = useProjects()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

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
        {/* Chat Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              AI Chat
            </h1>
            <p className="text-muted-foreground">
              Intelligent conversations with full project context
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Chat Settings
            </Button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conversation History Sidebar */}
          <div className="lg:col-span-1">
            <ConversationHistorySidebar 
              project={project}
              currentConversationId={currentConversationId}
              onConversationSelect={setCurrentConversationId}
              onNewConversation={() => setCurrentConversationId(null)}
              className="h-[calc(100vh-12rem)]"
            />
          </div>

          {/* Main Chat */}
          <div className="lg:col-span-3">
            <ProjectChatInterface 
              projectId={projectId}
              project={project}
              conversationId={currentConversationId}
              onConversationChange={setCurrentConversationId}
              className="h-[calc(100vh-12rem)]"
            />
          </div>
        </div>
      </div>
    </ProjectWorkspaceLayout>
  )
}