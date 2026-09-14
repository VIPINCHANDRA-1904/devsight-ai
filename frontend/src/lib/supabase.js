/**
 * DEVSIGHTAI — Supabase Client (Frontend)
 *
 * Uses VITE_SUPABASE_ANON_KEY — RLS-protected, read-only access.
 * This is safe to expose in the browser.
 *
 * The backend uses SUPABASE_SERVICE_KEY separately.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[DEVSIGHTAI] Supabase environment variables are not set. ' +
    'Dashboard will use FastAPI REST endpoints and simulated realtime.'
  )
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
