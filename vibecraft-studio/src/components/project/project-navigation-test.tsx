'use client'

import { useProjectContext } from '@/hooks/use-project-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function ProjectNavigationTest() {
  const {
    currentProject,
    sidebarOpen,
    currentSection,
    recentProjects,
    projectSettings
  } = useProjectContext()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation State Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Current Project</h4>
          <p className="text-sm text-muted-foreground">
            {currentProject ? currentProject.name : 'None'}
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2">Sidebar State</h4>
          <Badge variant={sidebarOpen ? 'default' : 'secondary'}>
            {sidebarOpen ? 'Open' : 'Closed'}
          </Badge>
        </div>

        <div>
          <h4 className="font-medium mb-2">Current Section</h4>
          <Badge variant="outline">{currentSection}</Badge>
        </div>

        <div>
          <h4 className="font-medium mb-2">Recent Projects</h4>
          <div className="space-y-1">
            {recentProjects.length > 0 ? (
              recentProjects.slice(0, 5).map((projectId, index) => (
                <div key={projectId} className="text-sm text-muted-foreground">
                  {index + 1}. {projectId}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent projects</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Project Settings Count</h4>
          <p className="text-sm text-muted-foreground">
            {Object.keys(projectSettings).length} projects with saved settings
          </p>
        </div>
      </CardContent>
    </Card>
  )
}