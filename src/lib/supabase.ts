import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || (process.env.SUPABASE_URL as any) || (process.env.NEXT_PUBLIC_SUPABASE_URL as any) || '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || (process.env.SUPABASE_ANON_KEY as any) || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as any) || '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
