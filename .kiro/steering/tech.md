# VibeCraft Studio - Technical Stack

## Framework & Core Technologies
- **Next.js 15.4.6** - React framework with App Router and server-side rendering
- **TypeScript 5** - Type-safe development with strict mode enabled
- **React 19.1.0** - Latest React with concurrent features
- **Node.js 18+** - Runtime environment

## Styling & UI
- **Tailwind CSS 4** - Utility-first CSS framework with custom configuration
- **ShadCN/UI** - Component library using Radix UI primitives
- **Lucide React** - Icon library
- **PostCSS** - CSS processing and optimization

## Backend & Database
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Supabase Auth** - Authentication with multiple providers
- **Row-Level Security (RLS)** - Database security model
- **Supabase Storage** - File and asset management

## Development Tools
- **ESLint** - Code linting with Next.js and TypeScript rules
- **Prettier** - Code formatting with specific configuration
- **tsx** - TypeScript execution for scripts
- **Turbopack** - Fast bundler for development

## Key Dependencies
- **@supabase/supabase-js** - Supabase client
- **@supabase/ssr** - Server-side rendering support
- **zod** - Schema validation
- **date-fns** - Date manipulation
- **recharts** - Data visualization
- **class-variance-authority** - Component variant management

## Common Commands

### Development
```bash
npm run dev                 # Start development server with Turbopack
npm run dev:staging        # Start with staging environment
npm run build              # Build for production
npm run start              # Start production server
```

### Code Quality
```bash
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues automatically
npm run format             # Format code with Prettier
npm run format:check       # Check formatting without changes
npm run type-check         # Run TypeScript type checking
npm run validate           # Run all quality checks (type-check + lint + format)
```

### Database Operations
```bash
npm run db:init            # Initialize database tables
npm run db:migrate         # Run database migrations
npm run db:seed            # Seed database with initial data
npm run db:setup-dev       # Setup development data
npm run db:backup          # Backup database
npm run db:validate        # Validate database setup
```

### Testing Scripts
```bash
npm run auth:test          # Test authentication system
npm run project:test-crud  # Test project CRUD operations
npm run feature-flags:test # Test feature flags system
```

### Utilities
```bash
npm run clean              # Clean build artifacts (.next, out, dist)
```

## Code Style Configuration

### Prettier Settings
- Semi-colons: enabled
- Single quotes: enabled
- Print width: 80 characters
- Tab width: 2 spaces
- Trailing commas: ES5 style
- Arrow function parentheses: avoid when possible

### ESLint Rules
- Unused variables: error (ignore with `_` prefix)
- Explicit return types: disabled
- `any` type: warning only
- Next.js and TypeScript best practices enforced

## Environment Configuration
- **Development**: `.env.development`
- **Staging**: `.env.staging` 
- **Production**: `.env.production`
- **Local**: `.env.local` (overrides all)

## Path Aliases
- `@/*` maps to `./src/*`
- Components: `@/components`
- Utils: `@/lib/utils`
- UI: `@/components/ui`
- Hooks: `@/hooks`

## Build Configuration
- ESLint errors ignored during builds (development focus)
- TypeScript errors ignored during builds (development focus)
- Package imports optimized for Supabase libraries
- Turbopack enabled for faster development builds