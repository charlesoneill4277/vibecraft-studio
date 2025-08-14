-- Usage Management System Migration
-- This migration adds tables and functions for tracking AI usage, quotas, and billing

-- Create user_subscriptions table for subscription management
CREATE TABLE public.user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'suspended')) DEFAULT 'active',
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_quotas table for tracking user limits
CREATE TABLE public.usage_quotas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'straico', 'cohere')),
    quota_type TEXT NOT NULL CHECK (quota_type IN ('tokens', 'requests', 'cost')),
    monthly_limit BIGINT NOT NULL DEFAULT 0,
    current_usage BIGINT NOT NULL DEFAULT 0,
    reset_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider, quota_type)
);

-- Create ai_usage_logs table for detailed usage tracking
CREATE TABLE public.ai_usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'straico', 'cohere')),
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    request_duration INTEGER, -- in milliseconds
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited', 'quota_exceeded')) DEFAULT 'success',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_alerts table for user notifications
CREATE TABLE public.usage_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('quota_warning', 'quota_exceeded', 'cost_warning', 'upgrade_prompt')),
    provider TEXT CHECK (provider IN ('openai', 'anthropic', 'straico', 'cohere')),
    threshold_percentage INTEGER, -- e.g., 80 for 80% usage warning
    current_usage BIGINT,
    limit_value BIGINT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate_limits table for API rate limiting
CREATE TABLE public.rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL, -- e.g., '/api/ai/chat'
    requests_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_duration INTERVAL NOT NULL DEFAULT '1 hour',
    max_requests INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint, window_start)
);

-- Create billing_events table for tracking billing-related events
CREATE TABLE public.billing_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('subscription_created', 'subscription_updated', 'subscription_cancelled', 'payment_succeeded', 'payment_failed', 'quota_exceeded')),
    amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    stripe_event_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX idx_usage_quotas_user_id ON public.usage_quotas(user_id);
CREATE INDEX idx_usage_quotas_provider ON public.usage_quotas(provider);
CREATE INDEX idx_usage_quotas_reset_date ON public.usage_quotas(reset_date);
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_project_id ON public.ai_usage_logs(project_id);
CREATE INDEX idx_ai_usage_logs_provider ON public.ai_usage_logs(provider);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_usage_alerts_user_id ON public.usage_alerts(user_id);
CREATE INDEX idx_usage_alerts_is_read ON public.usage_alerts(is_read) WHERE is_read = false;
CREATE INDEX idx_rate_limits_user_id_endpoint ON public.rate_limits(user_id, endpoint);
CREATE INDEX idx_rate_limits_window_start ON public.rate_limits(window_start);
CREATE INDEX idx_billing_events_user_id ON public.billing_events(user_id);
CREATE INDEX idx_billing_events_created_at ON public.billing_events(created_at DESC);

-- Add updated_at triggers
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_quotas_updated_at BEFORE UPDATE ON public.usage_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON public.rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize default quotas for new users
CREATE OR REPLACE FUNCTION initialize_user_quotas(user_id UUID, plan_type TEXT DEFAULT 'free')
RETURNS VOID AS $$
DECLARE
    quota_limits JSONB;
    provider_name TEXT;
    quota_type TEXT;
    limit_value BIGINT;
BEGIN
    -- Define quota limits based on plan type
    quota_limits := CASE plan_type
        WHEN 'free' THEN '{
            "openai": {"tokens": 10000, "requests": 100, "cost": 500},
            "anthropic": {"tokens": 10000, "requests": 100, "cost": 500},
            "straico": {"tokens": 10000, "requests": 100, "cost": 500},
            "cohere": {"tokens": 10000, "requests": 100, "cost": 500}
        }'::JSONB
        WHEN 'pro' THEN '{
            "openai": {"tokens": 1000000, "requests": 10000, "cost": 10000},
            "anthropic": {"tokens": 1000000, "requests": 10000, "cost": 10000},
            "straico": {"tokens": 1000000, "requests": 10000, "cost": 10000},
            "cohere": {"tokens": 1000000, "requests": 10000, "cost": 10000}
        }'::JSONB
        WHEN 'enterprise' THEN '{
            "openai": {"tokens": 10000000, "requests": 100000, "cost": 100000},
            "anthropic": {"tokens": 10000000, "requests": 100000, "cost": 100000},
            "straico": {"tokens": 10000000, "requests": 100000, "cost": 100000},
            "cohere": {"tokens": 10000000, "requests": 100000, "cost": 100000}
        }'::JSONB
        ELSE '{}'::JSONB
    END;

    -- Insert quotas for each provider and quota type
    FOR provider_name IN SELECT jsonb_object_keys(quota_limits)
    LOOP
        FOR quota_type IN SELECT jsonb_object_keys(quota_limits->provider_name)
        LOOP
            limit_value := (quota_limits->provider_name->>quota_type)::BIGINT;
            
            INSERT INTO public.usage_quotas (user_id, provider, quota_type, monthly_limit, current_usage, reset_date)
            VALUES (
                user_id,
                provider_name,
                quota_type,
                limit_value,
                0,
                DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
            )
            ON CONFLICT (user_id, provider, quota_type) 
            DO UPDATE SET 
                monthly_limit = limit_value,
                updated_at = NOW();
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update usage quotas
CREATE OR REPLACE FUNCTION check_usage_quota(
    p_user_id UUID,
    p_provider TEXT,
    p_quota_type TEXT,
    p_usage_amount BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    current_quota RECORD;
    new_usage BIGINT;
BEGIN
    -- Get current quota
    SELECT * INTO current_quota
    FROM public.usage_quotas
    WHERE user_id = p_user_id 
      AND provider = p_provider 
      AND quota_type = p_quota_type
      AND is_active = true;

    -- If no quota found, deny request
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Reset quota if past reset date
    IF current_quota.reset_date <= NOW() THEN
        UPDATE public.usage_quotas
        SET current_usage = 0,
            reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
            updated_at = NOW()
        WHERE id = current_quota.id;
        
        current_quota.current_usage := 0;
    END IF;

    -- Calculate new usage
    new_usage := current_quota.current_usage + p_usage_amount;

    -- Check if within limits
    IF new_usage > current_quota.monthly_limit THEN
        RETURN FALSE;
    END IF;

    -- Update usage
    UPDATE public.usage_quotas
    SET current_usage = new_usage,
        updated_at = NOW()
    WHERE id = current_quota.id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to log AI usage
CREATE OR REPLACE FUNCTION log_ai_usage(
    p_user_id UUID,
    p_project_id UUID,
    p_provider TEXT,
    p_model TEXT,
    p_input_tokens INTEGER,
    p_output_tokens INTEGER,
    p_estimated_cost DECIMAL,
    p_request_duration INTEGER DEFAULT NULL,
    p_status TEXT DEFAULT 'success',
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    usage_id UUID;
BEGIN
    INSERT INTO public.ai_usage_logs (
        user_id, project_id, provider, model, input_tokens, output_tokens,
        estimated_cost, request_duration, status, error_message, metadata
    ) VALUES (
        p_user_id, p_project_id, p_provider, p_model, p_input_tokens, p_output_tokens,
        p_estimated_cost, p_request_duration, p_status, p_error_message, p_metadata
    ) RETURNING id INTO usage_id;

    -- Update quotas if successful
    IF p_status = 'success' THEN
        PERFORM check_usage_quota(p_user_id, p_provider, 'tokens', p_input_tokens + p_output_tokens);
        PERFORM check_usage_quota(p_user_id, p_provider, 'requests', 1);
        PERFORM check_usage_quota(p_user_id, p_provider, 'cost', (p_estimated_cost * 100)::BIGINT); -- Store cost in cents
    END IF;

    RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create usage alerts
CREATE OR REPLACE FUNCTION create_usage_alert(
    p_user_id UUID,
    p_alert_type TEXT,
    p_provider TEXT,
    p_threshold_percentage INTEGER,
    p_current_usage BIGINT,
    p_limit_value BIGINT,
    p_message TEXT
) RETURNS UUID AS $$
DECLARE
    alert_id UUID;
BEGIN
    INSERT INTO public.usage_alerts (
        user_id, alert_type, provider, threshold_percentage,
        current_usage, limit_value, message
    ) VALUES (
        p_user_id, p_alert_type, p_provider, p_threshold_percentage,
        p_current_usage, p_limit_value, p_message
    ) RETURNING id INTO alert_id;

    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 100,
    p_window_duration INTERVAL DEFAULT '1 hour'
) RETURNS BOOLEAN AS $$
DECLARE
    current_window_start TIMESTAMP WITH TIME ZONE;
    current_count INTEGER;
BEGIN
    current_window_start := DATE_TRUNC('hour', NOW());

    -- Get or create rate limit record
    INSERT INTO public.rate_limits (user_id, endpoint, requests_count, window_start, window_duration, max_requests)
    VALUES (p_user_id, p_endpoint, 1, current_window_start, p_window_duration, p_max_requests)
    ON CONFLICT (user_id, endpoint, window_start)
    DO UPDATE SET 
        requests_count = rate_limits.requests_count + 1,
        updated_at = NOW()
    RETURNING requests_count INTO current_count;

    -- Check if within limits
    RETURN current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically initialize quotas for new users
CREATE OR REPLACE FUNCTION trigger_initialize_user_quotas()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_user_quotas(NEW.id, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_quotas_on_user_creation
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_initialize_user_quotas();

-- Create a view for usage analytics
CREATE VIEW public.usage_analytics AS
SELECT 
    u.id as user_id,
    u.email,
    us.plan_type,
    COUNT(aul.id) as total_requests,
    SUM(aul.total_tokens) as total_tokens,
    SUM(aul.estimated_cost) as total_cost,
    AVG(aul.request_duration) as avg_request_duration,
    DATE_TRUNC('day', aul.created_at) as usage_date
FROM public.users u
LEFT JOIN public.user_subscriptions us ON u.id = us.user_id
LEFT JOIN public.ai_usage_logs aul ON u.id = aul.user_id
WHERE aul.status = 'success'
GROUP BY u.id, u.email, us.plan_type, DATE_TRUNC('day', aul.created_at)
ORDER BY usage_date DESC;