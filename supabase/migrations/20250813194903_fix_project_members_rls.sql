-- Fix circular reference in project_members RLS policies
-- This removes the problematic policy that was checking project_members from within project_members

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view project members if they are members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON public.project_members;

-- Create new non-circular policies for project_members
CREATE POLICY "Users can view project members if they own the project" ON public.project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can insert members" ON public.project_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can update members" ON public.project_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can delete members" ON public.project_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- Also update the projects policies to be simpler
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

-- Keep the simple policy for project owners
CREATE POLICY "Users can view projects they are members of" ON public.projects
    FOR SELECT USING (user_id = auth.uid());