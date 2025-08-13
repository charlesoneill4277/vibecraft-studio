# VibeCraft Studio Setup Guide

## Quick Start

This guide will help you set up VibeCraft Studio for local development in under 10 minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)
- **Code Editor** - We recommend [VS Code](https://code.visualstudio.com/)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd vibecraft-studio

# Install dependencies
npm install
```

## Step 2: Environment Setup

1. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and update the following variables:

### Required for Basic Development

```bash
# Application URLs (default values work for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# NextAuth Secret (generate a random string)
NEXTAUTH_SECRET=your-random-secret-here
```

### Required for Full Functionality

You'll need to set up these services for complete functionality:

#### Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and anon key from Settings > API
3. Update your `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

#### AI Provider Setup (Optional for initial development)

Add API keys for the AI providers you want to use:

```bash
OPENAI_API_KEY=sk-your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
STRAICO_API_KEY=your_straico_key_here
```

#### GitHub Integration (Optional)

For GitHub repository integration:

1. Create a GitHub OAuth App in your GitHub settings
2. Add the credentials:
   ```bash
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   ```

## Step 3: Start Development

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Step 4: Verify Setup

Run the validation script to ensure everything is configured correctly:

```bash
npm run validate
```

This will check:

- TypeScript compilation
- ESLint rules
- Code formatting
- Environment variables

## Development Tools Setup

### VS Code Extensions (Recommended)

Install these extensions for the best development experience:

1. **ES7+ React/Redux/React-Native snippets**
2. **Tailwind CSS IntelliSense**
3. **TypeScript Importer**
4. **Prettier - Code formatter**
5. **ESLint**
6. **Auto Rename Tag**
7. **Bracket Pair Colorizer**

### VS Code Settings

Add this to your VS Code settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Port 3000 Already in Use

```bash
# Kill the process using port 3000
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
```

#### 2. Environment Variables Not Loading

- Ensure your `.env.local` file is in the root directory
- Restart the development server after making changes
- Check that client-side variables start with `NEXT_PUBLIC_`

#### 3. TypeScript Errors

```bash
# Check for TypeScript errors
npm run type-check

# Clear Next.js cache if needed
npm run clean
npm run dev
```

#### 4. Styling Issues

- Ensure Tailwind CSS is properly configured
- Check that ShadCN/UI components are imported correctly
- Verify CSS imports in your layout files

#### 5. Module Resolution Issues

- Check that your import paths use the `@/` alias
- Ensure `tsconfig.json` paths are configured correctly
- Restart your TypeScript language server in VS Code

### Getting Help

If you encounter issues:

1. **Check the logs** - Look at the terminal output for error messages
2. **Clear cache** - Run `npm run clean` and restart
3. **Check environment** - Verify all required environment variables are set
4. **Review documentation** - Check `docs/DEVELOPMENT.md` for detailed information
5. **Ask for help** - Create an issue or ask in the team chat

## Next Steps

Once your setup is complete:

1. **Explore the codebase** - Familiarize yourself with the project structure
2. **Read the development guide** - Check `docs/DEVELOPMENT.md`
3. **Run the application** - Test the basic functionality
4. **Set up database** - Follow the database setup guide (coming next)
5. **Start developing** - Pick up a task from the implementation plan

## Development Workflow

### Daily Development

```bash
# Start your day
git pull origin develop
npm install  # In case dependencies changed
npm run dev

# Before committing
npm run validate
git add .
git commit -m "your commit message"
git push
```

### Code Quality

The project enforces code quality through:

- **ESLint** - Code linting and best practices
- **Prettier** - Consistent code formatting
- **TypeScript** - Type safety and better IDE support
- **Husky** - Git hooks for pre-commit checks (if configured)

### Feature Development

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run quality checks: `npm run validate`
4. Commit and push your changes
5. Create a pull request

## Environment-Specific Development

### Development Environment

```bash
npm run dev  # Uses .env.development + .env.local
```

### Staging Environment

```bash
npm run dev:staging  # Uses .env.staging + .env.local
```

### Production Build Testing

```bash
npm run build:production
npm run start:production
```

## Success Checklist

- [ ] Node.js 18+ installed
- [ ] Repository cloned and dependencies installed
- [ ] Environment variables configured
- [ ] Development server starts without errors
- [ ] Application loads at http://localhost:3000
- [ ] Code quality checks pass (`npm run validate`)
- [ ] VS Code extensions installed (if using VS Code)

You're now ready to start developing VibeCraft Studio! 🚀
