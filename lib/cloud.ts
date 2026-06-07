// Cloud persistence via Supabase. Activates ONLY when the two public env vars
// are set; otherwise the app stays on localStorage and nothing changes.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "./profile";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const cloudEnabled = !!(url && key);
export const supabase: SupabaseClient | null = cloudEnabled ? createClient(url!, key!) : null;

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("profiles").select("data").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return (data.data as Profile) || null;
}

let timer: any = null;
export function upsertProfile(userId: string, data: Profile) {
  if (!supabase) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    supabase!.from("profiles").upsert({ user_id: userId, data, updated_at: new Date().toISOString() }).then(() => {});
  }, 700); // debounce so input edits don't hammer the DB
}

// build marker: force fresh build to inline NEXT_PUBLIC_SUPABASE_* env vars
