import 'server-only';
import { createClient as createSupabase } from '@supabase/supabase-js';
// Service role: HANYA di server (Route Handler / Server Action)
export const createAdminClient = () =>
  createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
