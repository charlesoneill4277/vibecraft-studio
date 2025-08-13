-- Development seed data with actual auth users
-- This file should be run AFTER creating auth users through Supabase Auth

-- PREREQUISITES:
-- 1. Create auth users first through Supabase Dashboard or application signup:
--    - Email: demo@vibecraft.studio (password: demo123456)
--    - Email: collaborator@vibecraft.studio (password: collab123456)
-- 2. Get the actual UUIDs from auth.users table
-- 3. Replace the placeholder UUIDs below with the real ones

-- Step 1: Get actual user IDs
-- Run this query first to get the real user IDs:
-- SELECT id, email FROM auth.users WHERE email IN ('demo@vibecraft.studio', 'collaborator@vibecraft.studio');

-- Step 2: Replace these placeholder variables with actual UUIDs
-- Example: SET @demo_user_id = 'actual-uuid-from-auth-users';
-- For now, you'll need to manually replace the UUIDs in the INSERT statements below

-- Insert users into public.users table (using actual auth user IDs)
INSERT INTO public.users (id, email, full_name) VALUES
  ('REPLACE_WITH_DEMO_USER_UUID', 'demo@vibecraft.studio', 'Demo User'),
  ('REPLACE_WITH_COLLABORATOR_USER_UUID', 'collaborator@vibecraft.studio', 'Collaborator User')
ON CONFLICT (id) DO NOTHING;

-- Insert sample projects
INSERT INTO public.projects (id, user_id, name, description, settings) VALUES
  (
    '660e8400-e29b-41d4-a716-446655440000',
    'REPLACE_WITH_DEMO_USER_UUID',
    'E-commerce Website',
    'A modern e-commerce platform with React and Node.js',
    '{"defaultAIProvider": "openai", "defaultModel": "gpt-4", "collaborationEnabled": true}'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'REPLACE_WITH_DEMO_USER_UUID',
    'Portfolio Website',
    'Personal portfolio website with blog functionality',
    '{"defaultAIProvider": "anthropic", "defaultModel": "claude-3-sonnet", "collaborationEnabled": false}'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample project members
INSERT INTO public.project_members (project_id, user_id, role, permissions) VALUES
  (
    '660e8400-e29b-41d4-a716-446655440000',
    'REPLACE_WITH_DEMO_USER_UUID',
    'owner',
    '{"canEdit": true, "canDelete": true, "canInvite": true}'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440000',
    'REPLACE_WITH_COLLABORATOR_USER_UUID',
    'editor',
    '{"canEdit": true, "canDelete": false, "canInvite": false}'
  )
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Insert sample project prompts
INSERT INTO public.project_prompts (project_id, role, content, ai_provider, model, metadata) VALUES
  (
    '660e8400-e29b-41d4-a716-446655440000',
    'user',
    'I want to create an e-commerce website with product catalog, shopping cart, and payment integration.',
    'openai',
    'gpt-4',
    '{"tokens": 1250, "cost": 0.025}'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440000',
    'assistant',
    'I''ll help you create a modern e-commerce website. Let''s start by planning the architecture and key features...',
    'openai',
    'gpt-4',
    '{"tokens": 2100, "cost": 0.042}'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'user',
    'Create a portfolio website that showcases my web development projects with a clean, modern design.',
    'anthropic',
    'claude-3-sonnet',
    '{"tokens": 980, "cost": 0.015}'
  )
ON CONFLICT DO NOTHING;

-- Insert sample project knowledge
INSERT INTO public.project_knowledge (project_id, title, content, category, metadata) VALUES
  (
    '660e8400-e29b-41d4-a716-446655440000',
    'Project Requirements',
    'Key requirements for the e-commerce platform:
- Product catalog with categories
- Shopping cart functionality
- User authentication
- Payment processing
- Order management
- Admin dashboard',
    'documentation',
    '{"tags": ["requirements", "planning"], "version": "1.0"}'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440000',
    'API Documentation',
    'REST API endpoints for the e-commerce platform...',
    'documentation',
    '{"tags": ["api", "backend"], "version": "1.0"}'
  ),
  (
    '660e8400-e29b-41d4-a716-446655440001',
    'Design System',
    'Color palette, typography, and component guidelines for the portfolio website.',
    'documentation',
    '{"tags": ["design", "ui"], "version": "1.0"}'
  )
ON CONFLICT DO NOTHING;

-- Insert sample public templates
INSERT INTO public.templates (user_id, name, content, category, is_public, metadata) VALUES
  (
    'REPLACE_WITH_DEMO_USER_UUID',
    'React Component Template',
    'import React from ''react''

interface {{ComponentName}}Props {
  // Define props here
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = (props) => {
  return (
    <div>
      {/* Component content */}
    </div>
  )
}',
    'code',
    true,
    '{"language": "typescript", "framework": "react"}'
  ),
  (
    'REPLACE_WITH_DEMO_USER_UUID',
    'API Route Template',
    'import { NextRequest, NextResponse } from ''next/server''

export async function GET(request: NextRequest) {
  try {
    // Handle GET request
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: ''Internal Server Error'' }, { status: 500 })
  }
}',
    'code',
    true,
    '{"language": "typescript", "framework": "nextjs"}'
  ),
  (
    'REPLACE_WITH_DEMO_USER_UUID',
    'Database Model Template',
    'export interface {{ModelName}} {
  id: string
  created_at: string
  updated_at: string
  // Add your fields here
}

export type Create{{ModelName}} = Omit<{{ModelName}}, ''id'' | ''created_at'' | ''updated_at''>
export type Update{{ModelName}} = Partial<Create{{ModelName}}>',
    'code',
    true,
    '{"language": "typescript", "framework": "database"}'
  )
ON CONFLICT DO NOTHING;

-- Insert sample AI providers (with dummy encrypted keys)
INSERT INTO public.ai_providers (user_id, provider, api_key_encrypted, is_active, settings) VALUES
  (
    'REPLACE_WITH_DEMO_USER_UUID',
    'openai',
    'encrypted_dummy_key_openai',
    true,
    '{"defaultModel": "gpt-4", "maxTokens": 4000, "temperature": 0.7}'
  ),
  (
    'REPLACE_WITH_DEMO_USER_UUID',
    'anthropic',
    'encrypted_dummy_key_anthropic',
    true,
    '{"defaultModel": "claude-3-sonnet", "maxTokens": 4000, "temperature": 0.7}'
  )
ON CONFLICT (user_id, provider) DO NOTHING;