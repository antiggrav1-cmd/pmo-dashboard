import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://bvthslbnfifttacjdwqqe.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dGhzbGJuZmlmdGFjamR3cXFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Nzc2MDEsImV4cCI6MjEwNTM1MzYwMX0.3Z3KqtiMVzpQQCpN0eezcKYLdKfwuwvjazh_DZ_BvkE";

export const isSupabaseConfigured = true;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
