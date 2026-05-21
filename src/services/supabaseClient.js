import { createClient } from '@supabase/supabase-js';

// Read variables from import.meta.env (Vite standard)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-supabase-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "your-supabase-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
