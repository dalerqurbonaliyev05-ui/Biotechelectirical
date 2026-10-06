import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

type AuthState = { session: Session | null; isAdmin: boolean | null; loading: boolean; recheck: () => Promise<void> }

const AuthContext = createContext<AuthState>({ session: null, isAdmin: null, loading: true, recheck: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  async function check(s: Session | null) {
    setSession(s)
    if (!s) {
      setIsAdmin(null)
      setLoading(false)
      return
    }
    // Admin = verified email (or user id) listed in public.ew_admins; checked server-side by RLS too.
    const { data, error } = await supabase.rpc('ew_am_i_admin')
    setIsAdmin(!error && data === true)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => check(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') void check(s)
      else setSession(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, isAdmin, loading, recheck: () => check(session) }}>{children}</AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
