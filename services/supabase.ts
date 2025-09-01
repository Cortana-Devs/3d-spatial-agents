import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client for client-side operations
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Database types (will be generated later)
export type Database = {
  public: {
    Tables: {
      worlds: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
          created_by: string;
          block_count: number;
          max_blocks: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          block_count?: number;
          max_blocks?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          updated_at?: string;
          block_count?: number;
          max_blocks?: number;
          is_active?: boolean;
        };
      };
      blocks: {
        Row: {
          id: string;
          world_id: string;
          position_x: number;
          position_y: number;
          position_z: number;
          block_type: string;
          color: string;
          created_at: string;
          created_by: string;
          metadata: any;
        };
        Insert: {
          id?: string;
          world_id: string;
          position_x: number;
          position_y: number;
          position_z: number;
          block_type: string;
          color: string;
          created_by: string;
          metadata?: any;
        };
        Update: {
          block_type?: string;
          color?: string;
          metadata?: any;
        };
      };
      simulants: {
        Row: {
          id: string;
          world_id: string;
          name: string;
          position_x: number;
          position_y: number;
          position_z: number;
          status: string;
          gemini_session_id: string | null;
          created_at: string;
          last_active: string;
          personality: any;
          capabilities: string[];
        };
        Insert: {
          id?: string;
          world_id: string;
          name: string;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          status?: string;
          gemini_session_id?: string;
          personality?: any;
          capabilities?: string[];
        };
        Update: {
          name?: string;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          status?: string;
          gemini_session_id?: string;
          last_active?: string;
          personality?: any;
          capabilities?: string[];
        };
      };
      chat_messages: {
        Row: {
          id: string;
          world_id: string;
          sender_id: string;
          sender_name: string;
          content: string;
          message_type: string;
          target_id: string | null;
          world_position: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          sender_id: string;
          sender_name: string;
          content: string;
          message_type?: string;
          target_id?: string;
          world_position?: any;
        };
        Update: {
          content?: string;
          message_type?: string;
        };
      };
    };
  };
};

// Typed Supabase client
export type SupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

// Helper functions for common operations
export const supabaseHelpers = {
  // Check if Supabase is configured
  isConfigured: (): boolean => {
    return !!(supabaseUrl && supabaseAnonKey);
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Sign in anonymously for demo purposes
  signInAnonymously: async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    return { data, error };
  },
};