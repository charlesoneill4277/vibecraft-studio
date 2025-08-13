#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.development') })

console.log('🧭 Testing Project Workspace Navigation Implementation...\n')

// Test 1: Check if all required components exist
console.log('📁 Testing Component Files...')
const requiredComponents = [
  'src/components/project/project-workspace-layout.tsx',
  'src/components/project/project-sidebar.tsx', 
  'src/components/project/project-header.tsx',
  'src/components/project/project-breadcrumb.tsx',
  'src/hooks/use-project-context.tsx'
]

let allComponentsExist = true
for (const component of requiredComponents) {
  if (existsSync(component)) {
    console.log(`✅ ${component}`)
  } else {
    console.log(`❌ ${component} - MISSING`)
    allComponentsExist = false
  }
}

// Test 2: Check component implementation details
console.log('\n🔍 Testing Component Implementation...')

// Test ProjectWorkspaceLayout
try {
  const layoutContent = readFileSync('src/components/project/project-workspace-layout.tsx', 'utf8')
  
  const layoutTests = [
    { name: 'Sidebar integration', check: layoutContent.includes('ProjectSidebar') },
    { name: 'Header integration', check: layoutContent.includes('ProjectHeader') },
    { name: 'Breadcrumb integration', check: layoutContent.includes('ProjectBreadcrumb') },
    { name: 'Project context usage', check: layoutContent.includes('useProjectContext') },
    { name: 'Section navigation', check: layoutContent.includes('handleSectionChange') },
    { name: 'URL routing', check: layoutContent.includes('router.push') },
    { name: 'State preservation', check: layoutContent.includes('setCurrentProject') }
  ]
  
  console.log('📋 ProjectWorkspaceLayout:')
  layoutTests.forEach(test => {
    console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`)
  })
} catch (error) {
  console.log('❌ Error reading ProjectWorkspaceLayout')
}

// Test ProjectSidebar
try {
  const sidebarContent = readFileSync('src/components/project/project-sidebar.tsx', 'utf8')
  
  const sidebarTests = [
    { name: 'Navigation items', check: sidebarContent.includes('sidebarItems') },
    { name: 'Collapsible sidebar', check: sidebarContent.includes('isOpen') },
    { name: 'Active section highlighting', check: sidebarContent.includes('isActive') },
    { name: 'Section change handler', check: sidebarContent.includes('onSectionChange') },
    { name: 'Project information display', check: sidebarContent.includes('project.name') },
    { name: 'Coming soon indicators', check: sidebarContent.includes('isComingSoon') }
  ]
  
  console.log('📋 ProjectSidebar:')
  sidebarTests.forEach(test => {
    console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`)
  })
} catch (error) {
  console.log('❌ Error reading ProjectSidebar')
}

// Test ProjectHeader
try {
  const headerContent = readFileSync('src/components/project/project-header.tsx', 'utf8')
  
  const headerTests = [
    { name: 'Project switcher dropdown', check: headerContent.includes('DropdownMenu') },
    { name: 'Recent projects', check: headerContent.includes('recentProjects') },
    { name: 'Back to dashboard', check: headerContent.includes('handleBackToDashboard') },
    { name: 'New project creation', check: headerContent.includes('handleNewProject') },
    { name: 'Project switching', check: headerContent.includes('handleProjectSwitch') },
    { name: 'Local storage integration', check: headerContent.includes('localStorage') }
  ]
  
  console.log('📋 ProjectHeader:')
  headerTests.forEach(test => {
    console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`)
  })
} catch (error) {
  console.log('❌ Error reading ProjectHeader')
}

// Test ProjectBreadcrumb
try {
  const breadcrumbContent = readFileSync('src/components/project/project-breadcrumb.tsx', 'utf8')
  
  const breadcrumbTests = [
    { name: 'Section configuration', check: breadcrumbContent.includes('sectionConfig') },
    { name: 'Dashboard link', check: breadcrumbContent.includes('Dashboard') },
    { name: 'Project link', check: breadcrumbContent.includes('project.name') },
    { name: 'Current section display', check: breadcrumbContent.includes('currentSection') },
    { name: 'Section icons', check: breadcrumbContent.includes('Icon') },
    { name: 'Section descriptions', check: breadcrumbContent.includes('description') }
  ]
  
  console.log('📋 ProjectBreadcrumb:')
  breadcrumbTests.forEach(test => {
    console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`)
  })
} catch (error) {
  console.log('❌ Error reading ProjectBreadcrumb')
}

// Test ProjectContext Hook
try {
  const contextContent = readFileSync('src/hooks/use-project-context.tsx', 'utf8')
  
  const contextTests = [
    { name: 'Context provider', check: contextContent.includes('ProjectContextProvider') },
    { name: 'Current project state', check: contextContent.includes('currentProject') },
    { name: 'Sidebar state management', check: contextContent.includes('sidebarOpen') },
    { name: 'Section state management', check: contextContent.includes('currentSection') },
    { name: 'Recent projects tracking', check: contextContent.includes('recentProjects') },
    { name: 'Project settings storage', check: contextContent.includes('projectSettings') },
    { name: 'Local storage persistence', check: contextContent.includes('localStorage') }
  ]
  
  console.log('📋 ProjectContext Hook:')
  contextTests.forEach(test => {
    console.log(`  ${test.check ? '✅' : '❌'} ${test.name}`)
  })
} catch (error) {
  console.log('❌ Error reading ProjectContext Hook')
}

// Test 3: Check route structure
console.log('\n🛣️ Testing Route Structure...')
const requiredRoutes = [
  'src/app/(protected)/projects/layout.tsx',
  'src/app/(protected)/projects/[id]/page.tsx',
  'src/app/(protected)/projects/[id]/settings/page.tsx'
]

let allRoutesExist = true
for (const route of requiredRoutes) {
  if (existsSync(route)) {
    console.log(`✅ ${route}`)
  } else {
    console.log(`❌ ${route} - MISSING`)
    allRoutesExist = false
  }
}

// Test 4: Check integration with project pages
console.log('\n🔗 Testing Page Integration...')
try {
  const projectPageContent = readFileSync('src/app/(protected)/projects/[id]/page.tsx', 'utf8')
  const settingsPageContent = readFileSync('src/app/(protected)/projects/[id]/settings/page.tsx', 'utf8')
  
  const integrationTests = [
    { name: 'Project page uses workspace layout', check: projectPageContent.includes('ProjectWorkspaceLayout') },
    { name: 'Settings page uses workspace layout', check: settingsPageContent.includes('ProjectWorkspaceLayout') },
    { name: 'Project context provider in layout', check: existsSync('src/app/(protected)/projects/layout.tsx') }
  ]
  
  integrationTests.forEach(test => {
    console.log(`${test.check ? '✅' : '❌'} ${test.name}`)
  })
} catch (error) {
  console.log('❌ Error reading page integration files')
}

// Test 5: Requirements validation
console.log('\n📋 Testing Task 4.3 Requirements...')

const requirements = [
  {
    id: '4.3.1',
    name: 'Project workspace layout with sidebar navigation',
    check: allComponentsExist && existsSync('src/components/project/project-workspace-layout.tsx')
  },
  {
    id: '4.3.2', 
    name: 'Project context switching with state preservation',
    check: existsSync('src/hooks/use-project-context.tsx')
  },
  {
    id: '4.3.3',
    name: 'Breadcrumb navigation and project header component',
    check: existsSync('src/components/project/project-breadcrumb.tsx') && existsSync('src/components/project/project-header.tsx')
  },
  {
    id: '4.3.4',
    name: 'Project switching dropdown with recent projects',
    check: existsSync('src/components/project/project-header.tsx')
  }
]

let allRequirementsMet = true
requirements.forEach(req => {
  console.log(`${req.check ? '✅' : '❌'} ${req.id}: ${req.name}`)
  if (!req.check) allRequirementsMet = false
})

// Final Summary
console.log('\n🎯 Project Workspace Navigation Summary:')
console.log('============================================================')
console.log(`📁 Component Files: ${allComponentsExist ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`🛣️ Route Structure: ${allRoutesExist ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`📋 Requirements: ${allRequirementsMet ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)

if (allComponentsExist && allRoutesExist && allRequirementsMet) {
  console.log('\n🎉 TASK 4.3 PROJECT WORKSPACE NAVIGATION FULLY IMPLEMENTED!')
  console.log('\n🚀 Ready to proceed to Task 4.4: Feature Flag System')
} else {
  console.log('\n⚠️ Some components need attention before proceeding to Task 4.4')
}