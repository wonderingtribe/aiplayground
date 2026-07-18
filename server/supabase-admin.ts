import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client && supabaseUrl) {
    _client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  if (!_client) {
    throw new Error('Supabase not configured — set SUPABASE_URL env var');
  }
  return _client;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});

export async function getUserById(userId: string) {
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
  return user;
}

export async function getOrCreateProfile(userId: string, email?: string) {
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) return existing;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      username: email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
      display_name: email?.split('@')[0] || 'User',
    })
    .select()
    .single();

  return profile;
}
