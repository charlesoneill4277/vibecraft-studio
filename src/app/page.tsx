import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Code, Users, Brain } from 'lucide-react'
import { FeatureFlagTest } from '@/components/debug/feature-flag-test'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl font-bold tracking-tight">
            VibeCraft Studio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI-powered web development companion. Build faster, smarter, and more efficiently with intelligent assistance.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/signup">
                Get Started
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">AI-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Multiple AI providers including OpenAI, Anthropic, and Straico for intelligent development assistance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Smart Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Connect your GitHub repositories and local projects for context-aware AI assistance.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Work together with your team in real-time with shared projects and collaborative features.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Lightning Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Optimized for speed with modern web technologies and intelligent caching.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Debug Section - Remove in production */}
        <div className="mb-16">
          <FeatureFlagTest />
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Ready to transform your development workflow?</h2>
          <p className="text-muted-foreground">
            Join thousands of developers who are building better web applications with AI assistance.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/signup">
              Start Building Today
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
