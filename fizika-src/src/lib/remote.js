// Supabase rejimi.
// Veb (admin panel): supabase-js CDN orqali yuklanadi. Android ilovada (NATIVE=1 build) shu manzil
// build.mjs da npm paketiga almashtiriladi, ya'ni kutubxona APK ichida bo'ladi.
import { REWARDS } from '../data/meta.js';

let sb = null;
const cfg = () => window.FIZIKA_CONFIG || {};
// Android ilova (Capacitor): Google kirish tizim brauzerida ochiladi va shu manzil orqali ilovaga qaytadi.
const NATIVE_REDIRECT = 'uz.energyvibe.fizika://auth';
export const isNative = () => !!(window.FizikaNative && window.Capacitor?.isNativePlatform?.());
async function client() {
  if (sb) return sb;
  const { createClient } = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = createClient(cfg().supabaseUrl, cfg().supabaseKey, { auth: { persistSession: true, detectSessionInUrl: !isNative(), flowType: 'pkce' } });
  if (isNative()) listenDeepLinks(sb);
  return sb;
}
let linking = false;
function listenDeepLinks(c) {
  if (linking) return; linking = true;
  const { App, Browser } = window.FizikaNative;
  const handle = async url => {
    if (!url || !url.startsWith(NATIVE_REDIRECT)) return;
    try { await Browser.close(); } catch { /* brauzer allaqachon yopilgan */ }
    const q = new URL(url.replace('#', '?')).searchParams;
    const code = q.get('code');
    if (code) {
      const { error } = await c.auth.exchangeCodeForSession(code);
      if (error) window.dispatchEvent(new CustomEvent('fizika-auth-error', { detail: error.message }));
    } else if (q.get('error_description')) {
      window.dispatchEvent(new CustomEvent('fizika-auth-error', { detail: q.get('error_description') }));
    }
  };
  App.addListener('appUrlOpen', e => handle(e.url));
  App.getLaunchUrl?.().then(r => handle(r?.url)).catch(() => {});
}
const ERR = {
  grade_required: 'Maktab o‘quvchisi uchun sinfni tanlash majburiy.',
  no_questions: 'Bu bo‘lim uchun hali savollar yo‘q. Admin savollar bazasini yuklashi kerak.',
  not_enough_coins: 'Tangalar yetarli emas.', already: 'Bu sovg‘a allaqachon sizda bor.', not_authenticated: 'Avval tizimga kiring.',
  no_profile: 'Avval profilni to‘ldiring.', blocked: 'Hisobingiz vaqtincha bloklangan.', forbidden: 'Bu amal faqat admin uchun.',
};
function chk({ data, error }) {
  if (error) {
    const key = Object.keys(ERR).find(k => (error.message || '').includes(k));
    throw new Error(key ? ERR[key] : error.message);
  }
  return data;
}
async function rpc(name, args) { const c = await client(); return chk(await c.rpc(name, args)); }

export const remoteApi = {
  mode: 'remote',
  async init() { const c = await client(); const { data } = await c.auth.getSession(); return data.session; },
  async session() { const c = await client(); const { data } = await c.auth.getSession(); return data.session; },
  onAuth(cb) { let sub; client().then(c => { sub = c.auth.onAuthStateChange((_e, s) => cb(s)).data.subscription; }); return () => sub?.unsubscribe(); },
  async signInGoogle() {
    const c = await client();
    if (isNative()) {
      const data = chk(await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } }));
      await window.FizikaNative.Browser.open({ url: data.url });
      return;
    }
    const redirectTo = location.origin + location.pathname;
    chk(await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } }));
  },
  async signOut() { const c = await client(); await c.auth.signOut(); },
  me: () => rpc('fizika_me'),
  async saveProfile(f) {
    return rpc('fizika_save_profile', { p_full_name: f.full_name, p_phone: f.phone || null, p_role_type: f.role_type, p_grade: f.role_type === 'student' ? +f.grade : null,
      p_region: f.region, p_district: f.district || null, p_school: f.school || null, p_avatar: f.avatar || null, p_target: f.target_university || null });
  },
  catalog: () => rpc('fizika_catalog'),
  startTest: ({ mode, size = 20, grade = null, topic = null, exam_tag = null }) =>
    rpc('fizika_start_test', { p_mode: mode, p_size: size, p_grade: grade, p_topic: topic, p_exam_tag: exam_tag, p_qtype: null }),
  answer: (attempt, qid, answer) => rpc('fizika_answer', { p_attempt: attempt, p_question: qid, p_answer: answer }),
  finish: attempt => rpc('fizika_finish_test', { p_attempt: attempt }),
  recordGame: (game, score) => rpc('fizika_record_game', { p_game: game, p_score: Math.round(score) }),
  leaderboard: ({ scope = 'uz', region = null, role = null, grade = null, period = 'all', limit = 50 }) =>
    rpc('fizika_leaderboard', { p_scope: scope, p_region: region, p_role: role, p_grade: grade, p_period: period, p_limit: limit }),
  regionStats: role => rpc('fizika_region_stats', { p_role: role || null }),
  async history(limit = 20) {
    const c = await client();
    return chk(await c.from('fizika_attempts').select('*').eq('status', 'finished').order('started_at', { ascending: false }).limit(limit));
  },
  async rewards() { const c = await client(); return chk(await c.from('fizika_rewards').select('*').eq('active', true).order('sort')); },
  claimReward: id => rpc('fizika_claim_reward', { p_reward: id }),
  async setAvatar(icon) { const p = await rpc('fizika_me'); return this.saveProfile({ ...p, avatar: icon }); },
  report: (qid, message) => rpc('fizika_report', { p_question: qid, p_message: message }),
  async announcements() { const c = await client(); return chk(await c.from('fizika_announcements').select('*').order('created_at', { ascending: false }).limit(5)); },

  admin: {
    stats: () => rpc('fizika_admin_stats'),
    async listQuestions({ search = '', topic, source, verified, qtype, page = 0, size = 30 }) {
      const c = await client();
      let q = c.from('fizika_questions').select('*', { count: 'exact' }).order('id').range(page * size, page * size + size - 1);
      if (search) q = /^\d+$/.test(search) ? q.eq('id', +search) : q.ilike('stem', `%${search}%`);
      if (topic) q = q.eq('topic', topic);
      if (source) q = q.eq('source', source);
      if (qtype) q = q.eq('qtype', qtype);
      if (verified === 'yes') q = q.eq('verified', true); if (verified === 'no') q = q.eq('verified', false);
      const { data, count, error } = await q; chk({ data, error });
      return { rows: data, total: count };
    },
    async saveQuestion(q) {
      const c = await client();
      const row = { ...q }; delete row.created_at; row.updated_at = new Date().toISOString();
      if (row.id) return chk(await c.from('fizika_questions').update(row).eq('id', row.id).select().single());
      delete row.id; return chk(await c.from('fizika_questions').insert(row).select().single());
    },
    async deleteQuestion(id) { const c = await client(); chk(await c.from('fizika_questions').delete().eq('id', id)); },
    importRows: rows => rpc('fizika_admin_import', { p_rows: rows }),
    async listReports() { const c = await client(); return chk(await c.from('fizika_reports').select('*, question:fizika_questions(*)').order('created_at', { ascending: false }).limit(100)); },
    async updateReport(id, status) { const c = await client(); chk(await c.from('fizika_reports').update({ status }).eq('id', id)); },
    async listUsers({ search = '' } = {}) {
      const c = await client();
      let q = c.from('fizika_profiles').select('*').order('xp', { ascending: false }).limit(200);
      if (search) q = q.ilike('full_name', `%${search}%`);
      return chk(await q);
    },
    async updateUser(id, patch) { const c = await client(); chk(await c.from('fizika_profiles').update(patch).eq('id', id)); },
    async listRewards() { const c = await client(); return chk(await c.from('fizika_rewards').select('*').order('sort')); },
    async saveReward(r) { const c = await client(); return chk(await c.from('fizika_rewards').upsert(r).select().single()); },
    async deleteReward(id) { const c = await client(); chk(await c.from('fizika_rewards').delete().eq('id', id)); },
    async saveAnnouncement(a) { const c = await client(); return chk(await c.from('fizika_announcements').insert(a).select().single()); },
    async deleteAnnouncement(id) { const c = await client(); chk(await c.from('fizika_announcements').delete().eq('id', id)); },
    async seedStatus() {
      const c = await client();
      const n = async t => (await c.from(t).select('*', { count: 'exact', head: true })).count || 0;
      return { questions: await n('fizika_questions'), topics: await n('fizika_topics'), rewards: await n('fizika_rewards') };
    },
    /** Boshlang'ich bazani (data/bank.json) Supabase'ga yuklaydi. onProgress(done,total) */
    async seed(onProgress) {
      const c = await client();
      const d = await (await fetch((cfg().base || '') + 'data/bank.json')).json();
      chk(await c.from('fizika_topics').upsert(d.topics));
      chk(await c.from('fizika_rewards').upsert(REWARDS.map(r => ({ audience: 'all', cost_coins: 0, rule: {}, ...r }))));
      const rows = d.questions; let done = 0;
      for (let i = 0; i < rows.length; i += 250) {
        await rpc('fizika_admin_import', { p_rows: rows.slice(i, i + 250) });
        done = Math.min(rows.length, i + 250); onProgress?.(done, rows.length);
      }
      return { done: true, count: done };
    },
  },
};
