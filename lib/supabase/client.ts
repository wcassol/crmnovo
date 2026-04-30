import { createBrowserClient } from '@supabase/ssr';
import { getBrowserPublicConfig } from '@/lib/runtime-config';

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getBrowserPublicConfig();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
