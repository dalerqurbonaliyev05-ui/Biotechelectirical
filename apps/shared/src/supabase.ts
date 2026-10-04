import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
});

/** Taom rasmining ommaviy URL'i. */
export function foodImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:/i.test(path)) return path;
  return supabase.storage.from('food-images').getPublicUrl(path).data.publicUrl;
}

/** Postgres/RPC xatosini foydalanuvchiga tushunarli matnga aylantiradi. */
export function errMsg(e: unknown): string {
  const m = (e as { message?: string } | null)?.message ?? String(e);
  if (/Invalid login credentials/i.test(m)) return 'Email yoki parol noto\'g\'ri';
  if (/User already registered/i.test(m)) return 'Bu email allaqachon ro\'yxatdan o\'tgan';
  if (/Password should be at least/i.test(m)) return 'Parol kamida 6 belgidan iborat bo\'lsin';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Internet bilan aloqa yo\'q';
  if (/row-level security|permission denied/i.test(m)) return 'Bu amalga ruxsat yo\'q';
  return m;
}

/**
 * Jadval o'zgarishlarini realtime kuzatadi (RLS qo'llanadi: faqat o'z qatorlaringiz keladi).
 * Qaytgan funksiya kuzatuvni to'xtatadi.
 */
export function onTableChange(
  table: string,
  cb: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Record<string, unknown>; old: Record<string, unknown> }) => void,
  filter?: string,
): () => void {
  const name = `rt-${table}-${filter ?? 'all'}-${Math.random().toString(36).slice(2, 8)}`;
  const ch = supabase
    .channel(name)
    .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, (p) =>
      cb(p as never),
    )
    .subscribe();
  return () => { void supabase.removeChannel(ch); };
}
