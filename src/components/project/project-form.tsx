'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { CreateProjectData, UpdateProjectData, Project } from '@/hooks/use-projects'

interface ProjectFormProps {
  mode: 'create' | 'edit'
  project?: Project
  onSubmit: (data: CreateProjectData | UpdateProjectData) => Promise<{ error: string | null }>
  onCancel?: () => void
  loading?: boolean
}

export function ProjectForm({ mode, project, onSubmit, onCancel, loading }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    github_repo: project?.github_repo || '',
    local_path: project?.local_path || '',
    settings: {
      defaultAIProvider: project?.settings?.defaultAIProvider || 'openai',
      defaultModel: project?.settings?.defaultModel || 'gpt-4',
      collaborationEnabled: project?.settings?.collaborationEnabled ?? true,
      publicTemplates: project?.settings?.publicTemplates ?? false,
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must be 100 characters or less'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }

    if (formData.github_repo && formData.github_repo.trim()) {
      try {
        new URL(formData.github_repo)
      } catch {
        newErrors.github_repo = 'Please enter a valid GitHub repository URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) {
      return
    }

    const submitData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      github_repo: formData.github_repo.trim() || undefined,
      local_path: formData.local_path.trim() || undefined,
      settings: formData.settings,
    }

    const { error } = await onSubmit(submitData)
    
    if (error) {
      setSubmitError(error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSettingChange = (setting: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [setting]: value }
    }))
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create New Project' : 'Edit Project'}
        </CardTitle>
        <CardDescription>
          {mode === 'create' 
            ? 'Set up a new project workspace for your web development journey'
            : 'Update your project settings and configuration'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="My Awesome Website"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={loading}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your project..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={loading}
                rows={3}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Integration Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Integration Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="github_repo">GitHub Repository</Label>
              <Input
                id="github_repo"
                type="url"
                placeholder="https://github.com/username/repository"
                value={formData.github_repo}
                onChange={(e) => handleInputChange('github_repo', e.target.value)}
                disabled={loading}
                aria-invalid={!!errors.github_repo}
              />
              {errors.github_repo && (
                <p className="text-sm text-destructive">{errors.github_repo}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="local_path">Local Project Path</Label>
              <Input
                id="local_path"
                type="text"
                placeholder="/path/to/your/project"
                value={formData.local_path}
                onChange={(e) => handleInputChange('local_path', e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <Separator />

          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">AI Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultAIProvider">Default AI Provider</Label>
                <Select
                  value={formData.settings.defaultAIProvider}
                  onValueChange={(value) => handleSettingChange('defaultAIProvider', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="straico">Straico</SelectItem>
                    <SelectItem value="cohere">Cohere</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultModel">Default Model</Label>
                <Select
                  value={formData.settings.defaultModel}
                  onValueChange={(value) => handleSettingChange('defaultModel', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.settings.defaultAIProvider === 'openai' && (
                      <>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </>
                    )}
                    {formData.settings.defaultAIProvider === 'anthropic' && (
                      <>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                      </>
                    )}
                    {formData.settings.defaultAIProvider === 'straico' && (
                      <>
                        <SelectItem value="auto">Smart Model Selection</SelectItem>
                        <SelectItem value="gpt-4">GPT-4 (Straico)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Straico)</SelectItem>
                        <SelectItem value="claude-3-opus">Claude 3 Opus (Straico)</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Straico)</SelectItem>
                      </>
                    )}
                    {formData.settings.defaultAIProvider === 'cohere' && (
                      <>
                        <SelectItem value="command">Command</SelectItem>
                        <SelectItem value="command-light">Command Light</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Project Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Project Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="collaborationEnabled">Enable Collaboration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow team members to collaborate on this project
                  </p>
                </div>
                <Switch
                  id="collaborationEnabled"
                  checked={formData.settings.collaborationEnabled}
                  onCheckedChange={(checked) => handleSettingChange('collaborationEnabled', checked)}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="publicTemplates">Use Public Templates</Label>
                  <p className="text-sm text-muted-foreground">
                    Access community templates and resources
                  </p>
                </div>
                <Switch
                  id="publicTemplates"
                  checked={formData.settings.publicTemplates}
                  onCheckedChange={(checked) => handleSettingChange('publicTemplates', checked)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
              {submitError}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : (mode === 'create' ? 'Create Project' : 'Save Changes')}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}