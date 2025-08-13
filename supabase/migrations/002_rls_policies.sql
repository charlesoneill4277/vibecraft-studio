-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects table policies
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = projects.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners can update projects" ON public.projects
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = projects.id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Project owners can delete projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Project members table policies
CREATE POLICY "Users can view project members if they are members" ON public.project_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm2
            WHERE pm2.project_id = project_members.project_id 
            AND pm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Project owners can manage members" ON public.project_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members pm2
            WHERE pm2.project_id = project_members.project_id 
            AND pm2.user_id = auth.uid() 
            AND pm2.role IN ('owner', 'admin')
        )
    );

-- Project prompts table policies
CREATE POLICY "Project members can view prompts" ON public.project_prompts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_prompts.project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can create prompts" ON public.project_prompts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_prompts.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Project members can update prompts" ON public.project_prompts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_prompts.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Project owners can delete prompts" ON public.project_prompts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_prompts.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Project knowledge table policies
CREATE POLICY "Project members can view knowledge" ON public.project_knowledge
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_knowledge.project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can manage knowledge" ON public.project_knowledge
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_knowledge.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Project assets table policies
CREATE POLICY "Project members can view assets" ON public.project_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_assets.project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project members can manage assets" ON public.project_assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_assets.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Project settings table policies
CREATE POLICY "Project members can view settings" ON public.project_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_settings.project_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Project admins can manage settings" ON public.project_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = project_settings.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- AI providers table policies
CREATE POLICY "Users can manage own AI providers" ON public.ai_providers
    FOR ALL USING (auth.uid() = user_id);

-- Templates table policies
CREATE POLICY "Users can view own templates and public templates" ON public.templates
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage own templates" ON public.templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.templates
    FOR DELETE USING (auth.uid() = user_id);