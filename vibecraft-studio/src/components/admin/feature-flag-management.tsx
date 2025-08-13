'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Settings, 
  TrendingUp, 
  Users, 
  Eye, 
  EyeOff, 
  Edit, 
  Trash2,
  BarChart3,
  MessageSquare
} from 'lucide-react'
import type { FeatureFlag, CreateFeatureFlagRequest, UpdateFeatureFlagRequest, FeatureFlagUsageStats } from '@/types/feature-flags'

interface FeatureFlagManagementProps {
  className?: string
}

export function FeatureFlagManagement({ className }: FeatureFlagManagementProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showStatsDialog, setShowStatsDialog] = useState(false)
  const [flagStats, setFlagStats] = useState<FeatureFlagUsageStats | null>(null)

  useEffect(() => {
    loadFlags()
  }, [])

  const loadFlags = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/feature-flags')
      
      if (!response.ok) {
        throw new Error('Failed to load feature flags')
      }

      const data = await response.json()
      setFlags(data.flags)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags')
    } finally {
      setLoading(false)
    }
  }

  const createFlag = async (request: CreateFeatureFlagRequest) => {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create feature flag')
      }

      await loadFlags()
      setShowCreateDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feature flag')
    }
  }

  const updateFlag = async (id: string, request: UpdateFeatureFlagRequest) => {
    try {
      const response = await fetch(`/api/admin/feature-flags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error('Failed to update feature flag')
      }

      await loadFlags()
      setShowEditDialog(false)
      setSelectedFlag(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature flag')
    }
  }

  const deleteFlag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/feature-flags/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete feature flag')
      }

      await loadFlags()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete feature flag')
    }
  }

  const toggleFlag = async (flag: FeatureFlag) => {
    await updateFlag(flag.id, { isActive: !flag.isActive })
  }

  const loadFlagStats = async (flagId: string) => {
    try {
      // This would be implemented in the admin service
      // For now, we'll show a placeholder
      setFlagStats({
        flagName: selectedFlag?.name || '',
        totalEvaluations: 1250,
        uniqueUsers: 89,
        enabledCount: 1100,
        disabledCount: 150,
        errorCount: 0,
        averageRating: 4.2,
        feedbackCount: 15
      })
      setShowStatsDialog(true)
    } catch (err) {
      setError('Failed to load flag statistics')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Feature Flag Management</h2>
          <p className="text-muted-foreground">
            Manage feature flags, A/B tests, and gradual rollouts
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Flag
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{flag.name}</CardTitle>
                  <Badge variant={flag.isActive ? 'default' : 'secondary'}>
                    {flag.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">{flag.environment}</Badge>
                  <Badge variant="outline">{flag.rolloutPercentage}%</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFlag(flag)
                      loadFlagStats(flag.id)
                    }}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFlag(flag)
                      setShowEditDialog(true)
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteFlag(flag.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Switch
                    checked={flag.isActive}
                    onCheckedChange={() => toggleFlag(flag)}
                  />
                </div>
              </div>
              {flag.description && (
                <CardDescription>{flag.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{flag.flagType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Default Value</Label>
                  <p className="font-medium">{JSON.stringify(flag.defaultValue)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">
                    {new Date(flag.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Updated</Label>
                  <p className="font-medium">
                    {new Date(flag.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Flag Dialog */}
      <CreateFlagDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={createFlag}
      />

      {/* Edit Flag Dialog */}
      {selectedFlag && (
        <EditFlagDialog
          flag={selectedFlag}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSubmit={(request) => updateFlag(selectedFlag.id, request)}
        />
      )}

      {/* Stats Dialog */}
      {flagStats && (
        <StatsDialog
          stats={flagStats}
          open={showStatsDialog}
          onOpenChange={setShowStatsDialog}
        />
      )}
    </div>
  )
}

// Create Flag Dialog Component
function CreateFlagDialog({
  open,
  onOpenChange,
  onSubmit
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (request: CreateFeatureFlagRequest) => void
}) {
  const [formData, setFormData] = useState<CreateFeatureFlagRequest>({
    name: '',
    description: '',
    flagType: 'boolean',
    defaultValue: false,
    environment: 'all',
    rolloutPercentage: 100
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Feature Flag</DialogTitle>
          <DialogDescription>
            Create a new feature flag for controlled feature releases
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="feature_name"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this feature flag controls"
            />
          </div>
          <div>
            <Label htmlFor="flagType">Type</Label>
            <Select
              value={formData.flagType}
              onValueChange={(value: any) => setFormData({ ...formData, flagType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="defaultValue">Default Value</Label>
            <Input
              id="defaultValue"
              value={JSON.stringify(formData.defaultValue)}
              onChange={(e) => {
                try {
                  const value = JSON.parse(e.target.value)
                  setFormData({ ...formData, defaultValue: value })
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder="false"
            />
          </div>
          <div>
            <Label htmlFor="environment">Environment</Label>
            <Select
              value={formData.environment}
              onValueChange={(value: any) => setFormData({ ...formData, environment: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rolloutPercentage">Rollout Percentage</Label>
            <Input
              id="rolloutPercentage"
              type="number"
              min="0"
              max="100"
              value={formData.rolloutPercentage}
              onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Flag</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Edit Flag Dialog Component
function EditFlagDialog({
  flag,
  open,
  onOpenChange,
  onSubmit
}: {
  flag: FeatureFlag
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (request: UpdateFeatureFlagRequest) => void
}) {
  const [formData, setFormData] = useState<UpdateFeatureFlagRequest>({
    description: flag.description,
    defaultValue: flag.defaultValue,
    isActive: flag.isActive,
    rolloutPercentage: flag.rolloutPercentage
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Feature Flag</DialogTitle>
          <DialogDescription>
            Update the configuration for {flag.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="defaultValue">Default Value</Label>
            <Input
              id="defaultValue"
              value={JSON.stringify(formData.defaultValue)}
              onChange={(e) => {
                try {
                  const value = JSON.parse(e.target.value)
                  setFormData({ ...formData, defaultValue: value })
                } catch {
                  // Invalid JSON, ignore
                }
              }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <div>
            <Label htmlFor="rolloutPercentage">Rollout Percentage</Label>
            <Input
              id="rolloutPercentage"
              type="number"
              min="0"
              max="100"
              value={formData.rolloutPercentage}
              onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Flag</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Stats Dialog Component
function StatsDialog({
  stats,
  open,
  onOpenChange
}: {
  stats: FeatureFlagUsageStats
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Feature Flag Statistics</DialogTitle>
          <DialogDescription>
            Usage statistics for {stats.flagName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
              <p className="text-xs text-muted-foreground">Total Evaluations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground">Unique Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.enabledCount}</div>
              <p className="text-xs text-muted-foreground">Enabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.disabledCount}</div>
              <p className="text-xs text-muted-foreground">Disabled</p>
            </CardContent>
          </Card>
          {stats.averageRating && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Average Rating</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.feedbackCount}</div>
              <p className="text-xs text-muted-foreground">Feedback Items</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}