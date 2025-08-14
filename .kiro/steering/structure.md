# VibeCraft Studio - Project Structure

## Root Directory Organization

### Configuration Files
- **package.json** - Dependencies and npm scripts
- **tsconfig.json** - TypeScript configuration with strict mode
- **next.config.ts** - Next.js configuration with optimizations
- **eslint.config.mjs** - ESLint rules and extensions
- **.prettierrc** - Code formatting rules
- **components.json** - ShadCN/UI component configuration
- **postcss.config.mjs** - PostCSS and Tailwind configuration
- **middleware.ts** - Next.js middleware for auth and routing

### Environment & Deployment
- **.env.example** - Template for environment variables
- **.env.local** - Local development overrides
- **.env.development** - Development environment config
- **.env.staging** - Staging environment config
- **.env.production** - Production environment config

## Source Code Structure (`src/`)

### Application Routes (`src/app/`)
- Next.js 13+ App Router structure
- Route-based file organization
- Server and client components
- API routes for backend functionality
- Layout components for consistent UI structure

### Reusable Components (`src/components/`)
- **ui/** - ShadCN/UI base components (buttons, inputs, dialogs)
- **layout/** - Layout-specific components (headers, sidebars, navigation)
- **project/** - Project-specific feature components
- **ai/** - AI interaction and chat components
- **collaboration/** - Real-time collaboration features

### Custom Hooks (`src/hooks/`)
- React hooks for state management
- API interaction hooks
- Authentication hooks
- Project-specific business logic hooks

### Utility Libraries (`src/lib/`)
- **utils** - General utility functions
- **supabase** - Database client configuration
- **auth** - Authentication helpers
- **api** - API client functions
- **validations** - Zod schemas and validation logic

### Type Definitions (`src/types/`)
- TypeScript interfaces and types
- Database schema types
- API response types
- Component prop types

## Database & Backend (`supabase/`)

### Database Migrations (`supabase/migrations/`)
- Sequential SQL migration files
- Schema changes and updates
- RLS (Row Level Security) policies
- Indexes and performance optimizations

### Seed Data
- **seed.sql** - Basic seed data
- **seed-dev-ready.sql** - Development-ready data
- **seed-with-auth.sql** - Seed data with authentication

## Scripts Directory (`scripts/`)

### Database Management
- **create-tables.ts** - Initialize database schema
- **migrate.ts** - Run database migrations
- **seed.ts** - Populate with seed data
- **backup.ts** - Database backup utilities
- **validate.ts** - Schema validation

### Testing Scripts
- **test-auth.ts** - Authentication system tests
- **test-project-*.ts** - Project-related functionality tests
- **test-feature-flags.ts** - Feature flag system tests
- **test-comprehensive.ts** - Full system integration tests

### Development Utilities
- **setup-dev-data.ts** - Development environment setup
- **init-*.ts** - Initialize various system components

## Documentation (`docs/`)
- **SETUP.md** - Detailed setup instructions
- **DEVELOPMENT.md** - Development workflow and standards
- **database/** - Database schema documentation

## Public Assets (`public/`)
- Static assets (images, icons, fonts)
- SVG icons and graphics
- Favicon and app icons

## Development Configuration

### IDE Configuration (`.vscode/`)
- Workspace settings
- Recommended extensions
- Debug configurations

### Git Configuration
- **.gitignore** - Excluded files and directories
- **.git/** - Git repository data

## Build Artifacts
- **.next/** - Next.js build output (ignored in git)
- **node_modules/** - Dependencies (ignored in git)

## Naming Conventions

### Files and Directories
- **kebab-case** for file names and directories
- **PascalCase** for React components
- **camelCase** for utility functions and variables
- **UPPER_CASE** for constants and environment variables

### Component Organization
- One component per file
- Index files for barrel exports
- Co-located styles and tests when applicable
- Props interfaces defined in same file as component

### Database Conventions
- **snake_case** for table and column names
- **plural** table names (users, projects, project_members)
- **id** as primary key column name
- **created_at**, **updated_at** for timestamps
- Foreign keys follow pattern: **{table}_id**

## Import Path Conventions
- Use **@/** alias for src directory imports
- Relative imports for same-directory files
- Absolute imports for cross-directory references
- Group imports: external libraries, internal modules, relative imports

## Architecture Patterns

### Component Patterns
- **Server Components** by default (Next.js 13+)
- **Client Components** only when needed (use client directive)
- **Compound Components** for complex UI patterns
- **Render Props** for flexible component composition

### Data Flow
- **Server Actions** for form submissions and mutations
- **React Query/SWR** for client-side data fetching
- **Zustand/Context** for client-side state management
- **Supabase Realtime** for live data updates

### Security Patterns
- **Row Level Security (RLS)** for database access control
- **Server-side validation** with Zod schemas
- **Environment variable** management for secrets
- **CSRF protection** through Next.js built-ins