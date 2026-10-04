import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { errMsg, supabase } from './supabase';
import type { Profile, Role } from './types';

interface SignUpInput { email: string; password: string; fullName: string; phone: string; shopName?: string }

interface AuthCtx {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Hisob mavjud, lekin boshqa rol/ilova uchun. */
  wrongRole: Role | 'none' | null;
  signIn(email: string, password: string): Promise<string | null>;
  /** null = muvaffaqiyatli, 'confirm' = email tasdiqlash kerak, boshqa satr = xato matni */
  signUp(input: SignUpInput): Promise<string | null>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'address' | 'lat' | 'lng' | 'shop_name'>>): Promise<string | null>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ role, children }: { role: Exclude<Role, 'admin'>; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wrongRole, setWrongRole] = useState<AuthCtx['wrongRole']>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) { setProfile(null); setWrongRole(null); return; }
    const { data } = await supabase.from('uy_profiles').select('*').eq('id', s.user.id).maybeSingle();
    if (!data) { setProfile(null); setWrongRole('none'); return; }
    if ((data as Profile).role !== role || !(data as Profile).is_active) {
      setProfile(null); setWrongRole((data as Profile).role); return;
    }
    setProfile(data as Profile); setWrongRole(null);
  }, [role]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (alive) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // Supabase ichki lock'ini bloklamaslik uchun keyingi tick'da.
      setTimeout(() => { void loadProfile(s); }, 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? errMsg(error) : null;
  }, []);

  const signUp = useCallback(async (i: SignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: i.email.trim(),
      password: i.password,
      options: { data: { app: 'uyovqat', role, full_name: i.fullName.trim(), phone: i.phone.trim(), shop_name: i.shopName?.trim() ?? null } },
    });
    if (error) return errMsg(error);
    if (!data.session) return 'confirm';
    return null;
  }, [role]);

  const signOut = useCallback(async () => { await supabase.auth.signOut(); setProfile(null); }, []);
  const refreshProfile = useCallback(async () => { await loadProfile(session); }, [loadProfile, session]);

  const updateProfile = useCallback<AuthCtx['updateProfile']>(async (patch) => {
    if (!session) return 'Kirish talab qilinadi';
    const { error } = await supabase.from('uy_profiles').update(patch).eq('id', session.user.id);
    if (error) return errMsg(error);
    await loadProfile(session);
    return null;
  }, [session, loadProfile]);

  const value = useMemo(
    () => ({ loading, session, profile, wrongRole, signIn, signUp, signOut, refreshProfile, updateProfile }),
    [loading, session, profile, wrongRole, signIn, signUp, signOut, refreshProfile, updateProfile],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth: AuthProvider topilmadi');
  return c;
}
