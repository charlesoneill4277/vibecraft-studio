-- Migration: Add context injection system support
-- This migration adds tables and functions for context injection and feedback

-- Create context_feedback table for tracking context relevance
CREATE TABLE public.context_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    context_item_id TEXT NOT NULL, -- Can reference various types of content
    context_item_type TEXT NOT NULL CHECK (context_item_type IN ('knowledge', 'code', 'asset', 'conversation')),
    feedback TEXT NOT NULL CHECK (feedback IN ('helpful', 'not_helpful', 'irrelevant')),
    user_message TEXT NOT NULL,
    relevance_score DECIMAL(3,2), -- Store the original relevance score
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create context_injection_logs table for analytics
CREATE TABLE public.context_injection_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    context_items_count INTEGER NOT NULL DEFAULT 0,
    total_relevance_score DECIMAL(5,2) DEFAULT 0,
    estimated_tokens INTEGER DEFAULT 0,
    context_types TEXT[] DEFAULT '{}',
    injection_method TEXT DEFAULT 'automatic' CHECK (injection_method IN ('automatic', 'manual', 'suggested')),
    user_accepted BOOLEAN, -- Whether user accepted the suggested context
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_context_feedback_user_id ON public.context_feedback(user_id);
CREATE INDEX idx_context_feedback_item_type ON public.context_feedback(context_item_type);
CREATE INDEX idx_context_feedback_feedback ON public.context_feedback(feedback);
CREATE INDEX idx_context_feedback_created_at ON public.context_feedback(created_at DESC);

CREATE INDEX idx_context_injection_logs_user_id ON public.context_injection_logs(user_id);
CREATE INDEX idx_context_injection_logs_project_id ON public.context_injection_logs(project_id);
CREATE INDEX idx_context_injection_logs_conversation_id ON public.context_injection_logs(conversation_id);
CREATE INDEX idx_context_injection_logs_created_at ON public.context_injection_logs(created_at DESC);

-- Add RLS policies for context_feedback table
ALTER TABLE public.context_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own context feedback" ON public.context_feedback
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own context feedback" ON public.context_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own context feedback" ON public.context_feedback
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own context feedback" ON public.context_feedback
    FOR DELETE USING (user_id = auth.uid());

-- Add RLS policies for context_injection_logs table
ALTER TABLE public.context_injection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own context injection logs" ON public.context_injection_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own context injection logs" ON public.context_injection_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create function to get context relevance statistics
CREATE OR REPLACE FUNCTION get_context_relevance_stats(
    p_user_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    context_type TEXT,
    total_items INTEGER,
    helpful_count INTEGER,
    not_helpful_count INTEGER,
    irrelevant_count INTEGER,
    avg_relevance_score DECIMAL,
    helpfulness_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cf.context_item_type as context_type,
        COUNT(*)::INTEGER as total_items,
        COUNT(CASE WHEN cf.feedback = 'helpful' THEN 1 END)::INTEGER as helpful_count,
        COUNT(CASE WHEN cf.feedback = 'not_helpful' THEN 1 END)::INTEGER as not_helpful_count,
        COUNT(CASE WHEN cf.feedback = 'irrelevant' THEN 1 END)::INTEGER as irrelevant_count,
        AVG(cf.relevance_score) as avg_relevance_score,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND(COUNT(CASE WHEN cf.feedback = 'helpful' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 2)
            ELSE 0 
        END as helpfulness_rate
    FROM public.context_feedback cf
    LEFT JOIN public.context_injection_logs cil ON cil.user_id = cf.user_id
    WHERE cf.user_id = p_user_id
        AND (p_project_id IS NULL OR cil.project_id = p_project_id)
        AND cf.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY cf.context_item_type
    ORDER BY helpful_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to improve context relevance scoring based on feedback
CREATE OR REPLACE FUNCTION calculate_improved_relevance_score(
    p_base_score DECIMAL,
    p_context_item_id TEXT,
    p_context_item_type TEXT,
    p_user_message TEXT
)
RETURNS DECIMAL AS $$
DECLARE
    feedback_adjustment DECIMAL := 0;
    similar_feedback_count INTEGER := 0;
    positive_feedback_count INTEGER := 0;
BEGIN
    -- Get feedback for similar context items
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN feedback = 'helpful' THEN 1 END)
    INTO similar_feedback_count, positive_feedback_count
    FROM public.context_feedback
    WHERE context_item_type = p_context_item_type
        AND (
            context_item_id = p_context_item_id 
            OR similarity(user_message, p_user_message) > 0.3
        );

    -- Adjust score based on feedback
    IF similar_feedback_count > 0 THEN
        feedback_adjustment := (positive_feedback_count::DECIMAL / similar_feedback_count::DECIMAL - 0.5) * 0.2;
    END IF;

    -- Return adjusted score, capped between 0 and 1
    RETURN GREATEST(0, LEAST(1, p_base_score + feedback_adjustment));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log context injection events
CREATE OR REPLACE FUNCTION log_context_injection(
    p_user_id UUID,
    p_project_id UUID,
    p_conversation_id UUID,
    p_user_message TEXT,
    p_context_items_count INTEGER,
    p_total_relevance_score DECIMAL,
    p_estimated_tokens INTEGER,
    p_context_types TEXT[],
    p_injection_method TEXT DEFAULT 'automatic',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.context_injection_logs (
        user_id,
        project_id,
        conversation_id,
        user_message,
        context_items_count,
        total_relevance_score,
        estimated_tokens,
        context_types,
        injection_method,
        metadata
    ) VALUES (
        p_user_id,
        p_project_id,
        p_conversation_id,
        p_user_message,
        p_context_items_count,
        p_total_relevance_score,
        p_estimated_tokens,
        p_context_types,
        p_injection_method,
        p_metadata
    ) RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for context analytics
CREATE VIEW public.context_analytics AS
SELECT 
    cil.project_id,
    p.name as project_name,
    DATE_TRUNC('day', cil.created_at) as date,
    COUNT(*) as total_injections,
    AVG(cil.context_items_count) as avg_context_items,
    AVG(cil.total_relevance_score) as avg_relevance_score,
    AVG(cil.estimated_tokens) as avg_tokens,
    COUNT(CASE WHEN cil.user_accepted = true THEN 1 END) as accepted_suggestions,
    COUNT(CASE WHEN cil.user_accepted = false THEN 1 END) as rejected_suggestions,
    CASE 
        WHEN COUNT(CASE WHEN cil.user_accepted IS NOT NULL THEN 1 END) > 0 THEN
            ROUND(COUNT(CASE WHEN cil.user_accepted = true THEN 1 END)::DECIMAL / 
                  COUNT(CASE WHEN cil.user_accepted IS NOT NULL THEN 1 END)::DECIMAL * 100, 2)
        ELSE NULL 
    END as acceptance_rate
FROM public.context_injection_logs cil
JOIN public.projects p ON cil.project_id = p.id
GROUP BY cil.project_id, p.name, DATE_TRUNC('day', cil.created_at)
ORDER BY date DESC;

-- Grant necessary permissions
GRANT SELECT ON public.context_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_context_relevance_stats(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_improved_relevance_score(DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_context_injection(UUID, UUID, UUID, TEXT, INTEGER, DECIMAL, INTEGER, TEXT[], TEXT, JSONB) TO authenticated;

-- Add context injection settings to projects table
ALTER TABLE public.projects 
ADD COLUMN context_settings JSONB DEFAULT '{
    "auto_inject_knowledge": true,
    "auto_inject_code": true,
    "auto_inject_assets": false,
    "auto_inject_conversations": true,
    "max_context_items": 10,
    "min_relevance_score": 0.3,
    "context_preview_enabled": true,
    "context_editing_enabled": true
}';

-- Create trigger to update project updated_at when context_settings change
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_context_settings
    BEFORE UPDATE OF context_settings ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_updated_at();