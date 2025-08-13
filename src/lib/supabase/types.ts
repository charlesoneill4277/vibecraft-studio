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