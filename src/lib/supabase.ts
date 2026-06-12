import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== "your-supabase-project-url" &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== "your-supabase-anon-key";

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase is not configured yet. The application will run using mock local storage auth. " +
      "To connect to Supabase, copy .env.example to .env and fill in your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createClient("https://placeholder.supabase.co", "placeholder-key") as SupabaseClient);
