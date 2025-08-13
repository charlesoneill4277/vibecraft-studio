# VibeCraft Studio Database Documentation

## Overview

VibeCraft Studio uses Supabase (PostgreSQL) as its primary database with Row-Level Security (RLS) for multi-tenant data isolation. This document covers the database architecture, setup, and management procedures.

## Quick Start

### 1. Environment Setup

Copy the environment variables:
```bash
cp .env.example .env.development
```

Update the Supabase credentials in `.env.development` (already configured with project credentials).

### 2. Initialize Database

Run the database initialization script:
```bash
npm run db:init
```

This will:
- Create all required tables
- Set up Row-Level Security policies
- Seed development data
- Validate the setup

### 3. Verify Setup

```bash
npm run db:validate
```

## Database Architecture

### Core Tables

- **users**: User profiles (extends Supabase auth.users)
- **projects**: Project workspaces
- **project_members**: Team collaboration
- **project_prompts**: AI conversation history
- **project_knowledge**: Document and knowledge base
- **project_assets**: File uploads and media
- **project_settings**: Flexible project configuration
- **ai_providers**: User AI provider configurations
- **templates**: Reusable templates and resources

### Security Model

All tables use Row-Level Security (RLS) with policies that ensure:
- Users can only access their own data
- Project members can access shared project data based on their role
- Public templates are accessible to all users
- Sensitive data (API keys) is encrypted

## Available Scripts

### Database Management

```bash
# Initialize database (first time setup)
npm run db:init

# Run pending migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Create backup
npm run db:backup

# Validate database integrity
npm run db:validate
```

### Development Workflow

1. **First Time Setup**:
   ```bash
   npm run db:init
   ```

2. **Regular Development**:
   ```bash
   npm run db:validate  # Check everything is working
   npm run dev          # Start development server
   ```

3. **After Schema Changes**:
   ```bash
   npm run db:migrate   # Apply new migrations
   npm run db:validate  # Verify changes
   ```

## Migration System

### Creating Migrations

1. Create a new SQL file in `supabase/migrations/`:
   ```
   003_add_new_feature.sql
   ```

2. Add the migration to the migration manager in `src/lib/supabase/migrations.ts`

3. Run the migration:
   ```bash
   npm run db:migrate
   ```

### Migration Best Practices

- Always include rollback procedures
- Test migrations on development data
- Use transactions for complex changes
- Document breaking changes
- Version your migrations sequentially

## Backup and Recovery

### Automated Backups

- **Daily**: Full database backup
- **Hourly**: Point-in-time snapshots
- **Weekly**: Long-term archives

### Manual Backup

```bash
npm run db:backup
```

### Recovery Procedures

See [Disaster Recovery Documentation](./disaster-recovery.md) for detailed procedures.

## Data Validation

### Validation Schemas

All data is validated using Zod schemas defined in `src/lib/supabase/validation.ts`:

```typescript
import { validateProject } from '@/lib/supabase/validation'

try {
  const validProject = validateProject(projectData)
  // Use validProject...
} catch (error) {
  // Handle validation errors
}
```

### Integrity Checks

Run integrity checks:
```bash
npm run db:validate
```

This checks for:
- Orphaned records
- Constraint violations
- Data consistency issues
- RLS policy compliance

## Performance Optimization

### Indexes

Key indexes are automatically created for:
- Foreign key relationships
- Frequently queried columns
- Sort and filter operations

### Query Optimization

- Use the provided database client methods
- Leverage Supabase's built-in query optimization
- Monitor query performance in development

### Connection Management

- Connection pooling is handled by Supabase
- Use appropriate client types (browser vs server)
- Implement proper error handling

## Security Considerations

### Row-Level Security (RLS)

All tables have RLS enabled with policies that:
- Isolate user data
- Enforce role-based access
- Protect sensitive information

### API Key Encryption

AI provider API keys are encrypted before storage:
```typescript
import { encryptAPIKey } from '@/lib/supabase/encryption'

const encryptedKey = await encryptAPIKey(apiKey)
```

### Audit Logging

Database changes are tracked through:
- Supabase built-in audit logs
- Application-level logging
- Migration history

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Check environment variables
   - Verify Supabase project status
   - Test network connectivity

2. **Permission Errors**
   - Verify RLS policies
   - Check user authentication
   - Validate role assignments

3. **Migration Failures**
   - Check SQL syntax
   - Verify dependencies
   - Review constraint violations

### Debug Mode

Enable debug logging:
```bash
DEBUG=supabase:* npm run dev
```

### Support Channels

- Check Supabase status page
- Review application logs
- Contact Supabase support for infrastructure issues

## Development Guidelines

### Database Client Usage

```typescript
import { db } from '@/lib/supabase/database'

// Get user projects
const projects = await db.getProjects()

// Create new project
const project = await db.createProject({
  name: 'My Project',
  description: 'Project description',
  user_id: userId
})
```

### Error Handling

```typescript
try {
  const result = await db.getProject(projectId)
  return result
} catch (error) {
  console.error('Database error:', error)
  throw new Error('Failed to fetch project')
}
```

### Testing

- Use test database for development
- Seed test data before running tests
- Clean up test data after tests
- Mock database calls in unit tests

## Monitoring and Maintenance

### Health Checks

Regular monitoring includes:
- Database connectivity
- Query performance
- Storage usage
- Backup success rates

### Maintenance Tasks

- **Daily**: Backup verification
- **Weekly**: Performance review
- **Monthly**: Capacity planning
- **Quarterly**: Security audit

### Alerts

Set up alerts for:
- Database downtime
- Backup failures
- High error rates
- Storage limits

## Contributing

### Database Changes

1. Create migration file
2. Update TypeScript types
3. Add validation schemas
4. Update documentation
5. Test thoroughly
6. Submit pull request

### Code Review Checklist

- [ ] Migration is reversible
- [ ] RLS policies are updated
- [ ] Types are generated
- [ ] Validation is implemented
- [ ] Tests are updated
- [ ] Documentation is current

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Design Best Practices](https://supabase.com/docs/guides/database/database-design)

## Support

For database-related issues:
1. Check this documentation
2. Review application logs
3. Test with validation scripts
4. Contact the development team
5. Escalate to Supabase support if needed