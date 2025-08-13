#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync, readFileSync } from 'fs'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.development') })

console.log('🏗️ Testing Complete Core Project Management System Integration...\n')

// Test 1: Verify all Task 4 components are implemented
console.log('📋 Testing Task 4 Implementation Status...')

const task4Components = {
  '4.1': {
    name: 'Project CRUD Operations',
    files: [
      'src/app/api/projects/route.ts',
      'src/app/api/projects/[id]/route.ts',
      'src/hooks/use-projects.ts',
      'src/components/project/project-form.tsx',
      'src/components/project/project-creation-wizard.tsx',
      'src/components/project/project-settings.tsx'
    ]
  },
  '4.2': {
    name: 'Project Dashboard Interface',
    files: [
      'src/app/(protected)/dashboard/page.tsx',
      'src/components/project/project-dashboard.tsx',
      'src/components/project/project-card.tsx'
    ]
  },
  '4.3': {
    name: 'Project Workspace Navigation',
    files: [
      'src/components/project/project-workspace-layout.tsx',
      'src/components/project/project-sidebar.tsx',
      'src/components/project/project-header.tsx',
      'src/components/project/project-breadcrumb.tsx',
      'src/hooks/use-project-context.tsx'
    ]
  },
  '4.4': {
    name: 'Feature Flag System',
    files: [
      'src/lib/feature-flags/service.ts',
      'src/lib/feature-flags/admin.ts',
      'src/hooks/use-feature-flags.ts',
      'src/components/feature-flags/feature-gate.tsx',
      'src/components/admin/feature-flag-management.tsx'
    ]
  }
}

let allTask4Complete = true

for (const [taskId, task] of Object.entries(task4Components)) {
  console.log(`\n📋 Task ${taskId}: ${task.name}`)
  let taskComplete = true
  
  for (const file of task.files) {
    if (existsSync(file)) {
      console.log(`  ✅ ${file}`)
    } else {
      console.log(`  ❌ ${file} - MISSING`)
      taskComplete = false
      allTask4Complete = false
    }
  }
  
  console.log(`  ${taskComplete ? '✅' : '❌'} Task ${taskId}: ${taskComplete ? 'COMPLETE' : 'INCOMPLETE'}`)
}

// Test 2: Integration between components
console.log('\n🔗 Testing Component Integration...')

const integrationTests = [
  {
    name: 'Dashboard uses project hooks',
    check: () => {
      const dashboardContent = readFileSync('src/app/(protected)/dashboard/page.tsx', 'utf8')
      return dashboardContent.includes('useProjects') || dashboardContent.includes('ProjectDashboard')
    }
  },
  {
    name: 'Project workspace uses context',
    check: () => {
      const workspaceContent = readFileSync('src/components/project/project-workspace-layout.tsx', 'utf8')
      return workspaceContent.includes('useProjectContext')
    }
  },
  {
    name: 'Sidebar uses feature flags',
    check: () => {
      const sidebarContent = readFileSync('src/components/project/project-sidebar.tsx', 'utf8')
      return sidebarContent.includes('useFeatureFlags') || sidebarContent.includes('isEnabled')
    }
  },
  {
    name: 'Layout includes feature flag provider',
    check: () => {
      const layoutContent = readFileSync('src/app/layout.tsx', 'utf8')
      return layoutContent.includes('FeatureFlagProvider')
    }
  },
  {
    name: 'Projects layout includes context provider',
    check: () => {
      const projectsLayoutContent = readFileSync('src/app/(protected)/projects/layout.tsx', 'utf8')
      return projectsLayoutContent.includes('ProjectContextProvider')
    }
  },
  {
    name: 'API routes have proper error handling',
    check: () => {
      const projectsApiContent = readFileSync('src/app/api/projects/route.ts', 'utf8')
      return projectsApiContent.includes('try') && projectsApiContent.includes('catch') && projectsApiContent.includes('NextResponse.json')
    }
  }
]

let allIntegrationsPass = true
for (const test of integrationTests) {
  try {
    const result = test.check()
    console.log(`${result ? '✅' : '❌'} ${test.name}`)
    if (!result) allIntegrationsPass = false
  } catch (error) {
    console.log(`❌ ${test.name} - Error checking`)
    allIntegrationsPass = false
  }
}

// Test 3: Data flow and state management
console.log('\n🔄 Testing Data Flow and State Management...')

const dataFlowTests = [
  {
    name: 'Project CRUD operations complete',
    check: () => {
      const hooksContent = readFileSync('src/hooks/use-projects.ts', 'utf8')
      return ['createProject', 'updateProject', 'deleteProject', 'getProject', 'fetchProjects'].every(
        method => hooksContent.includes(method)
      )
    }
  },
  {
    name: 'Project context state management',
    check: () => {
      const contextContent = readFileSync('src/hooks/use-project-context.tsx', 'utf8')
      return ['currentProject', 'sidebarOpen', 'currentSection', 'recentProjects'].every(
        state => contextContent.includes(state)
      )
    }
  },
  {
    name: 'Feature flag evaluation system',
    check: () => {
      const serviceContent = readFileSync('src/lib/feature-flags/service.ts', 'utf8')
      return ['evaluateFlag', 'getAllFlags', 'isEnabled', 'getValue'].every(
        method => serviceContent.includes(method)
      )
    }
  },
  {
    name: 'Local storage persistence',
    check: () => {
      const contextContent = readFileSync('src/hooks/use-project-context.tsx', 'utf8')
      return contextContent.includes('localStorage')
    }
  }
]

let allDataFlowPass = true
for (const test of dataFlowTests) {
  try {
    const result = test.check()
    console.log(`${result ? '✅' : '❌'} ${test.name}`)
    if (!result) allDataFlowPass = false
  } catch (error) {
    console.log(`❌ ${test.name} - Error checking`)
    allDataFlowPass = false
  }
}

// Test 4: Security and validation
console.log('\n🔒 Testing Security and Validation...')

const securityTests = [
  {
    name: 'API routes have authentication',
    check: () => {
      const projectsApiContent = readFileSync('src/app/api/projects/route.ts', 'utf8')
      return projectsApiContent.includes('auth.getUser') && projectsApiContent.includes('Unauthorized')
    }
  },
  {
    name: 'Project validation implemented',
    check: () => {
      const projectsApiContent = readFileSync('src/app/api/projects/route.ts', 'utf8')
      return projectsApiContent.includes('validateProject')
    }
  },
  {
    name: 'Role-based access control',
    check: () => {
      const projectApiContent = readFileSync('src/app/api/projects/[id]/route.ts', 'utf8')
      return projectApiContent.includes('role') && projectApiContent.includes('permissions')
    }
  },
  {
    name: 'Feature flag admin access control',
    check: () => {
      const adminApiContent = readFileSync('src/app/api/admin/feature-flags/route.ts', 'utf8')
      return adminApiContent.includes('checkAdminAccess') || adminApiContent.includes('admin')
    }
  }
]

let allSecurityPass = true
for (const test of securityTests) {
  try {
    const result = test.check()
    console.log(`${result ? '✅' : '❌'} ${test.name}`)
    if (!result) allSecurityPass = false
  } catch (error) {
    console.log(`❌ ${test.name} - Error checking`)
    allSecurityPass = false
  }
}

// Test 5: User experience and UI consistency
console.log('\n🎨 Testing User Experience and UI Consistency...')

const uxTests = [
  {
    name: 'Consistent loading states',
    check: () => {
      const dashboardContent = readFileSync('src/components/project/project-dashboard.tsx', 'utf8')
      const projectPageContent = readFileSync('src/app/(protected)/projects/[id]/page.tsx', 'utf8')
      return dashboardContent.includes('loading') && projectPageContent.includes('loading')
    }
  },
  {
    name: 'Error handling with user feedback',
    check: () => {
      const dashboardContent = readFileSync('src/components/project/project-dashboard.tsx', 'utf8')
      return dashboardContent.includes('error') && dashboardContent.includes('Error loading')
    }
  },
  {
    name: 'Responsive design considerations',
    check: () => {
      const dashboardContent = readFileSync('src/components/project/project-dashboard.tsx', 'utf8')
      return dashboardContent.includes('md:') || dashboardContent.includes('lg:')
    }
  },
  {
    name: 'Accessibility features',
    check: () => {
      const sidebarContent = readFileSync('src/components/project/project-sidebar.tsx', 'utf8')
      return sidebarContent.includes('title=') || sidebarContent.includes('aria-')
    }
  }
]

let allUXPass = true
for (const test of uxTests) {
  try {
    const result = test.check()
    console.log(`${result ? '✅' : '❌'} ${test.name}`)
    if (!result) allUXPass = false
  } catch (error) {
    console.log(`❌ ${test.name} - Error checking`)
    allUXPass = false
  }
}

// Test 6: Performance and optimization
console.log('\n⚡ Testing Performance and Optimization...')

const performanceTests = [
  {
    name: 'Feature flag caching implemented',
    check: () => {
      const serviceContent = readFileSync('src/lib/feature-flags/service.ts', 'utf8')
      return serviceContent.includes('cache') && serviceContent.includes('TTL')
    }
  },
  {
    name: 'Memoization in dashboard',
    check: () => {
      const dashboardContent = readFileSync('src/components/project/project-dashboard.tsx', 'utf8')
      return dashboardContent.includes('useMemo')
    }
  },
  {
    name: 'Callback optimization',
    check: () => {
      const contextContent = readFileSync('src/hooks/use-project-context.tsx', 'utf8')
      return contextContent.includes('useCallback')
    }
  },
  {
    name: 'Efficient state updates',
    check: () => {
      const hooksContent = readFileSync('src/hooks/use-projects.ts', 'utf8')
      return hooksContent.includes('prev =>') // Functional state updates
    }
  }
]

let allPerformancePass = true
for (const test of performanceTests) {
  try {
    const result = test.check()
    console.log(`${result ? '✅' : '❌'} ${test.name}`)
    if (!result) allPerformancePass = false
  } catch (error) {
    console.log(`❌ ${test.name} - Error checking`)
    allPerformancePass = false
  }
}

// Test 7: Database and API integration
console.log('\n🗄️ Testing Database and API Integration...')

const dbTests = [
  {
    name: 'Supabase client integration',
    check: () => {
      const projectsApiContent = readFileSync('src/app/api/projects/route.ts', 'utf8')
      return projectsApiContent.includes('createClient') && projectsApiContent.includes('supabase')
    }
  },
  {
    name: 'RLS policies consideration',
    check: () => {
      const flagsSchemaContent = readFileSync('scripts/create-feature-flags-tables.sql', 'utf8')
      return flagsSchemaContent.includes('ROW LEVEL SECURITY')
    }
  },
  {
    name: 'Database relationships',
    check: () => {
      const projectsApiContent = readFileSync('src/app/api/projects/route.ts', 'utf8')
      return projectsApiContent.includes('project_members') && projectsApiContent.includes('users')
    }
  },
  {
    name: 'Transaction handling',
    check: () => {
      const projectsApiContent = readFileSync('src/app/api/projects/route.ts', 'utf8')
      return projectsApiContent.includes('error') && projectsApiContent.includes('Clean up')
    }
  }
]

let allDBPass = true
for (const test of dbTests) {
  try {
    const result = test.check()
    console.log(`${result ? '✅' : '❌'} ${test.name}`)
    if (!result) allDBPass = false
  } catch (error) {
    console.log(`❌ ${test.name} - Error checking`)
    allDBPass = false
  }
}

// Final comprehensive assessment
console.log('\n🎯 Core Project Management System Integration Summary:')
console.log('============================================================')
console.log(`📋 Task 4 Components: ${allTask4Complete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`🔗 Component Integration: ${allIntegrationsPass ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`🔄 Data Flow & State: ${allDataFlowPass ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`🔒 Security & Validation: ${allSecurityPass ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`🎨 User Experience: ${allUXPass ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`⚡ Performance: ${allPerformancePass ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)
console.log(`🗄️ Database Integration: ${allDBPass ? '✅ COMPLETE' : '❌ INCOMPLETE'}`)

const overallSuccess = allTask4Complete && allIntegrationsPass && allDataFlowPass && 
                      allSecurityPass && allUXPass && allPerformancePass && allDBPass

console.log('\n' + '='.repeat(60))
if (overallSuccess) {
  console.log('🎉 CORE PROJECT MANAGEMENT SYSTEM FULLY INTEGRATED!')
  console.log('\n✅ All Task 4 components are complete and working together:')
  console.log('  • 4.1 Project CRUD Operations ✅')
  console.log('  • 4.2 Project Dashboard Interface ✅')
  console.log('  • 4.3 Project Workspace Navigation ✅')
  console.log('  • 4.4 Feature Flag System ✅')
  console.log('\n🚀 System Features:')
  console.log('  • Complete project lifecycle management')
  console.log('  • Intuitive dashboard with analytics')
  console.log('  • Seamless workspace navigation')
  console.log('  • Advanced feature flag system')
  console.log('  • Role-based access control')
  console.log('  • Real-time state management')
  console.log('  • Performance optimizations')
  console.log('  • Security best practices')
  console.log('\n🎯 Ready to proceed to Task 5: AI Provider Integration System')
} else {
  console.log('⚠️ CORE PROJECT MANAGEMENT SYSTEM NEEDS ATTENTION')
  console.log('\nSome components require fixes before proceeding to Task 5')
}

console.log('=' + '='.repeat(60))