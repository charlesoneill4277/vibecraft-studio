-- Fix circular reference in project_members policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view project members if they are members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;

-- Create corrected project_members policies without circular references
CREATE POLICY "Users can view project members if they are project owners" ON public.project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view project members if they are members themselves" ON public.project_members
    FOR SELECT USING (user_id = auth.uid());

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

-- Also fix the projects policy to avoid potential issues
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;

CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view projects they are members of" ON public.projects
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = projects.id AND user_id = auth.uid()
        )
    );