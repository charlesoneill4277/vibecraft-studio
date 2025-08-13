#!/usr/bin/env tsx

/**
 * Test script to verify feature flags are working properly
 */

async function testFeatureFlags() {
  console.log('🧪 Testing Feature Flags Client Service...\n')

  try {
    // Test the API endpoint directly
    console.log('1. Testing API endpoint...')
    const response = await fetch('http://localhost:3000/api/feature-flags', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.status === 401) {
      console.log('   ✅ Expected 401 (Unauthorized) - API is working')
    } else if (response.ok) {
      const data = await response.json()
      console.log('   ✅ API returned data:', data)
    } else {
      console.log('   ❌ Unexpected status code')
    }

    // Test home page loading
    console.log('\n2. Testing home page...')
    const homeResponse = await fetch('http://localhost:3000/', {
      method: 'GET',
    })

    console.log(`   Status: ${homeResponse.status} ${homeResponse.statusText}`)
    
    if (homeResponse.ok) {
      console.log('   ✅ Home page loads successfully')
      const html = await homeResponse.text()
      
      // Check if feature flag test component is present
      if (html.includes('Feature Flags Status')) {
        console.log('   ✅ Feature flag test component is present')
      } else {
        console.log('   ⚠️  Feature flag test component not found in HTML')
      }
    } else {
      console.log('   ❌ Home page failed to load')
    }

    // Test login page
    console.log('\n3. Testing login page...')
    const loginResponse = await fetch('http://localhost:3000/login', {
      method: 'GET',
    })

    console.log(`   Status: ${loginResponse.status} ${loginResponse.statusText}`)
    
    if (loginResponse.ok) {
      console.log('   ✅ Login page loads successfully')
    } else {
      console.log('   ❌ Login page failed to load')
    }

    console.log('\n🎉 Feature flags testing completed!')
    console.log('\nNext steps:')
    console.log('1. Open http://localhost:3000 in your browser')
    console.log('2. Check the "Feature Flags Status" section on the home page')
    console.log('3. Navigate to /login and verify no console errors')
    console.log('4. The app should be fast and responsive now!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
testFeatureFlags().catch(console.error)