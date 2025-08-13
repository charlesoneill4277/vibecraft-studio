'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Star, MessageSquare, Send } from 'lucide-react'
import { useFeatureFlags } from '@/hooks/use-feature-flags'

interface FeatureFeedbackProps {
  flagName: string
  featureName?: string
  className?: string
}

export function FeatureFeedback({ 
  flagName, 
  featureName,
  className 
}: FeatureFeedbackProps) {
  const { submitFeedback } = useFeatureFlags()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackType, setFeedbackType] = useState<'bug' | 'improvement' | 'general'>('general')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0 && !feedbackText.trim()) {
      return
    }

    try {
      setSubmitting(true)
      
      await submitFeedback(flagName, {
        rating: rating > 0 ? rating : undefined,
        feedbackText: feedbackText.trim() || undefined,
        feedbackType
      })

      setSubmitted(true)
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setRating(0)
        setFeedbackText('')
        setFeedbackType('general')
      }, 2000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
  }

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedback
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Thank you!</h3>
            <p className="text-muted-foreground">
              Your feedback has been submitted and will help us improve this feature.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Feature Feedback</DialogTitle>
          <DialogDescription>
            Help us improve {featureName || flagName} by sharing your experience
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div>
            <Label className="text-sm font-medium">How would you rate this feature?</Label>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} star{rating !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Feedback Type */}
          <div>
            <Label htmlFor="feedbackType">Feedback Type</Label>
            <Select value={feedbackType} onValueChange={(value: any) => setFeedbackType(value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Feedback</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="improvement">Improvement Suggestion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feedback Text */}
          <div>
            <Label htmlFor="feedback">Your Feedback (Optional)</Label>
            <Textarea
              id="feedback"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what you think about this feature..."
              className="mt-2 min-h-[100px]"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || (rating === 0 && !feedbackText.trim())}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Inline feedback component for quick ratings
export function QuickFeatureFeedback({ 
  flagName, 
  featureName,
  className 
}: FeatureFeedbackProps) {
  const { submitFeedback } = useFeatureFlags()
  const [rating, setRating] = useState<number>(0)
  const [submitted, setSubmitted] = useState(false)

  const handleQuickRating = async (starRating: number) => {
    try {
      setRating(starRating)
      await submitFeedback(flagName, { rating: starRating })
      setSubmitted(true)
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSubmitted(false)
        setRating(0)
      }, 3000)
    } catch (error) {
      console.error('Error submitting quick feedback:', error)
    }
  }

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <span>Thanks for your feedback!</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground">Rate this feature:</span>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleQuickRating(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star className="w-4 h-4 text-gray-300 hover:text-yellow-400" />
          </button>
        ))}
      </div>
    </div>
  )
}