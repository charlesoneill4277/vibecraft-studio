-- Add policy to allow project owners to view member information
-- This fixes the "member.users is null" error on the project page

-- Allow project owners to view member information for their projects
CREATE POLICY "Project owners can view members" ON public.project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        )
    );

-- Test the fix by running:
-- SELECT * FROM project_members WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()) LIMIT 1;
