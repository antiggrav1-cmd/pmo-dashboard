import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://bvthslbnfifttacjdwqqe.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dGhzbGJuZmlmdGFjamR3cXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Nzc2MDEsImV4cCI6MjEwNTM1MzYwMX0.3Z3KqtiMVzpQQCpN0eezcKYLdKfwuwvjazh_DZ_BvkE";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const disableInDev = import.meta.env.VITE_DISABLE_SUPABASE_LOCAL === "true";

export const isSupabaseConfigured = Boolean(
  !disableInDev &&
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("TU_PROYECTO_ID")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;
