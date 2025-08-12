# Authentication and Database Setup Guide

## The Foreign Key Issue

You encountered this error because the `public.users` table has a foreign key constraint that references `auth.users(id)`. In Supabase, users must first exist in the authentication system before they can be inserted into custom tables.

```sql
-- This constraint requires the user to exist in auth.users first
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    -- other fields...
);
```

## Correct Setup Process

### Step 1: Create Database Schema

1. **Visit Supabase Dashboard**: https://supabase.com/dashboard/project/uyeltqsdrsqbdkzqyvvm/editor

2. **Execute Schema Migration**:
   ```sql
   -- Copy and paste contents of supabase/migrations/001_initial_schema.sql
   ```

3. **Execute RLS Policies**:
   ```sql
   -- Copy and paste contents of supabase/migrations/002_rls_policies.sql
   ```

4. **Basic Seed (Safe)**:
   ```sql
   -- Copy and paste contents of supabase/seed.sql
   -- This just validates the schema, no user data
   ```

### Step 2: Create Authentication Users

Before you can add any user-related data, create auth users:

1. **Go to Authentication**: https://supabase.com/dashboard/project/uyeltqsdrsqbdkzqyvvm/auth/users

2. **Add Users** (click "Add user"):
   - **User 1**:
     - Email: `demo@vibecraft.studio`
     - Password: `demo123456`
     - Auto Confirm: ✅ (check this box)
   
   - **User 2**:
     - Email: `collaborator@vibecraft.studio`
     - Password: `collab123456`
     - Auto Confirm: ✅ (check this box)

### Step 3: Get User IDs

After creating auth users, get their UUIDs:

1. **Go to SQL Editor**: https://supabase.com/dashboard/project/uyeltqsdrsqbdkzqyvvm/sql

2. **Run this query**:
   ```sql
   SELECT id, email FROM auth.users 
   WHERE email IN ('demo@vibecraft.studio', 'collaborator@vibecraft.studio');
   ```

3. **Note the UUIDs** - you'll need them for the next step

### Step 4: Setup Development Data (Automated)

Use our helper script to automatically create the seed data:

```bash
npm run db:setup-dev
```

This script will:
- Check if the required auth users exist
- Get their UUIDs automatically
- Create a customized seed file with the correct UUIDs
- Generate `supabase/seed-dev-ready.sql`

### Step 5: Execute Development Seed

1. **Copy the generated file**: `supabase/seed-dev-ready.sql`
2. **Paste and run in Supabase SQL Editor**
3. **Verify the data was created successfully**

## Manual Alternative

If you prefer to do it manually:

1. **Copy** `supabase/seed-with-auth.sql`
2. **Replace** all instances of:
   - `REPLACE_WITH_DEMO_USER_UUID` → actual demo user UUID
   - `REPLACE_WITH_COLLABORATOR_USER_UUID` → actual collaborator user UUID
3. **Execute** the modified SQL in Supabase SQL Editor

## Verification

After setup, verify everything works:

```bash
# Test the database connection and schema
npm run db:validate

# Start the development server
npm run dev
```

## Understanding the Auth Flow

### Why This Happens

1. **Supabase Auth** manages users in the `auth.users` table
2. **Your app** extends user data in `public.users` table
3. **Foreign key constraint** ensures data integrity
4. **RLS policies** use `auth.uid()` to enforce security

### The Correct Flow

```
1. User signs up → auth.users entry created
2. Trigger/app code → public.users entry created
3. User creates projects → public.projects entries
4. RLS policies → ensure user only sees their data
```

### In Production

In a real application:
- Users sign up through your app
- A database trigger or application code creates the `public.users` entry
- No manual seed data needed

## Troubleshooting

### "User not found" errors
- Ensure auth users exist in Supabase Dashboard
- Check that UUIDs match between auth.users and public.users

### RLS policy errors
- Verify you're authenticated when testing
- Check that policies allow the operations you're trying

### Foreign key constraint errors
- Always create auth users before public users
- Use the correct UUIDs from auth.users table

## Next Steps

Once setup is complete:

1. **Test Authentication**: Try logging in with the demo users
2. **Create Projects**: Test the project creation flow
3. **Test Features**: Upload knowledge, create prompts, etc.
4. **Monitor**: Use Supabase Dashboard to monitor usage

## Production Considerations

For production deployment:
- Set up proper user registration flow
- Implement email verification
- Configure proper RLS policies
- Set up monitoring and backups
- Use environment-specific credentials