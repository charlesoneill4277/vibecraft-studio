import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUsageTables() {
  try {
    console.log('🔄 Creating usage management tables...');

    // Create user_subscriptions table
    console.log('📝 Creating user_subscriptions table...');
    const { error: subscriptionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_subscriptions (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
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
      `
    });

    if (subscriptionsError) {
      console.log('⚠️ user_subscriptions table may already exist or creation failed');
    } else {
      console.log('✅ user_subscriptions table created');
    }

    // Create usage_quotas table
    console.log('📝 Creating usage_quotas table...');
    const { error: quotasError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.usage_quotas (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
      `
    });

    if (quotasError) {
      console.log('⚠️ usage_quotas table may already exist or creation failed');
    } else {
      console.log('✅ usage_quotas table created');
    }

    // Create ai_usage_logs table
    console.log('📝 Creating ai_usage_logs table...');
    const { error: logsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
          provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'straico', 'cohere')),
          model TEXT NOT NULL,
          input_tokens INTEGER NOT NULL DEFAULT 0,
          output_tokens INTEGER NOT NULL DEFAULT 0,
          total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
          estimated_cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
          request_duration INTEGER,
          status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited', 'quota_exceeded')) DEFAULT 'success',
          error_message TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (logsError) {
      console.log('⚠️ ai_usage_logs table may already exist or creation failed');
    } else {
      console.log('✅ ai_usage_logs table created');
    }

    // Create usage_alerts table
    console.log('📝 Creating usage_alerts table...');
    const { error: alertsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.usage_alerts (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          alert_type TEXT NOT NULL CHECK (alert_type IN ('quota_warning', 'quota_exceeded', 'cost_warning', 'upgrade_prompt')),
          provider TEXT CHECK (provider IN ('openai', 'anthropic', 'straico', 'cohere')),
          threshold_percentage INTEGER,
          current_usage BIGINT,
          limit_value BIGINT,
          message TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          is_dismissed BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (alertsError) {
      console.log('⚠️ usage_alerts table may already exist or creation failed');
    } else {
      console.log('✅ usage_alerts table created');
    }

    console.log('✅ Usage management tables creation completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run the remaining functions and RLS policies manually');
    console.log('4. Test the usage management system');

  } catch (error) {
    console.error('❌ Table creation failed:', error);
    process.exit(1);
  }
}

createUsageTables();