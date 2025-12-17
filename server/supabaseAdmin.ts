import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
} else {
  console.warn('Supabase credentials not configured - Supabase features disabled');
}

export { supabaseAdmin };

export async function verifySupabaseToken(token: string) {
  if (!supabaseAdmin) {
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return {
      id: user.id,
      email: user.email,
      firstName: user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0],
      lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.name?.split(' ').slice(1).join(' '),
      avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      provider: user.app_metadata?.provider,
    };
  } catch (error) {
    console.error('Error verifying Supabase token:', error);
    return null;
  }
}
