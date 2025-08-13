'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Project } from './use-projects'

interface ProjectContextState {
  currentProject: Project | null
  sidebarOpen: boolean
  currentSection: string
  recentProjects: string[]
  projectSettings: Record<string, any>
}

interface ProjectContextActions {
  setCurrentProject: (project: Project | null) => void
  setSidebarOpen: (open: boolean) => void
  setCurrentSection: (section: string) => void
  addToRecentProjects: (projectId: string) => void
  updateProjectSettings: (projectId: string, settings: Record<string, any>) => void
  getProjectSettings: (projectId: string) => Record<string, any>
}

type ProjectContextType = ProjectContextState & ProjectContextActions

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

interface ProjectContextProviderProps {
  children: ReactNode
}

export const ProjectContextProvider: React.FC<ProjectContextProviderProps> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentSection, setCurrentSection] = useState('overview')
  const [recentProjects, setRecentProjects] = useState<string[]>([])
  const [projectSettings, setProjectSettings] = useState<Record<string, any>>({})

  // Load initial state from localStorage
  useEffect(() => {
    // Load recent projects
    const savedRecent = localStorage.getItem('recent-projects')
    if (savedRecent) {
      try {
        setRecentProjects(JSON.parse(savedRecent))
      } catch (error) {
        console.error('Error loading recent projects:', error)
      }
    }

    // Load project settings
    const savedSettings = localStorage.getItem('project-settings')
    if (savedSettings) {
      try {
        setProjectSettings(JSON.parse(savedSettings))
      } catch (error) {
        console.error('Error loading project settings:', error)
      }
    }
  }, [])

  // Save recent projects to localStorage
  useEffect(() => {
    localStorage.setItem('recent-projects', JSON.stringify(recentProjects))
  }, [recentProjects])

  // Save project settings to localStorage
  useEffect(() => {
    localStorage.setItem('project-settings', JSON.stringify(projectSettings))
  }, [projectSettings])

  // Load project-specific sidebar state
  useEffect(() => {
    if (currentProject) {
      const savedSidebarState = localStorage.getItem(`project-${currentProject.id}-sidebar`)
      if (savedSidebarState !== null) {
        setSidebarOpen(JSON.parse(savedSidebarState))
      }
    }
  }, [currentProject])

  // Save project-specific sidebar state
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem(`project-${currentProject.id}-sidebar`, JSON.stringify(sidebarOpen))
    }
  }, [currentProject, sidebarOpen])

  const addToRecentProjects = (projectId: string) => {
    setRecentProjects(prev => {
      const filtered = prev.filter(id => id !== projectId)
      return [projectId, ...filtered].slice(0, 10) // Keep max 10 recent projects
    })
  }

  const updateProjectSettings = (projectId: string, settings: Record<string, any>) => {
    setProjectSettings(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        ...settings
      }
    }))
  }

  const getProjectSettings = (projectId: string): Record<string, any> => {
    return projectSettings[projectId] || {}
  }

  const contextValue: ProjectContextType = {
    // State
    currentProject,
    sidebarOpen,
    currentSection,
    recentProjects,
    projectSettings,
    // Actions
    setCurrentProject,
    setSidebarOpen,
    setCurrentSection,
    addToRecentProjects,
    updateProjectSettings,
    getProjectSettings
  }

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjectContext() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectContextProvider')
  }
  return context
}