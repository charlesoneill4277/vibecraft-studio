'use client'

import { useState } from 'react'
import { useProjects, Project } from '@/hooks/use-projects'
import { ProjectForm } from './project-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Settings, Trash2, Users, Calendar, GitBranch, Folder } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ProjectSettingsProps {
  project: Project
  onProjectUpdated?: (project: Project) => void
  onProjectDeleted?: () => void
}

export function ProjectSettings({ project, onProjectUpdated, onProjectDeleted }: ProjectSettingsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { updateProject, deleteProject } = useProjects()

  const handleUpdateProject = async (data: any) => {
    const { project: updatedProject, error } = await updateProject(project.id, data)
    
    if (error) {
      return { error }
    }

    setIsEditDialogOpen(false)
    onProjectUpdated?.(updatedProject)
    return { error: null }
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    const { error } = await deleteProject(project.id)
    
    if (error) {
      setIsDeleting(false)
      return
    }

    setIsDeleteDialogOpen(false)
    onProjectDeleted?.()
  }

  const userRole = project.project_members.find(member => member.user_id === project.user_id)?.role || 'viewer'
  const canEdit = ['owner', 'admin', 'editor'].includes(userRole)
  const canDelete = userRole === 'owner'

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Project Settings
              </CardTitle>
              <CardDescription>
                Manage your project configuration and settings
              </CardDescription>
            </div>
            {canEdit && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Edit Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>
                      Update your project settings and configuration
                    </DialogDescription>
                  </DialogHeader>
                  <ProjectForm
                    mode="edit"
                    project={project}
                    onSubmit={handleUpdateProject}
                    onCancel={() => setIsEditDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{project.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                  </p>
                </div>
                {project.description && (
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="font-medium">{project.description}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Integration Settings */}
            <div>
              <h3 className="font-medium mb-2">Integration Settings</h3>
              <div className="space-y-3">
                {project.github_repo && (
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">GitHub:</span>
                    <a 
                      href={project.github_repo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {project.github_repo}
                    </a>
                  </div>
                )}
                {project.local_path && (
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Local Path:</span>
                    <span className="text-sm font-mono">{project.local_path}</span>
                  </div>
                )}
                {!project.github_repo && !project.local_path && (
                  <p className="text-sm text-muted-foreground">No integrations configured</p>
                )}
              </div>
            </div>

            <Separator />

            {/* AI Settings */}
            <div>
              <h3 className="font-medium mb-2">AI Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Default Provider:</span>
                  <Badge variant="secondary" className="ml-2">
                    {project.settings?.defaultAIProvider || 'Not set'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Default Model:</span>
                  <Badge variant="secondary" className="ml-2">
                    {project.settings?.defaultModel || 'Not set'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Project Settings */}
            <div>
              <h3 className="font-medium mb-2">Project Features</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Collaboration</span>
                  <Badge variant={project.settings?.collaborationEnabled ? 'default' : 'secondary'}>
                    {project.settings?.collaborationEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Public Templates</span>
                  <Badge variant={project.settings?.publicTemplates ? 'default' : 'secondary'}>
                    {project.settings?.publicTemplates ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Team Members */}
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Members ({project.project_members.length})
              </h3>
              <div className="space-y-2">
                {project.project_members.map((member, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {member.users.full_name || member.users.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.users.email}</p>
                    </div>
                    <Badge variant="outline">
                      {member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {canDelete && (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Delete Project</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this project and all its data. This action cannot be undone.
                </p>
              </div>
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Project</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{project.name}"? This action cannot be undone.
                      All project data, including prompts, knowledge, and settings will be permanently removed.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteDialogOpen(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDeleteProject}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Project'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}