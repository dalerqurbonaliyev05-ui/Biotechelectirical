// DEMO rejim: Supabase ulanmaganda ilova shu yerdagi ma'lumotlar bilan ishlaydi.
import { gradeAnswer, xpFor, milliyBall } from './grading.js';
import { REGIONS, REWARDS } from '../data/meta.js';

const KEY = 'fizika-demo-v1';
const mem = { store: null };
function load() {
  if (mem.store) return mem.store;
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { s = null; }
  mem.store = s || { users: {}, uid: null, attempts: [], items: [], games: [], userRewards: [], reports: [], qEdits: {}, qDeleted: [], qAdded: [], ann: [] };
  return mem.store;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(mem.store)); } catch { /* storage not available */ } }

let BANK = null, TOPICS = [];
const base = () => (window.FIZIKA_CONFIG?.base || '');
async function bank() {
  if (BANK) return BANK;
  const r = await fetch(base() + 'data/bank.json');
  const d = await r.json();
  TOPICS = d.topics;
  const st = load();
  BANK = d.questions.map((q, i) => ({ ...q, id: i + 1, active: true, ...(st.qEdits[i + 1] || {}) }))
    .filter(q => !st.qDeleted.includes(q.id));
  for (const q of st.qAdded) BANK.push(q);
  return BANK;
}

const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); // Asia/Tashkent
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffle(arr, seed = Math.random() * 1e9) {
  const a = arr.slice(); let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pub = q => ({ id: q.id, qtype: q.qtype, difficulty: q.difficulty, stem: q.stem, options: q.options, tasks: q.tasks, figure: q.figure,
  full_image: q.full_image, options_image: q.options_image, topic: q.topic, source: q.source, exam_tag: q.exam_tag, parts: q.answer?.parts?.length, unit_hint: q.answer?.unit });

// Demo reyting uchun namuna foydalanuvchilar
const NAMES = ['Aziza', 'Javohir', 'Madina', 'Sardor', 'Dilnoza', 'Bekzod', 'Malika', 'Jasur', 'Nilufar', 'Otabek', 'Shahzoda', 'Doston', 'Zarina',
  'Islom', 'Mohinur', 'Ulug‘bek', 'Sevara', 'Asadbek', 'Kamola', 'Behruz', 'Gulnoza', 'Temur', 'Iroda', 'Abdulloh', 'Laylo', 'Sanjar', 'Muslima', 'Akmal'];
const SURN = ['Karimova', 'Rahimov', 'Yusupova', 'Toshmatov', 'Ergasheva', 'Nazarov', 'Qodirova', 'Aliyev', 'Saidova', 'Ismoilov'];
function peers() {
  const out = [];
  for (let i = 0; i < 42; i++) {
    const h = hash('peer' + i);
    const student = i % 3 !== 0;
    out.push({ id: 'peer-' + i, full_name: NAMES[h % NAMES.length] + ' ' + SURN[(h >>> 5) % SURN.length][0] + '.', avatar: ['⚛️', '🧲', '🔭', '⚡', '🪐', '🧪'][h % 6],
      region: REGIONS[(h >>> 3) % REGIONS.length], role_type: student ? 'student' : 'abiturient', grade: student ? 6 + (h >>> 7) % 6 : null,
      xp: 120 + (h % 4800), week: h % 600, demo: true });
  }
  return out;
}

function me() { const s = load(); return s.uid ? s.users[s.uid] : null; }
function touch(p, xp, coins) {
  const t = today();
  const y = new Date(Date.now() + 5 * 3600e3 - 864e5).toISOString().slice(0, 10);
  p.streak = p.last_active === t ? p.streak : p.last_active === y ? p.streak + 1 : 1;
  p.best_streak = Math.max(p.best_streak || 0, p.streak);
  p.last_active = t; p.xp += Math.max(0, xp); p.coins += Math.max(0, coins);
  // nishonlar
  const s = load();
  const mine = s.attempts.filter(a => a.user_id === p.id && a.status === 'finished');
  const stats = { xp: p.xp, streak: p.best_streak, tests: mine.length, perfect: mine.filter(a => a.total >= 5 && a.correct === a.total).length,
    games: s.games.filter(g => g.user_id === p.id).length, daily: mine.filter(a => a.mode === 'daily').length, milliy: mine.filter(a => a.mode === 'milliy').length };
  const fresh = [];
  for (const r of REWARDS) {
    if (r.kind === 'gift' || !r.rule || s.userRewards.some(u => u.user_id === p.id && u.reward_id === r.id)) continue;
    if (r.cost_coins) continue;
    if (Object.entries(r.rule).every(([k, v]) => (stats[k] || 0) >= v)) { s.userRewards.push({ user_id: p.id, reward_id: r.id, earned_at: new Date().toISOString() }); fresh.push(r); }
  }
  return fresh;
}

export const localApi = {
  mode: 'demo',
  async init() { await bank(); return me() ? { user: { id: load().uid, email: 'demo@fizika.uz' } } : (load().uid ? { user: { id: load().uid } } : null); },
  onAuth() { return () => {}; },
  async signInGoogle(name) {
    const s = load();
    if (!s.uid) { s.uid = 'demo-' + Math.random().toString(36).slice(2, 8); }
    s.pendingName = name || 'Demo foydalanuvchi'; save();
    return { user: { id: s.uid, email: 'demo@fizika.uz', user_metadata: { full_name: s.pendingName } } };
  },
  async session() { const s = load(); return s.uid ? { user: { id: s.uid, email: 'demo@fizika.uz', user_metadata: { full_name: s.pendingName } } } : null; },
  async signOut() { const s = load(); s.uid = null; save(); },
  async me() {
    const p = me(); if (!p) return null;
    const s = load();
    const mine = s.attempts.filter(a => a.user_id === p.id && a.status === 'finished');
    return { ...p, rewards: s.userRewards.filter(u => u.user_id === p.id).map(u => u.reward_id), stats: {
      tests: mine.length, perfect: mine.filter(a => a.total > 0 && a.correct === a.total).length,
      correct: mine.reduce((x, a) => x + a.correct, 0), answered: mine.reduce((x, a) => x + a.total, 0),
      daily_today: mine.some(a => a.mode === 'daily' && a.started_at.slice(0, 10) === today()) } };
  },
  async saveProfile(f) {
    const s = load();
    if (f.role_type === 'student' && !f.grade) throw new Error('grade_required');
    const old = s.users[s.uid] || { id: s.uid, xp: 0, coins: 0, streak: 0, best_streak: 0, last_active: null, is_admin: true, created_at: new Date().toISOString() };
    s.users[s.uid] = { ...old, full_name: f.full_name || 'Foydalanuvchi', phone: f.phone || null, role_type: f.role_type, grade: f.role_type === 'student' ? +f.grade : null,
      region: f.region, district: f.district || null, school: f.school || null, avatar: f.avatar || old.avatar || '⚛️', target_university: f.target_university || null };
    save(); return s.users[s.uid];
  },
  async catalog() {
    const b = await bank();
    return { topics: TOPICS.map(t => ({ ...t, count: b.filter(q => q.topic === t.id && q.qtype === 'mc').length })),
      exams: [...new Set(b.filter(q => q.exam_tag).map(q => q.exam_tag))].sort(),
      by_grade: Object.fromEntries([6, 7, 8, 9, 10, 11].map(g => [g, b.filter(q => q.qtype === 'mc' && q.grades.includes(g)).length])),
      tg: b.filter(q => q.qtype === 'mc').reduce((m, q) => { for (const g of q.grades) { const k = q.topic + ':' + g; m[k] = (m[k] || 0) + 1; } return m; }, {}),
      open_count: b.filter(q => q.qtype === 'open' || q.qtype === 'open2').length, total: b.length };
  },
  async startTest({ mode, size = 20, grade, topic, exam_tag }) {
    const b = (await bank()).filter(q => q.active !== false);
    const p = me(); const sz = Math.max(5, Math.min(size, 60));
    const g = grade || p.grade;
    let qs = [], title = '', instant = true, limit = null;
    if (mode === 'grade_test') { qs = shuffle(b.filter(q => q.qtype === 'mc' && q.grades.includes(g) && (!topic || q.topic === topic))).slice(0, sz); title = g + '-sinf testi'; }
    else if (mode === 'topic') { qs = shuffle(b.filter(q => q.qtype === 'mc' && q.topic === topic && (!grade || q.grades.includes(grade)))).slice(0, sz).sort((x, y) => x.difficulty - y.difficulty); title = 'Mavzu bo‘yicha test'; }
    else if (mode === 'abit_test') { qs = shuffle(b.filter(q => q.qtype === 'mc' && q.audience.includes('abiturient') && (!topic || q.topic === topic))).slice(0, sz); title = sz + ' talik variant'; }
    else if (mode === 'open') { qs = shuffle(b.filter(q => (q.qtype === 'open' || q.qtype === 'open2') && (!topic || q.topic === topic) && (!grade || q.grades.includes(grade) || !q.grades.length))).slice(0, sz); title = 'Javobini o‘zi yozadigan testlar'; }
    else if (mode === 'daily') {
      const aud = p.role_type; const d = today();
      const pool = b.filter(q => q.qtype === 'mc' && q.verified && (aud === 'abiturient' ? q.audience.includes('abiturient') : (q.grades.includes(p.grade) || (p.grade >= 10 && q.audience.includes('abiturient')))));
      const buckets = [1, 2, 3, 4, 5].map(diff => shuffle(pool.filter(q => q.difficulty === diff), hash(d + aud + diff)));
      for (let r = 0; qs.length < 20 && buckets.some(b => b.length > r); r++) for (const b of buckets) if (b[r] && qs.length < 20) qs.push(b[r]);
      qs.sort((x, y) => x.difficulty - y.difficulty);
      title = 'Kunlik test · ' + d.split('-').reverse().join('.');
    } else if (mode === 'milliy') {
      instant = false; limit = 150;
      if (exam_tag) {
        qs = b.filter(q => q.exam_tag === exam_tag).sort((x, y) => ({ mc: 0, matching: 1 }[x.qtype] ?? 2) - ({ mc: 0, matching: 1 }[y.qtype] ?? 2) || (+x.source_ref - +y.source_ref));
        title = 'Milliy sertifikat · ' + exam_tag;
      } else {
        const mc = shuffle(b.filter(q => q.qtype === 'mc' && q.audience.includes('abiturient') && q.verified)).slice(0, 32).sort((x, y) => x.difficulty - y.difficulty);
        qs = [...mc, ...shuffle(b.filter(q => q.qtype === 'matching')).slice(0, 1), ...shuffle(b.filter(q => q.qtype === 'open2')).slice(0, 10)];
        title = 'Milliy sertifikat · sinov varianti';
      }
    }
    if (!qs.length) throw new Error('no_questions');
    const s = load();
    const att = { id: 'att-' + Date.now(), user_id: p.id, mode, title, grade: g, topic, question_ids: qs.map(q => q.id), total: qs.length, correct: 0, score: 0,
      xp_earned: 0, coins_earned: 0, status: 'active', instant_feedback: instant, started_at: new Date().toISOString(), meta: { exam_tag } };
    s.attempts.push(att); save();
    return { attempt_id: att.id, title, instant_feedback: instant, mode, time_limit_min: limit, questions: qs.map(pub) };
  },
  async answer(attemptId, qid, answer) {
    const s = load(); const att = s.attempts.find(a => a.id === attemptId);
    const q = (await bank()).find(x => x.id === qid);
    let it = s.items.find(i => i.attempt_id === attemptId && i.question_id === qid);
    if (!(it && att.instant_feedback)) {
      const points = gradeAnswer(q, answer);
      if (it) Object.assign(it, { answer, points, is_correct: points >= 0.999 });
      else { it = { attempt_id: attemptId, question_id: qid, user_id: att.user_id, answer, points, is_correct: points >= 0.999 }; s.items.push(it); }
      save();
    }
    return att.instant_feedback ? { points: it.points, correct: it.is_correct, answer: q.answer, explanation: q.explanation } : { saved: true };
  },
  async finish(attemptId) {
    const s = load(); const att = s.attempts.find(a => a.id === attemptId); const b = await bank();
    const p = s.users[att.user_id];
    let fresh = [];
    const items = s.items.filter(i => i.attempt_id === attemptId);
    if (att.status === 'active') {
      let xp = 0, pts = 0, corr = 0;
      const pairs = items.map(i => ({ q: b.find(x => x.id === i.question_id), points: i.points }));
      for (const { q, points } of pairs) { xp += xpFor(q, points); pts += points; if (points >= 0.999) corr++; }
      let coins = corr;
      if (att.total >= 5 && corr === att.total) { xp += 25; coins += 10; }
      if (att.mode === 'daily') {
        const done = s.attempts.some(a => a.id !== att.id && a.user_id === p.id && a.mode === 'daily' && a.status === 'finished' && a.started_at.slice(0, 10) === today());
        if (done) xp = Math.floor(xp / 4); else { xp += 30; coins += 5; }
      }
      Object.assign(att, { status: 'finished', finished_at: new Date().toISOString(), correct: corr, score: Math.round(10000 * pts / Math.max(1, att.total)) / 100, xp_earned: xp, coins_earned: coins });
      if (att.mode === 'milliy') att.meta.milliy_ball = milliyBall(pairs);
      fresh = touch(p, xp, coins);
      save();
    }
    return { attempt: att, new_rewards: fresh, review: att.question_ids.map(id => {
      const q = b.find(x => x.id === id); const it = items.find(i => i.question_id === id);
      return { question: pub(q), answer: q.answer, explanation: q.explanation, given: it?.answer ?? null, points: it?.points || 0 };
    }) };
  },
  async recordGame(game, score) {
    const s = load(); const p = me();
    const todayXp = s.games.filter(g => g.user_id === p.id && g.created_at.slice(0, 10) === today()).reduce((x, g) => x + g.xp_earned, 0);
    const add = Math.max(0, Math.min(score, 60, 300 - todayXp));
    s.games.push({ user_id: p.id, game, score, xp_earned: add, created_at: new Date().toISOString() });
    const fresh = touch(p, add, Math.floor(add / 10)); save();
    return { xp: add, capped: add < Math.min(score, 60), new_rewards: fresh };
  },
  async leaderboard({ scope = 'uz', region, role, grade, period = 'all', limit = 50 }) {
    const p = me(); const s = load();
    const weekXp = u => s.attempts.filter(a => a.user_id === u.id && a.status === 'finished' && Date.now() - Date.parse(a.finished_at) < 7 * 864e5).reduce((x, a) => x + a.xp_earned, 0)
      + s.games.filter(g => g.user_id === u.id && Date.now() - Date.parse(g.created_at) < 7 * 864e5).reduce((x, g) => x + g.xp_earned, 0);
    let all = [...peers(), ...Object.values(s.users)].map(u => ({ ...u, pts: period === 'week' ? (u.demo ? u.week : weekXp(u)) : u.xp }));
    all = all.filter(u => (scope !== 'region' || u.region === region) && (!role || u.role_type === role) && (!grade || u.grade === grade));
    all.sort((a, b) => b.pts - a.pts);
    let rank = 0, prev = null;
    const rows = all.map((u, i) => { if (u.pts !== prev) { rank = i + 1; prev = u.pts; } return { rank, user_id: u.id, full_name: u.full_name, avatar: u.avatar, region: u.region, grade: u.grade, role_type: u.role_type, xp: u.pts, is_me: u.id === p?.id, demo: u.demo }; });
    const top = rows.slice(0, limit);
    const mine = rows.find(r => r.is_me);
    if (mine && !top.includes(mine)) top.push(mine);
    return top;
  },
  async regionStats(role) {
    const all = [...peers(), ...Object.values(load().users)].filter(u => !role || u.role_type === role);
    const m = {};
    for (const u of all) { m[u.region] = m[u.region] || { region: u.region, users: 0, total_xp: 0 }; m[u.region].users++; m[u.region].total_xp += u.xp; }
    return Object.values(m).map(r => ({ ...r, avg_xp: Math.round(r.total_xp / r.users) })).sort((a, b) => b.avg_xp - a.avg_xp);
  },
  async history(limit = 20) {
    const p = me();
    return load().attempts.filter(a => a.user_id === p?.id && a.status === 'finished').sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit);
  },
  async rewards() { return REWARDS.map(r => ({ audience: 'all', cost_coins: 0, ...r })); },
  async claimReward(id) {
    const s = load(); const p = me(); const r = REWARDS.find(x => x.id === id);
    if (s.userRewards.some(u => u.user_id === p.id && u.reward_id === id)) throw new Error('already');
    if (p.coins < (r.cost_coins || 0)) throw new Error('not_enough_coins');
    p.coins -= r.cost_coins || 0; s.userRewards.push({ user_id: p.id, reward_id: id, earned_at: new Date().toISOString() }); save();
    return { ok: true, coins: p.coins };
  },
  async setAvatar(icon) { const p = me(); p.avatar = icon; save(); return p; },
  async report(qid, message) { const s = load(); s.reports.push({ id: s.reports.length + 1, user_id: s.uid, question_id: qid, message, status: 'new', created_at: new Date().toISOString() }); save(); },
  async announcements() { return load().ann.slice().reverse(); },

  // ---------------- ADMIN (demo) ----------------
  admin: {
    async stats() {
      const s = load(); const b = await bank();
      const users = [...peers(), ...Object.values(s.users)];
      const by = (f) => users.reduce((m, u) => { const k = f(u); if (k != null) m[k] = (m[k] || 0) + 1; return m; }, {});
      const days = {};
      for (const a of s.attempts) { const d = a.started_at.slice(5, 10); days[d] = (days[d] || 0) + 1; }
      const perQ = {};
      for (const i of s.items) { perQ[i.question_id] = perQ[i.question_id] || [0, 0]; perQ[i.question_id][0]++; if (i.is_correct) perQ[i.question_id][1]++; }
      const hardest = Object.entries(perQ).filter(([, v]) => v[0] >= 1).map(([id, v]) => ({ id: +id, stem: (b.find(q => q.id === +id)?.stem || '').slice(0, 120), n: v[0], pct: Math.round(100 * v[1] / v[0]) })).sort((a, b) => a.pct - b.pct).slice(0, 10);
      return { users: users.length, students: users.filter(u => u.role_type === 'student').length, abiturients: users.filter(u => u.role_type === 'abiturient').length,
        by_grade: by(u => u.grade), by_region: by(u => u.region), questions: b.length, unverified: b.filter(q => !q.verified).length,
        attempts: s.attempts.filter(a => a.status === 'finished').length, attempts_7d: days, active_today: Object.values(s.users).filter(u => u.last_active === today()).length,
        reports_new: s.reports.filter(r => r.status === 'new').length, hardest };
    },
    async listQuestions({ search = '', topic, source, verified, qtype, page = 0, size = 30 }) {
      let b = await bank();
      if (search) { const t = search.toLowerCase(); b = b.filter(q => q.stem.toLowerCase().includes(t) || String(q.id) === search || (q.ext_id || '').includes(search)); }
      if (topic) b = b.filter(q => q.topic === topic);
      if (source) b = b.filter(q => q.source === source);
      if (qtype) b = b.filter(q => q.qtype === qtype);
      if (verified === 'yes') b = b.filter(q => q.verified); if (verified === 'no') b = b.filter(q => !q.verified);
      return { rows: b.slice(page * size, page * size + size), total: b.length };
    },
    async saveQuestion(q) {
      const s = load(); const b = await bank();
      if (q.id && b.find(x => x.id === q.id)) {
        const i = b.findIndex(x => x.id === q.id); b[i] = { ...b[i], ...q };
        if (s.qAdded.some(x => x.id === q.id)) s.qAdded = s.qAdded.map(x => x.id === q.id ? b[i] : x); else s.qEdits[q.id] = { ...(s.qEdits[q.id] || {}), ...q };
      } else {
        const nq = { ...q, id: Math.max(...b.map(x => x.id)) + 1, active: true, source: q.source || 'admin' };
        b.push(nq); s.qAdded.push(nq); q = nq;
      }
      save(); return q;
    },
    async deleteQuestion(id) { const s = load(); s.qDeleted.push(id); s.qAdded = s.qAdded.filter(x => x.id !== id); BANK = BANK.filter(q => q.id !== id); save(); },
    async importRows(rows) { let n = 0; for (const r of rows) { await this.saveQuestion({ ...r, id: undefined }); n++; } return n; },
    async listReports() { const b = await bank(); return load().reports.slice().reverse().map(r => ({ ...r, question: b.find(q => q.id === r.question_id) })); },
    async updateReport(id, status) { const r = load().reports.find(x => x.id === id); r.status = status; save(); },
    async listUsers({ search = '' } = {}) { const s = load(); return [...Object.values(s.users), ...peers()].filter(u => !search || u.full_name.toLowerCase().includes(search.toLowerCase())); },
    async updateUser(id, patch) { const s = load(); if (s.users[id]) Object.assign(s.users[id], patch); save(); },
    async listRewards() { return REWARDS; },
    async saveReward() { throw new Error('Demo rejimda sovg‘alar ro‘yxati o‘zgarmaydi'); },
    async deleteReward() { throw new Error('Demo rejimda sovg‘alar ro‘yxati o‘zgarmaydi'); },
    async saveAnnouncement(a) { const s = load(); s.ann.push({ ...a, id: s.ann.length + 1, created_at: new Date().toISOString() }); save(); },
    async deleteAnnouncement(id) { const s = load(); s.ann = s.ann.filter(a => a.id !== id); save(); },
    async seedStatus() { const b = await bank(); return { questions: b.length, topics: TOPICS.length, rewards: REWARDS.length }; },
    async seed() { return { done: true, note: 'Demo rejimda savollar bazasi allaqachon yuklangan.' }; },
  },
};
