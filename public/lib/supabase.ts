import { createClient } from "@supabase/supabase-js";

// Replace these with your Supabase project credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://xeoxxgddreyiosqoqwig.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlb3h4Z2RkcmV5aW9zcW9xd2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzY4ODMsImV4cCI6MjA4NzAxMjg4M30.5NNJTElmBa-HWC7i3GfIryGUxWLUPNgct4RrzbI493U";

// Only create client if credentials are available
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const isSupabaseConnected = () => !!supabase;
