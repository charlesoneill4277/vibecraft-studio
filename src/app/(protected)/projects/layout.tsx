'use client'

import { ProjectContextProvider } from '@/hooks/use-project-context'

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProjectContextProvider>
      {children}
    </ProjectContextProvider>
  )
}