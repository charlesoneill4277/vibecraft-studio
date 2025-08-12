# VibeCraft Studio

A comprehensive modular platform that empowers non-coders to build professional web applications through organized, project-specific workspaces.

## 🚀 Features

- **Project-Based Workspaces** - Organize your development projects with isolated contexts
- **AI-Powered Development** - Integrate with multiple AI providers (OpenAI, Anthropic, Straico)
- **Knowledge Repository** - Centralized documentation and asset management per project
- **GitHub Integration** - Connect repositories for contextual code assistance
- **Real-time Collaboration** - Work with team members in real-time
- **Template System** - Reusable templates and community marketplace
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + ShadCN/UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Code Quality**: ESLint + Prettier
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Git

## 🚀 Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd vibecraft-studio
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration values.

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [Development Guide](docs/DEVELOPMENT.md) - Development workflow and standards
- [API Documentation](docs/API.md) - API endpoints and usage (coming soon)
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions (coming soon)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
├── components/             # React components
│   ├── ui/                # ShadCN/UI components
│   ├── layout/            # Layout components
│   ├── project/           # Project-specific components
│   ├── ai/                # AI interaction components
│   └── collaboration/     # Real-time collaboration
├── lib/                   # Utility libraries
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions
```

## 🔧 Available Scripts

```bash
# Development
npm run dev                 # Start development server
npm run dev:staging        # Start with staging environment

# Building
npm run build              # Build for production
npm run build:staging      # Build for staging

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format code with Prettier
npm run type-check         # Run TypeScript type checking
npm run validate           # Run all quality checks

# Utilities
npm run clean              # Clean build artifacts
```

## 🌍 Environment Configuration

The application supports multiple environments:

- **Development** (`.env.development`) - Local development
- **Staging** (`.env.staging`) - Testing and client review
- **Production** (`.env.production`) - Live application

Key environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENAI_API_KEY` - OpenAI API key
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID

See `.env.example` for a complete list.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run quality checks (`npm run validate`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 Code Quality

This project maintains high code quality standards:

- **ESLint** for code linting and best practices
- **Prettier** for consistent code formatting
- **TypeScript** for type safety
- **Strict mode** enabled for better error catching

## 🔒 Security

- Environment variables for sensitive data
- Row-level security with Supabase
- API key encryption
- CORS configuration
- Input validation and sanitization

## 📊 Performance

- Code splitting and lazy loading
- Image optimization
- Bundle size optimization
- Database query optimization
- Caching strategies

## 🚀 Deployment

The application can be deployed to various platforms:

- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS**
- **Google Cloud Platform**

See the deployment guide for detailed instructions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the [documentation](docs/)
- Review [existing issues](../../issues)
- Create a [new issue](../../issues/new) for bugs or feature requests
- Join our community discussions

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [ShadCN/UI](https://ui.shadcn.com/) for the beautiful component library

---

Built with ❤️ for the no-code/low-code community
