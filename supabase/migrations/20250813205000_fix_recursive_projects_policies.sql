-- Fix infinite recursion between projects and project_members RLS policies
-- Strategy:
--  * Remove any project_members policies that reference projects (cycle source)
--  * Keep projects SELECT policy that references project_members (one-way dependency only)
--  * Provide minimal project_members policies (self-only access) needed for current app flows
--  * Allow inserting an owner membership row (done immediately after project creation)
--  * Future enhancement: introduce a project_access table or SECURITY DEFINER function for richer sharing

-- ===== Cleanup existing policies that create recursion =====
DROP POLICY IF EXISTS "Users can view project members if they are members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project members if they own the project" ON public.project_members; -- from prior fix

-- (We purposely do NOT drop the existing projects SELECT policy unless needed; it is fine to keep
--  "Users can view own projects" even if it references project_members. We'll replace it to also allow membership access.)
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects; -- prior simplified variant
-- Also drop existing create/update/delete project policies so we can re-create with new definitions
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Owners/admins can update projects" ON public.projects; -- in case of partial prior run
DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects; -- in case of partial prior run

-- ===== Re-create non-recursive project_members policies =====
-- Access model:
--  SELECT: A user can see only their own membership rows
--  INSERT: A user can create an owner membership ONLY for themselves (performed right after project insert)
--  UPDATE: A user can update their own membership row (not heavily used now)
--  DELETE: A user can delete their own membership row (owners leaving not yet supported in UI)

CREATE POLICY "Users can select own membership" ON public.project_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own owner membership" ON public.project_members
    FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'owner');

CREATE POLICY "Users can update own membership" ON public.project_members
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own membership" ON public.project_members
    FOR DELETE USING (auth.uid() = user_id);

-- ===== Re-create projects policies without recursion SOURCE on project_members side =====
-- Provide combined access (owner OR member) while only referencing project_members (which no longer references projects)
CREATE POLICY "Users can view own or member projects" ON public.projects
    FOR SELECT USING (
        auth.uid() = user_id OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners/admins can update projects" ON public.projects
    FOR UPDATE USING (
        auth.uid() = user_id OR EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = projects.id AND pm.user_id = auth.uid() AND pm.role IN ('owner','admin')
        )
    );

CREATE POLICY "Owners can delete projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- NOTE: If you later need owners to see all membership rows, introduce a SECURITY DEFINER function
--       that bypasses RLS on project_members, or a dedicated project_access table maintained by triggers.

-- ===== Verification Queries (execute manually in SQL editor) =====
-- SELECT * FROM projects LIMIT 1;
-- SELECT * FROM project_members LIMIT 1;
-- (Run both as an authenticated non-service user to ensure no recursion / 42P17 error)
