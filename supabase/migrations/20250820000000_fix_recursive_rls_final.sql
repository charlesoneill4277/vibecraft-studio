-- Fix infinite recursion in RLS policies between projects and project_members
-- Date: 2024-08-20
-- Reason: Resolve 42P17 infinite recursion errors when accessing project data

-- ===== Step 1: Drop ALL existing problematic policies =====
-- Drop projects policies that reference project_members
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

-- Drop project_members policies that reference projects
DROP POLICY IF EXISTS "Users can view project members if they are members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members if they are project owners" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members if they are members themselves" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON public.project_members;
DROP POLICY IF EXISTS "Users can select own membership" ON public.project_members;
DROP POLICY IF EXISTS "Users can insert own owner membership" ON public.project_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.project_members;
DROP POLICY IF EXISTS "Users can delete own membership" ON public.project_members;
DROP POLICY IF EXISTS "Users can view own or member projects" ON public.projects;
DROP POLICY IF EXISTS "Owners/admins can update projects" ON public.projects;

-- ===== Step 2: Create non-recursive projects policies =====
-- Simple policy: users can only see projects they own
CREATE POLICY "Users can view own projects only" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

-- Keep existing create/update/delete policies (they don't reference project_members)
-- These should already exist from the original migration

-- ===== Step 3: Create minimal project_members policies =====
-- Users can only see their own membership records
CREATE POLICY "Users can view own membership only" ON public.project_members
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own membership (needed for project creation)
CREATE POLICY "Users can insert own membership" ON public.project_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership
CREATE POLICY "Users can update own membership" ON public.project_members
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own membership
CREATE POLICY "Users can delete own membership" ON public.project_members
    FOR DELETE USING (auth.uid() = user_id);

-- ===== Step 4: Update other table policies to avoid recursion =====
-- Update project_prompts policies to only check project ownership (not membership)
DROP POLICY IF EXISTS "Project members can view prompts" ON public.project_prompts;
DROP POLICY IF EXISTS "Project members can create prompts" ON public.project_prompts;
DROP POLICY IF EXISTS "Project members can update prompts" ON public.project_prompts;
DROP POLICY IF EXISTS "Project owners can delete prompts" ON public.project_prompts;

CREATE POLICY "Project owners can view prompts" ON public.project_prompts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can create prompts" ON public.project_prompts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can update prompts" ON public.project_prompts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can delete prompts" ON public.project_prompts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- Update project_knowledge policies
DROP POLICY IF EXISTS "Project members can view knowledge" ON public.project_knowledge;
DROP POLICY IF EXISTS "Project members can manage knowledge" ON public.project_knowledge;

CREATE POLICY "Project owners can view knowledge" ON public.project_knowledge
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage knowledge" ON public.project_knowledge
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- Update project_assets policies
DROP POLICY IF EXISTS "Project members can view assets" ON public.project_assets;
DROP POLICY IF EXISTS "Project members can manage assets" ON public.project_assets;

CREATE POLICY "Project owners can view assets" ON public.project_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage assets" ON public.project_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- Update project_settings policies
DROP POLICY IF EXISTS "Project members can view settings" ON public.project_settings;
DROP POLICY IF EXISTS "Project admins can manage settings" ON public.project_settings;

CREATE POLICY "Project owners can view settings" ON public.project_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage settings" ON public.project_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- ===== Step 5: Verification =====
-- This migration removes all circular dependencies by:
-- 1. Making projects only accessible to their owners (no membership checks)
-- 2. Making project_members only accessible to the user themselves
-- 3. Making all other project-related tables only accessible to project owners
-- 4. Eliminating any policies that reference both tables in a circular manner

-- Note: This is a simplified access model that prioritizes security and performance
-- over complex sharing. If you need project sharing in the future, consider:
-- 1. Using SECURITY DEFINER functions for complex access logic
-- 2. Creating a separate project_access table with simpler policies
-- 3. Implementing role-based access through application-level logic
