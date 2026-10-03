/* Sinov uchun xotiradagi soxta Supabase mijozi (haqiqiy supabase-js o'rniga qo'yiladi).
 * Holat localStorage'da saqlanadi: sahifalar almashganda ham yo'qolmaydi.
 * Faqat ilova ishlatadigan metodlar qo'llab-quvvatlanadi. RLS TAQLID QILINMAYDI
 * (baza qoidalari alohida, jonli bazada SQL bilan sinalgan). */
(function () {
  const KEY = "fakeDb", SKEY = "fakeSession";
  const load = () => JSON.parse(localStorage.getItem(KEY) || "null");
  let db = load();
  if (!db) { db = JSON.parse(JSON.stringify(window.__SEED__ || {})); }
  for (const t of ["profiles", "students", "attendance", "tasks", "announcements", "photos", "approvals", "practice_periods", "brigades", "feedbacks", "settings", "auth_users", "storage"]) db[t] = db[t] || [];
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  save();

  const uuid = () => crypto.randomUUID();
  const nowISO = () => new Date().toISOString();
  const DEFAULTS = {
    approvals: () => ({ state: "pending", requested_at: nowISO(), decided_by: null, decided_at: null, note: null, data_hash: null, days_count: null, period_id: null }),
    photos: () => ({ created_at: nowISO() }), feedbacks: () => ({ created_at: nowISO() }), tasks: () => ({ created_at: nowISO() }),
    announcements: () => ({ created_at: nowISO() }), brigades: () => ({ active: true }), attendance: () => ({ updated_at: nowISO() }),
  };
  const UNIQUE = { attendance: ["student_id", "work_date"], approvals: ["student_id", "period_id", "kind"], brigades: ["name"] };
  const clone = (x) => JSON.parse(JSON.stringify(x));

  // Kichik JPEG (signed URL sifatida): jsPDF addImage uchun haqiqiy JPEG kerak.
  const mkJpeg = () => { const c = document.createElement("canvas"); c.width = 60; c.height = 40; const g = c.getContext("2d"); g.fillStyle = "#3a7"; g.fillRect(0, 0, 60, 40); g.fillStyle = "#fff"; g.fillRect(10, 10, 20, 15); return c.toDataURL("image/jpeg", 0.8); };

  class Q {
    constructor(table) { this.t = table; this.op = null; this.f = []; this.ord = null; this.lim = null; this.rng = null; this.payload = null; this.opts = {}; this.wantSel = false; this.sing = null; }
    // Haqiqiy supabase-js qoidasi: filtrlar (eq, order, ...) faqat select/insert/update/upsert/delete'dan KEYIN mavjud.
    need(m) { if (this.op === null) throw new TypeError(`sb.from("${this.t}").${m} is not a function (avval select/insert/update/delete chaqiring)`); }
    select() { if (this.op === null) this.op = "select"; this.wantSel = true; return this; }
    insert(p) { this.op = "insert"; this.payload = Array.isArray(p) ? p : [p]; return this; }
    update(p) { this.op = "update"; this.payload = p; return this; }
    upsert(p, o) { this.op = "upsert"; this.payload = Array.isArray(p) ? p : [p]; this.opts = o || {}; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.need("eq"); this.f.push((r) => r[c] === v); return this; }
    neq(c, v) { this.need("neq"); this.f.push((r) => r[c] !== v); return this; }
    in(c, a) { this.need("in"); this.f.push((r) => a.includes(r[c])); return this; }
    gte(c, v) { this.need("gte"); this.f.push((r) => r[c] >= v); return this; }
    lte(c, v) { this.need("lte"); this.f.push((r) => r[c] <= v); return this; }
    order(c, o = {}) { this.need("order"); this.ord = [c, o.ascending !== false]; return this; }
    limit(n) { this.need("limit"); this.lim = n; return this; }
    range(a, b) { this.need("range"); this.rng = [a, b]; return this; }
    maybeSingle() { this.need("maybeSingle"); this.sing = "maybe"; return this; }
    single() { this.need("single"); this.sing = "one"; return this; }
    then(res, rej) { this.need("then"); return Promise.resolve().then(() => this.exec()).then(res, rej); }
    exec() {
      if (window.__failTables && window.__failTables.includes(this.t)) return { data: null, error: { message: "fake: tarmoq xatosi" } };
      const rows = db[this.t]; const fin = (data) => { save(); return this.out(data); };
      const match = (r) => this.f.every((fn) => fn(r));
      if (this.op === "select") {
        let out = rows.filter(match).map(clone);
        if (this.ord) { const [c, asc] = this.ord; out.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1)); }
        if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
        if (this.lim != null) out = out.slice(0, this.lim);
        return this.out(out);
      }
      if (this.op === "insert" || this.op === "upsert") {
        const done = [];
        for (const p of this.payload) {
          const row = { ...(DEFAULTS[this.t] ? DEFAULTS[this.t]() : {}), ...clone(p) };
          if (row.id === undefined && this.t !== "settings") row.id = uuid();
          const uq = this.op === "upsert" && this.opts.onConflict ? this.opts.onConflict.split(",") : UNIQUE[this.t];
          const dup = uq && rows.find((r) => uq.every((c) => (r[c] ?? null) === (row[c] ?? null)));
          if (dup) {
            if (this.op === "upsert") { Object.assign(dup, row, { id: dup.id }); done.push(clone(dup)); continue; }
            return { data: null, error: { message: `duplicate key value violates unique constraint "${this.t}_key"` } };
          }
          rows.push(row); done.push(clone(row));
        }
        return fin(done);
      }
      if (this.op === "update") { const hit = rows.filter(match); hit.forEach((r) => Object.assign(r, clone(this.payload))); return fin(hit.map(clone)); }
      if (this.op === "delete") { const keep = rows.filter((r) => !match(r)); db[this.t] = keep; return fin([]); }
    }
    out(data) {
      if (!this.wantSel && this.op !== "select") return { data: null, error: null };
      if (this.sing === "maybe") return data.length > 1 ? { data: null, error: { message: "multiple rows" } } : { data: data[0] ?? null, error: null };
      if (this.sing === "one") return data.length !== 1 ? { data: null, error: { message: "JSON object requested, multiple (or no) rows returned" } } : { data: data[0], error: null };
      return { data, error: null };
    }
  }

  const getSession = () => JSON.parse(localStorage.getItem(SKEY) || "null");
  const publicUser = (u) => ({ id: u.id, email: u.email, user_metadata: clone(u.user_metadata || {}) });
  const auth = {
    async getSession() { return { data: { session: getSession() }, error: null }; },
    async getUser() { const s = getSession(); return s ? { data: { user: s.user }, error: null } : { data: { user: null }, error: { message: "no session" } }; },
    async signInWithPassword({ email, password }) {
      const u = db.auth_users.find((x) => x.email === email);
      if (!u || u.password !== password) return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } };
      if (u.banned) return { data: { user: null, session: null }, error: { message: "User is banned" } };
      const session = { access_token: "tok-" + u.id, user: publicUser(u) };
      localStorage.setItem(SKEY, JSON.stringify(session));
      return { data: { user: session.user, session }, error: null };
    },
    async signOut() { localStorage.removeItem(SKEY); return { error: null }; },
    async updateUser({ password, data }) {
      const s = getSession(); if (!s) return { data: null, error: { message: "Auth session missing!" } };
      const u = db.auth_users.find((x) => x.id === s.user.id);
      if (password !== undefined) { if (password === u.password) return { data: null, error: { message: "New password should be different from the old password." } }; u.password = password; }
      if (data) u.user_metadata = { ...(u.user_metadata || {}), ...data };
      save(); const session = { ...s, user: publicUser(u) }; localStorage.setItem(SKEY, JSON.stringify(session));
      return { data: { user: session.user }, error: null };
    },
  };
  const storage = {
    from(bucket) {
      return {
        async upload(path, blob) { if (window.__failUpload) return { data: null, error: { message: "fake upload xatosi" } }; db.storage.push({ bucket, path, size: blob.size, type: blob.type }); save(); return { data: { path }, error: null }; },
        async createSignedUrls(paths) { const url = location.origin + "/__photo.jpg"; return { data: paths.map((p) => ({ path: p, signedUrl: url, error: null })), error: null }; },
        async remove(paths) { db.storage = db.storage.filter((o) => !(o.bucket === bucket && paths.includes(o.path))); save(); return { data: [], error: null }; },
      };
    },
  };
  window.supabase = { createClient: () => ({ from: (t) => new Q(t), auth, storage }) };
  window.__fake = {
    db: () => db, save,
    addUser(u) { db.auth_users.push(u); save(); },
    reload() { db = load(); },
  };
})();
