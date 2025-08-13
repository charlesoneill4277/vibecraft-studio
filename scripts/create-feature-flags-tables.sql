-- Feature Flags System Database Schema
-- This script creates the necessary tables for the feature flag system

-- Feature flags table - stores global feature flag definitions
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    flag_type VARCHAR(50) NOT NULL DEFAULT 'boolean', -- 'boolean', 'string', 'number', 'json'
    default_value JSONB NOT NULL DEFAULT 'false',
    is_active BOOLEAN NOT NULL DEFAULT true,
    environment VARCHAR(50) NOT NULL DEFAULT 'all', -- 'development', 'staging', 'production', 'all'
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_audience JSONB DEFAULT '{}', -- targeting rules (user roles, segments, etc.)
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User feature flag overrides - allows per-user feature flag overrides
CREATE TABLE IF NOT EXISTS user_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    value JSONB NOT NULL,
    reason TEXT, -- reason for override (testing, beta user, etc.)
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_flag_id)
);

-- Feature flag usage analytics - tracks feature flag usage and performance
CREATE TABLE IF NOT EXISTS feature_flag_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'evaluated', 'enabled', 'disabled', 'error'
    value JSONB,
    metadata JSONB DEFAULT '{}', -- additional context (user agent, project id, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature flag feedback - collects user feedback on features
CREATE TABLE IF NOT EXISTS feature_flag_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    feedback_type VARCHAR(50) DEFAULT 'general', -- 'bug', 'improvement', 'general'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test experiments - manages A/B testing experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    variants JSONB NOT NULL, -- array of variant configurations
    traffic_allocation JSONB NOT NULL, -- percentage allocation per variant
    success_metrics JSONB DEFAULT '{}', -- metrics to track for success
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test assignments - tracks which users are assigned to which variants
CREATE TABLE IF NOT EXISTS ab_experiment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    variant_key VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(experiment_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_active ON feature_flags(is_active);
CREATE INDEX IF NOT EXISTS idx_user_feature_flags_user_id ON user_feature_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_analytics_flag_id ON feature_flag_analytics(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_flag_analytics_created_at ON feature_flag_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_flag_feedback_flag_id ON feature_flag_feedback(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_experiment_assignments_user_id ON ab_experiment_assignments(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiment_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Feature flags - readable by all authenticated users, writable by admins only
CREATE POLICY "Feature flags are readable by authenticated users" ON feature_flags
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Feature flags are writable by admins" ON feature_flags
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

-- User feature flag overrides - users can only see/modify their own
CREATE POLICY "Users can manage their own feature flag overrides" ON user_feature_flags
    FOR ALL USING (auth.uid() = user_id);

-- Feature flag analytics - users can only see their own data, admins can see all
CREATE POLICY "Users can see their own analytics" ON feature_flag_analytics
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Analytics can be inserted by authenticated users" ON feature_flag_analytics
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Feature flag feedback - users can manage their own feedback
CREATE POLICY "Users can manage their own feedback" ON feature_flag_feedback
    FOR ALL USING (auth.uid() = user_id);

-- A/B experiments - readable by all, writable by admins
CREATE POLICY "A/B experiments are readable by authenticated users" ON ab_experiments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "A/B experiments are writable by admins" ON ab_experiments
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

-- A/B experiment assignments - users can see their own assignments
CREATE POLICY "Users can see their own experiment assignments" ON ab_experiment_assignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Experiment assignments can be created by system" ON ab_experiment_assignments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert default feature flags
INSERT INTO feature_flags (name, description, flag_type, default_value, environment) VALUES
    ('collaboration', 'Enable team collaboration features', 'boolean', 'true', 'all'),
    ('templates', 'Enable template marketplace', 'boolean', 'true', 'all'),
    ('github_integration', 'Enable GitHub repository integration', 'boolean', 'true', 'all'),
    ('analytics', 'Enable usage analytics and insights', 'boolean', 'false', 'all'),
    ('ai_chat', 'Enable AI chat functionality', 'boolean', 'false', 'all'),
    ('knowledge_base', 'Enable knowledge base features', 'boolean', 'false', 'all'),
    ('code_integration', 'Enable code integration features', 'boolean', 'false', 'all'),
    ('advanced_search', 'Enable advanced search capabilities', 'boolean', 'false', 'all'),
    ('real_time_collaboration', 'Enable real-time collaborative editing', 'boolean', 'false', 'all'),
    ('mobile_app', 'Enable mobile application features', 'boolean', 'false', 'all')
ON CONFLICT (name) DO NOTHING;