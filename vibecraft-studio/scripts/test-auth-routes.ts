#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.development' })

async function testAuthRoutes() {
  console.log('🌐 Testing Authentication Routes...')

  const baseUrl = 'http://localhost:3000'
  
  const routes = [
    { path: '/', name: 'Home Page', shouldRedirect: false },
    { path: '/login', name: 'Login Page', shouldRedirect: false },
    { path: '/signup', name: 'Signup Page', shouldRedirect: false },
    { path: '/auth/auth-code-error', name: 'Auth Error Page', shouldRedirect: false },
  ]

  try {
    for (const route of routes) {
      console.log(`🔍 Testing ${route.name} (${route.path})...`)
      
      try {
        const response = await fetch(`${baseUrl}${route.path}`, {
          method: 'GET',
          redirect: 'manual' // Don't follow redirects automatically
        })

        if (response.status === 200) {
          console.log(`✅ ${route.name} is accessible (200)`)
        } else if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location')
          console.log(`🔄 ${route.name} redirects to: ${location} (${response.status})`)
        } else {
          console.log(`⚠️ ${route.name} returned status: ${response.status}`)
        }
      } catch (error) {
        console.error(`❌ Failed to test ${route.name}:`, error instanceof Error ? error.message : error)
      }
    }

    // Test protected routes (should redirect to login when not authenticated)
    console.log('🔒 Testing protected routes...')
    
    const protectedRoutes = ['/dashboard']
    
    for (const path of protectedRoutes) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: 'GET',
          redirect: 'manual'
        })

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location')
          if (location?.includes('/login')) {
            console.log(`✅ Protected route ${path} correctly redirects to login`)
          } else {
            console.log(`⚠️ Protected route ${path} redirects to: ${location}`)
          }
        } else {
          console.log(`⚠️ Protected route ${path} returned status: ${response.status} (expected redirect)`)
        }
      } catch (error) {
        console.error(`❌ Failed to test protected route ${path}:`, error instanceof Error ? error.message : error)
      }
    }

    console.log('🎉 Authentication routes testing completed!')

  } catch (error) {
    console.error('❌ Route testing failed:', error)
    process.exit(1)
  }
}

// Only run if the dev server is running
console.log('⚠️ Make sure the dev server is running (npm run dev) before running this test')
console.log('🚀 Starting route tests in 2 seconds...')

setTimeout(testAuthRoutes, 2000)