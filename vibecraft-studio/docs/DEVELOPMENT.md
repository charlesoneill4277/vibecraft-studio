# VibeCraft Studio Development Guide

## Project Overview

VibeCraft Studio is a comprehensive modular platform that empowers non-coders to build professional web applications through organized, project-specific workspaces.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN/UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Code Quality**: ESLint, Prettier
- **Package Manager**: npm

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   ├── dashboard/                # Main dashboard
│   ├── projects/[id]/            # Project workspace
│   └── api/                      # API routes
├── components/
│   ├── ui/                       # ShadCN/UI components
│   ├── layout/                   # Layout components
│   ├── project/                  # Project-specific components
│   ├── ai/                       # AI interaction components
│   └── collaboration/            # Real-time collaboration
├── lib/
│   ├── supabase/                 # Supabase client and utilities
│   ├── ai/                       # AI provider integrations
│   ├── github/                   # GitHub API integration
│   └── utils/                    # Utility functions
├── hooks/                        # Custom React hooks
└── types/                        # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd vibecraft-studio
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your actual values:
   - Supabase project URL and keys
   - AI provider API keys
   - GitHub OAuth credentials
   - NextAuth secret

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Configuration

### Environment Files

- `.env.local` - Local development (not committed)
- `.env.development` - Development environment settings
- `.env.staging` - Staging environment settings
- `.env.production` - Production environment settings
- `.env.example` - Template for environment variables

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Providers
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
STRAICO_API_KEY=your_straico_api_key

# GitHub Integration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Security
NEXTAUTH_SECRET=your_nextauth_secret
```

## Development Scripts

```bash
# Development
npm run dev                 # Start development server
npm run dev:staging        # Start with staging environment

# Building
npm run build              # Build for production
npm run build:staging      # Build for staging
npm run build:production   # Build for production

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format code with Prettier
npm run format:check       # Check code formatting
npm run type-check         # Run TypeScript type checking
npm run validate           # Run all quality checks

# Utilities
npm run clean              # Clean build artifacts
```

## Code Quality Standards

### ESLint Configuration

The project uses ESLint with:

- Next.js recommended rules
- TypeScript support
- Prettier integration
- Custom rules for code quality

### Prettier Configuration

Consistent code formatting with:

- Single quotes
- Semicolons
- 2-space indentation
- 80 character line width
- Trailing commas (ES5)

### TypeScript Configuration

Strict TypeScript configuration with:

- Strict mode enabled
- Path mapping for imports (`@/`)
- Type checking for all files

## Development Workflow

### 1. Feature Development

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards

3. Run quality checks:

   ```bash
   npm run validate
   ```

4. Commit your changes:

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. Push and create a pull request

### 2. Code Review Process

- All code must pass ESLint and Prettier checks
- TypeScript compilation must succeed
- Follow the established project structure
- Include appropriate tests for new features
- Update documentation as needed

### 3. Deployment Process

#### Development

- Automatic deployment on push to `develop` branch
- Environment: `.env.development`

#### Staging

- Manual deployment from `staging` branch
- Environment: `.env.staging`
- Used for testing and client review

#### Production

- Manual deployment from `main` branch
- Environment: `.env.production`
- Requires approval and testing

## Feature Flags

The application uses feature flags for controlled rollouts:

```typescript
// In your component
import { config } from '@/lib/config';

if (config.features.collaboration) {
  // Render collaboration features
}
```

Available feature flags:

- `NEXT_PUBLIC_ENABLE_COLLABORATION`
- `NEXT_PUBLIC_ENABLE_TEMPLATES`
- `NEXT_PUBLIC_ENABLE_GITHUB_INTEGRATION`
- `NEXT_PUBLIC_ENABLE_ANALYTICS`

## Debugging

### Development Mode

Enable debug mode in development:

```bash
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

### Common Issues

1. **Environment Variables Not Loading**
   - Check file naming (`.env.local` not `.env`)
   - Restart development server after changes
   - Verify variable names start with `NEXT_PUBLIC_` for client-side

2. **TypeScript Errors**
   - Run `npm run type-check` to see all errors
   - Check import paths use `@/` alias
   - Ensure all types are properly defined

3. **Styling Issues**
   - Verify Tailwind classes are correct
   - Check ShadCN/UI component imports
   - Ensure CSS is properly imported in layout

## Contributing

1. Follow the established code style and structure
2. Write meaningful commit messages
3. Include tests for new features
4. Update documentation as needed
5. Ensure all quality checks pass before submitting PR

## Support

For development questions or issues:

1. Check this documentation first
2. Review the project's issue tracker
3. Ask in the development team chat
4. Create a detailed issue if needed

## Next Steps

After completing the foundation setup:

1. Set up Supabase database schema
2. Implement authentication system
3. Create core project management features
4. Add AI provider integrations
5. Build the knowledge repository system
