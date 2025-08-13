'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  github_repo: string | null
  local_path: string | null
  settings: Record<string, any>
  created_at: string
  updated_at: string
  project_members: Array<{
    role: string
    user_id: string
    users: {
      full_name: string | null
      email: string
      avatar_url?: string | null
    }
  }>
}

export interface CreateProjectData {
  name: string
  description?: string
  github_repo?: string
  local_path?: string
  settings?: Record<string, any>
}

export interface UpdateProjectData {
  name?: string
  description?: string
  github_repo?: string
  local_path?: string
  settings?: Record<string, any>
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchProjects = async () => {
    if (!user) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/projects')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch projects')
      }

      const data = await response.json()
      setProjects(data.projects || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (projectData: CreateProjectData) => {
    try {
      setError(null)

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create project')
      }

      const data = await response.json()
      const newProject = data.project

      // Add the new project to the list
      setProjects(prev => [newProject, ...prev])
      
      return { project: newProject, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { project: null, error: errorMessage }
    }
  }

  const updateProject = async (projectId: string, updates: UpdateProjectData) => {
    try {
      setError(null)

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update project')
      }

      const data = await response.json()
      const updatedProject = data.project

      // Update the project in the list
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId ? updatedProject : project
        )
      )
      
      return { project: updatedProject, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { project: null, error: errorMessage }
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      setError(null)

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }

      // Remove the project from the list
      setProjects(prev => prev.filter(project => project.id !== projectId))
      
      return { error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { error: errorMessage }
    }
  }

  const getProject = async (projectId: string) => {
    try {
      setError(null)

      const response = await fetch(`/api/projects/${projectId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch project')
      }

      const data = await response.json()
      return { project: data.project, error: null }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return { project: null, error: errorMessage }
    }
  }

  // Fetch projects when user changes
  useEffect(() => {
    fetchProjects()
  }, [user])

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProject,
  }
}