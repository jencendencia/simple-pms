import { createClient } from '@supabase/supabase-js'

// ePRIME (PRIME-HRM) Supabase project — the anon key is public, shipped by the
// site itself in its browser bundles, so it is safe to embed here.
export const SUPABASE_URL = 'https://nuhirhfevxoonendpfsm.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51aGlyaGZldnhvb25lbmRwZnNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzcxNDMwOTksImV4cCI6MTk5MjcxOTA5OX0.F24Rc0tD5pM3g-8jNjlkUBR4EmB0d_PxvqWMNW8wn3Q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Restore a previously logged-in session (if the tab is refreshed).
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(cb) {
  // supabase-js v2 returns { data: { subscription } }, not the unsubscribe fn itself.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data.session
}

export async function logout() {
  await supabase.auth.signOut()
}