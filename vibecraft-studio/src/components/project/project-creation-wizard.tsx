'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'
import { ProjectForm } from './project-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Rocket, Code, Users, Zap } from 'lucide-react'

interface ProjectCreationWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectCreationWizard({ open, onOpenChange }: ProjectCreationWizardProps) {
  const [step, setStep] = useState<'template' | 'form'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const { createProject } = useProjects()
  const router = useRouter()

  const templates = [
    {
      id: 'blank',
      name: 'Blank Project',
      description: 'Start from scratch with a clean slate',
      icon: Plus,
      settings: {
        defaultAIProvider: 'openai',
        defaultModel: 'gpt-4',
        collaborationEnabled: true,
        publicTemplates: true,
      }
    },
    {
      id: 'web-app',
      name: 'Web Application',
      description: 'Full-stack web application with modern frameworks',
      icon: Code,
      settings: {
        defaultAIProvider: 'openai',
        defaultModel: 'gpt-4',
        collaborationEnabled: true,
        publicTemplates: true,
      }
    },
    {
      id: 'landing-page',
      name: 'Landing Page',
      description: 'Marketing website or product landing page',
      icon: Rocket,
      settings: {
        defaultAIProvider: 'anthropic',
        defaultModel: 'claude-3-sonnet',
        collaborationEnabled: false,
        publicTemplates: true,
      }
    },
    {
      id: 'team-project',
      name: 'Team Project',
      description: 'Collaborative project with team features enabled',
      icon: Users,
      settings: {
        defaultAIProvider: 'openai',
        defaultModel: 'gpt-4',
        collaborationEnabled: true,
        publicTemplates: true,
      }
    }
  ]

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    setStep('form')
  }

  const handleFormSubmit = async (data: any) => {
    const template = templates.find(t => t.id === selectedTemplate)
    const projectData = {
      ...data,
      settings: {
        ...template?.settings,
        ...data.settings,
      }
    }

    const { project, error } = await createProject(projectData)
    
    if (error) {
      return { error }
    }

    // Close wizard and navigate to the new project
    onOpenChange(false)
    setStep('template')
    setSelectedTemplate(null)
    
    // Navigate to the project (we'll implement this route later)
    router.push(`/projects/${project.id}`)
    
    return { error: null }
  }

  const handleCancel = () => {
    if (step === 'form') {
      setStep('template')
      setSelectedTemplate(null)
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'template' ? 'Choose a Project Template' : 'Create Your Project'}
          </DialogTitle>
        </DialogHeader>

        {step === 'template' && (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Select a template to get started quickly, or choose a blank project to start from scratch.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const Icon = template.icon
                return (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardHeader className="text-center">
                      <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center">
                        {template.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('template')}
                className="p-0 h-auto font-normal"
              >
                ← Back to templates
              </Button>
            </div>
            
            <ProjectForm
              mode="create"
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}