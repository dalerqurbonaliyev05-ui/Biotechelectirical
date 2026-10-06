import { createClient } from '@supabase/supabase-js'

// Public client values: every table is protected by RLS and admin rights come
// from public.ew_admins, so shipping the anon key in the bundle is expected.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mjtdilcbwbqpibrooamz.supabase.co'
const ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdGRpbGNid2JxcGlicm9vYW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDQ1NDAsImV4cCI6MjEwNjY4MDU0MH0.4nbJH-H__PnqLHHpn4rdq6kgsM0CuE9Ac9GP4G6u2V8'

export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

export const BUCKETS = {
  lessonMedia: 'ew-lesson-media',
  workChecks: 'ew-work-checks',
  projectPhotos: 'ew-project-photos',
} as const

export const publicMediaUrl = (path: string) => supabase.storage.from(BUCKETS.lessonMedia).getPublicUrl(path).data.publicUrl

/** Throws the Postgrest error so callers can show it in a toast. */
export function must<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message)
  return res.data as NonNullable<T>
}
