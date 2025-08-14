export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          github_repo: string | null
          local_path: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          github_repo?: string | null
          local_path?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          github_repo?: string | null
          local_path?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          permissions: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: string
          permissions?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          permissions?: Json
          created_at?: string
        }
      }
      project_prompts: {
        Row: {
          id: string
          project_id: string
          role: string
          content: string
          ai_provider: string | null
          model: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          role: string
          content: string
          ai_provider?: string | null
          model?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          role?: string
          content?: string
          ai_provider?: string | null
          model?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      project_knowledge: {
        Row: {
          id: string
          project_id: string
          title: string
          content: string | null
          file_url: string | null
          category: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          content?: string | null
          file_url?: string | null
          category: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          content?: string | null
          file_url?: string | null
          category?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      project_assets: {
        Row: {
          id: string
          project_id: string
          name: string
          file_url: string
          type: string
          size: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          file_url: string
          type: string
          size: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          file_url?: string
          type?: string
          size?: number
          metadata?: Json
          created_at?: string
        }
      }
      project_settings: {
        Row: {
          id: string
          project_id: string
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
      }
      ai_providers: {
        Row: {
          id: string
          user_id: string
          provider: string
          api_key_encrypted: string
          is_active: boolean
          settings: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          api_key_encrypted: string
          is_active?: boolean
          settings?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          api_key_encrypted?: string
          is_active?: boolean
          settings?: Json
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          content: string
          category: string
          is_public: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          content: string
          category: string
          is_public?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          content?: string
          category?: string
          is_public?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_type: string
          status: string
          billing_cycle: string | null
          current_period_start: string | null
          current_period_end: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_type?: string
          status?: string
          billing_cycle?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_type?: string
          status?: string
          billing_cycle?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      usage_quotas: {
        Row: {
          id: string
          user_id: string
          provider: string
          quota_type: string
          monthly_limit: number
          current_usage: number
          reset_date: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          quota_type: string
          monthly_limit?: number
          current_usage?: number
          reset_date: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          quota_type?: string
          monthly_limit?: number
          current_usage?: number
          reset_date?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          provider: string
          model: string
          input_tokens: number
          output_tokens: number
          total_tokens: number
          estimated_cost: number
          request_duration: number | null
          status: string
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          provider: string
          model: string
          input_tokens?: number
          output_tokens?: number
          estimated_cost?: number
          request_duration?: number | null
          status?: string
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          provider?: string
          model?: string
          input_tokens?: number
          output_tokens?: number
          estimated_cost?: number
          request_duration?: number | null
          status?: string
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      usage_alerts: {
        Row: {
          id: string
          user_id: string
          alert_type: string
          provider: string | null
          threshold_percentage: number | null
          current_usage: number | null
          limit_value: number | null
          message: string
          is_read: boolean
          is_dismissed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          alert_type: string
          provider?: string | null
          threshold_percentage?: number | null
          current_usage?: number | null
          limit_value?: number | null
          message: string
          is_read?: boolean
          is_dismissed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          alert_type?: string
          provider?: string | null
          threshold_percentage?: number | null
          current_usage?: number | null
          limit_value?: number | null
          message?: string
          is_read?: boolean
          is_dismissed?: boolean
          created_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          requests_count: number
          window_start: string
          window_duration: string
          max_requests: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          requests_count?: number
          window_start: string
          window_duration?: string
          max_requests: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          requests_count?: number
          window_start?: string
          window_duration?: string
          max_requests?: number
          created_at?: string
          updated_at?: string
        }
      }
      billing_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          amount: number | null
          currency: string
          stripe_event_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          amount?: number | null
          currency?: string
          stripe_event_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          amount?: number | null
          currency?: string
          stripe_event_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}