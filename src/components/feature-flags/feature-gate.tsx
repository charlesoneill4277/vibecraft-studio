'use client'

import { ReactNode } from 'react'
import { useFeatureFlags, useFeatureFlag } from '@/hooks/use-feature-flags'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Zap, Clock } from 'lucide-react'
import { FeatureFeedback } from './feature-feedback'

interface FeatureGateProps {
  flagName: string
  children: ReactNode
  fallback?: ReactNode
  showFeedback?: boolean
  featureName?: string
  className?: string
}

/**
 * FeatureGate component that conditionally renders children based on feature flag
 */
export function FeatureGate({
  flagName,
  children,
  fallback,
  showFeedback = false,
  featureName,
  className
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureFlag(flagName)

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    )
  }

  if (!enabled) {
    return fallback ? <>{fallback}</> : null
  }

  return (
    <div className={className}>
      {children}
      {showFeedback && (
        <div className="mt-4">
          <FeatureFeedback 
            flagName={flagName} 
            featureName={featureName}
            className="ml-auto"
          />
        </div>
      )}
    </div>
  )
}

/**
 * ComingSoonCard component for features that are not yet available
 */
export function ComingSoonCard({
  flagName,
  featureName,
  description,
  estimatedRelease,
  className
}: {
  flagName: string
  featureName: string
  description?: string
  estimatedRelease?: string
  className?: string
}) {
  const { enabled } = useFeatureFlag(flagName)

  if (enabled) {
    return null
  }

  return (
    <Card className={`border-dashed ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">{featureName}</CardTitle>
          </div>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <p className="text-muted-foreground mb-4">
            This feature is currently in development and will be available soon.
          </p>
          {estimatedRelease && (
            <p className="text-sm text-muted-foreground mb-4">
              Estimated release: {estimatedRelease}
            </p>
          )}
          <Button disabled variant="outline">
            <Zap className="w-4 h-4 mr-2" />
            Feature Not Available
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * BetaFeature component for features in beta testing
 */
export function BetaFeature({
  flagName,
  children,
  featureName,
  betaDescription,
  showFeedback = true,
  className
}: {
  flagName: string
  children: ReactNode
  featureName?: string
  betaDescription?: string
  showFeedback?: boolean
  className?: string
}) {
  const { enabled } = useFeatureFlag(flagName)

  if (!enabled) {
    return null
  }

  return (
    <div className={className}>
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              Beta
            </Badge>
            {featureName && (
              <span className="font-medium text-blue-900">{featureName}</span>
            )}
          </div>
          {showFeedback && (
            <FeatureFeedback 
              flagName={flagName} 
              featureName={featureName}
              className="text-xs"
            />
          )}
        </div>
        {betaDescription && (
          <p className="text-sm text-blue-700 mt-2">{betaDescription}</p>
        )}
      </div>
      {children}
    </div>
  )
}

/**
 * FeatureToggle component for admin/debug purposes
 */
export function FeatureToggle({
  flagName,
  featureName,
  className
}: {
  flagName: string
  featureName?: string
  className?: string
}) {
  const { enabled, loading } = useFeatureFlag(flagName)

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-muted rounded w-24"></div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {enabled ? (
        <Eye className="w-4 h-4 text-green-600" />
      ) : (
        <EyeOff className="w-4 h-4 text-gray-400" />
      )}
      <span className={`text-sm ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
        {featureName || flagName}: {enabled ? 'Enabled' : 'Disabled'}
      </span>
    </div>
  )
}

/**
 * A/B Test Variant component
 */
export function ABTestVariant({
  experimentName,
  variant,
  children,
  className
}: {
  experimentName: string
  variant: string
  children: ReactNode
  className?: string
}) {
  const { getValue } = useFeatureFlags()
  const currentVariant = getValue(`ab_${experimentName}`, 'control')

  if (currentVariant !== variant) {
    return null
  }

  return <div className={className}>{children}</div>
}

/**
 * Gradual Rollout component with percentage display
 */
export function GradualRollout({
  flagName,
  children,
  fallback,
  showRolloutInfo = false,
  className
}: {
  flagName: string
  children: ReactNode
  fallback?: ReactNode
  showRolloutInfo?: boolean
  className?: string
}) {
  const { enabled, loading } = useFeatureFlag(flagName)

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </div>
    )
  }

  if (!enabled) {
    return fallback ? <>{fallback}</> : null
  }

  return (
    <div className={className}>
      {showRolloutInfo && (
        <div className="mb-2">
          <Badge variant="outline" className="text-xs">
            Gradual Rollout
          </Badge>
        </div>
      )}
      {children}
    </div>
  )
}