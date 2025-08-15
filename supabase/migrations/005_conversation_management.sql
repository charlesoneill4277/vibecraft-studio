-- Migration: Add conversation management support
-- This migration adds conversation grouping, threading, and branching capabilities

-- Create conversations table for organizing chat sessions
CREATE TABLE public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    description TEXT,
    parent_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    branch_point_message_id UUID, -- Will reference project_prompts(id) after we add conversation_id
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add conversation_id to project_prompts to group messages
ALTER TABLE public.project_prompts 
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Add message threading support
ALTER TABLE public.project_prompts 
ADD COLUMN parent_message_id UUID REFERENCES public.project_prompts(id) ON DELETE SET NULL,
ADD COLUMN thread_depth INTEGER DEFAULT 0,
ADD COLUMN is_branch_point BOOLEAN DEFAULT FALSE;

-- Add conversation search and organization fields
ALTER TABLE public.conversations
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN message_count INTEGER DEFAULT 0,
ADD COLUMN total_tokens INTEGER DEFAULT 0,
ADD COLUMN total_cost DECIMAL(10,6) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX idx_conversations_project_id ON public.conversations(project_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_parent_id ON public.conversations(parent_conversation_id);
CREATE INDEX idx_conversations_tags ON public.conversations USING GIN(tags);

CREATE INDEX idx_project_prompts_conversation_id ON public.project_prompts(conversation_id);
CREATE INDEX idx_project_prompts_parent_message_id ON public.project_prompts(parent_message_id);
CREATE INDEX idx_project_prompts_thread_depth ON public.project_prompts(thread_depth);

-- Add foreign key constraint for branch_point_message_id after conversation_id is populated
-- This will be done in a separate step to avoid circular dependency

-- Create function to update conversation metadata when messages are added/updated
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update conversation stats when messages are inserted/updated/deleted
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.conversations 
        SET 
            last_message_at = NOW(),
            updated_at = NOW(),
            message_count = (
                SELECT COUNT(*) 
                FROM public.project_prompts 
                WHERE conversation_id = NEW.conversation_id
            ),
            total_tokens = COALESCE((
                SELECT SUM(CAST(metadata->>'tokens' AS INTEGER))
                FROM public.project_prompts 
                WHERE conversation_id = NEW.conversation_id
                AND metadata->>'tokens' IS NOT NULL
            ), 0),
            total_cost = COALESCE((
                SELECT SUM(CAST(metadata->>'cost' AS DECIMAL))
                FROM public.project_prompts 
                WHERE conversation_id = NEW.conversation_id
                AND metadata->>'cost' IS NOT NULL
            ), 0)
        WHERE id = NEW.conversation_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.conversations 
        SET 
            updated_at = NOW(),
            message_count = (
                SELECT COUNT(*) 
                FROM public.project_prompts 
                WHERE conversation_id = OLD.conversation_id
            ),
            total_tokens = COALESCE((
                SELECT SUM(CAST(metadata->>'tokens' AS INTEGER))
                FROM public.project_prompts 
                WHERE conversation_id = OLD.conversation_id
                AND metadata->>'tokens' IS NOT NULL
            ), 0),
            total_cost = COALESCE((
                SELECT SUM(CAST(metadata->>'cost' AS DECIMAL))
                FROM public.project_prompts 
                WHERE conversation_id = OLD.conversation_id
                AND metadata->>'cost' IS NOT NULL
            ), 0)
        WHERE id = OLD.conversation_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update conversation metadata
CREATE TRIGGER trigger_update_conversation_metadata
    AFTER INSERT OR UPDATE OR DELETE ON public.project_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_metadata();

-- Create function to auto-generate conversation titles based on first message
CREATE OR REPLACE FUNCTION generate_conversation_title(conversation_id UUID)
RETURNS TEXT AS $$
DECLARE
    first_message TEXT;
    generated_title TEXT;
BEGIN
    -- Get the first user message from the conversation
    SELECT content INTO first_message
    FROM public.project_prompts
    WHERE conversation_id = generate_conversation_title.conversation_id
    AND role = 'user'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_message IS NOT NULL THEN
        -- Generate title from first 50 characters of first message
        generated_title := TRIM(SUBSTRING(first_message FROM 1 FOR 50));
        IF LENGTH(first_message) > 50 THEN
            generated_title := generated_title || '...';
        END IF;
        
        -- Update the conversation title
        UPDATE public.conversations 
        SET title = generated_title, updated_at = NOW()
        WHERE id = generate_conversation_title.conversation_id;
        
        RETURN generated_title;
    END IF;
    
    RETURN 'New Conversation';
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Project members can view conversations
CREATE POLICY "Project members can view conversations" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = conversations.project_id AND user_id = auth.uid()
        )
    );

-- Project members can create conversations
CREATE POLICY "Project members can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = conversations.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Project members can update conversations
CREATE POLICY "Project members can update conversations" ON public.conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = conversations.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin', 'editor')
        )
    );

-- Project owners can delete conversations
CREATE POLICY "Project owners can delete conversations" ON public.conversations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE id = project_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = conversations.project_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Create a default conversation for existing project_prompts
-- This ensures backward compatibility with existing chat messages
INSERT INTO public.conversations (project_id, title, description, created_at, updated_at)
SELECT DISTINCT 
    project_id,
    'Legacy Conversation',
    'Automatically created for existing messages',
    MIN(created_at),
    MAX(created_at)
FROM public.project_prompts
WHERE conversation_id IS NULL
GROUP BY project_id;

-- Update existing project_prompts to use the default conversation
UPDATE public.project_prompts 
SET conversation_id = (
    SELECT c.id 
    FROM public.conversations c 
    WHERE c.project_id = project_prompts.project_id 
    AND c.title = 'Legacy Conversation'
    LIMIT 1
)
WHERE conversation_id IS NULL;

-- Make conversation_id NOT NULL after populating existing data
ALTER TABLE public.project_prompts 
ALTER COLUMN conversation_id SET NOT NULL;

-- Now we can safely add the foreign key constraint for branch_point_message_id
ALTER TABLE public.conversations
ADD CONSTRAINT fk_branch_point_message 
FOREIGN KEY (branch_point_message_id) 
REFERENCES public.project_prompts(id) 
ON DELETE SET NULL;

-- Create view for conversation summaries with latest message info
CREATE VIEW public.conversation_summaries AS
SELECT 
    c.*,
    p.name as project_name,
    latest_msg.content as latest_message,
    latest_msg.role as latest_message_role,
    latest_msg.created_at as latest_message_time,
    user_msg_count.count as user_message_count,
    assistant_msg_count.count as assistant_message_count
FROM public.conversations c
JOIN public.projects p ON c.project_id = p.id
LEFT JOIN LATERAL (
    SELECT content, role, created_at
    FROM public.project_prompts
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
) latest_msg ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM public.project_prompts
    WHERE conversation_id = c.id AND role = 'user'
) user_msg_count ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM public.project_prompts
    WHERE conversation_id = c.id AND role = 'assistant'
) assistant_msg_count ON true;

-- Grant necessary permissions
GRANT SELECT ON public.conversation_summaries TO authenticated;
GRANT ALL ON public.conversations TO authenticated;