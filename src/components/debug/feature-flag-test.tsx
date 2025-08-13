'use client'

import { useFeatureFlags } from '@/hooks/use-feature-flags'

export function FeatureFlagTest() {
  const { flags, loading, error, isEnabled } = useFeatureFlags()

  if (loading) {
    return <div className="p-4 border rounded">Loading feature flags...</div>
  }

  if (error) {
    return <div className="p-4 border rounded text-red-600">Error: {error}</div>
  }

  return (
    <div className="p-4 border rounded space-y-2">
      <h3 className="font-semibold">Feature Flags Status</h3>
      <div className="space-y-1 text-sm">
        <div>Collaboration: {isEnabled('collaboration') ? '✅' : '❌'}</div>
        <div>Templates: {isEnabled('templates') ? '✅' : '❌'}</div>
        <div>GitHub Integration: {isEnabled('github_integration') ? '✅' : '❌'}</div>
        <div>Analytics: {isEnabled('analytics') ? '✅' : '❌'}</div>
        <div>AI Chat: {isEnabled('ai_chat') ? '✅' : '❌'}</div>
      </div>
      <details className="text-xs">
        <summary>Raw flags data</summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(flags, null, 2)}
        </pre>
      </details>
    </div>
  )
}