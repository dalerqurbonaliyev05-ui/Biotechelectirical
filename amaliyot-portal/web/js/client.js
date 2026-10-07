// Server bilan aloqa: kirish/sessiya, ma'lumotlar so'rovlari, rasm saqlash.
// Hech qanday tashqi xizmat yo'q: hamma so'rovlar shu sayt manziliga (/api/...) ketadi.
//
// Ma'lumotlar so'rovlari quruvchi (builder) ko'rinishida yoziladi:
//   api.from("students").select("*").eq("id", x).order("full_name").limit(10)
// va serverdagi /api/db shlyuziga tuzilmali JSON sifatida yuboriladi (SQL brauzerda tuzilmaydi).
const SESSION_KEY = "amaliyot_session";
const REFRESH_MARGIN_SEC = 60;

const netError = () => ({ message: "Serverga ulanib bo'lmadi. Internetni tekshiring", status: 0 });

export function createClient({ store, base = "" }) {
  const safeStore = {
    get: () => { try { const v = store.getItem(SESSION_KEY); return v ? JSON.parse(v) : null; } catch { return null; } },
    set: (s) => { try { store.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* xotira yopiq */ } },
    clear: () => { try { store.removeItem(SESSION_KEY); } catch { /* e'tiborsiz */ } },
  };
  const now = () => Math.floor(Date.now() / 1000);
  let refreshing = null;

  async function rawFetch(method, path, { body, raw, token, headers = {} } = {}) {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload = raw;
    if (body !== undefined) { h["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    let res;
    try { res = await fetch(base + path, { method, headers: h, body: payload }); } catch { return { status: 0, json: null, error: netError() }; }
    let json = null;
    try { json = await res.json(); } catch { /* bo'sh javob */ }
    return { status: res.status, json };
  }

  function announceSignedOut() {
    safeStore.clear();
    try { window.dispatchEvent(new CustomEvent("amaliyot:signed-out")); } catch { /* e'tiborsiz */ }
  }

  // Refresh token faqat bir marta ishlaydi: parallel chaqiruvlar bitta so'rovga birlashtiriladi.
  async function refresh() {
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const s = safeStore.get();
      if (!s?.refresh_token) return null;
      const r = await rawFetch("POST", "/api/auth/refresh", { body: { refresh_token: s.refresh_token } });
      if (r.status === 200 && r.json?.access_token) { safeStore.set(r.json); return r.json; }
      if (r.status === 0) return s.expires_at > now() ? s : null; // tarmoq yo'q: eski token hali yaroqli bo'lsa davom etamiz
      // Boshqa varaq (tab) allaqachon yangilagan bo'lishi mumkin: xotiradagi yangi sessiyani olamiz.
      const cur = safeStore.get();
      if (cur && cur.refresh_token !== s.refresh_token && cur.expires_at > now()) return cur;
      announceSignedOut();
      return null;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }

  async function currentSession() {
    let s = safeStore.get();
    if (!s) return null;
    if (s.expires_at - now() < REFRESH_MARGIN_SEC) s = await refresh();
    return s;
  }

  // Kirgan foydalanuvchi nomidan so'rov. 401 bo'lsa bir marta tokenni yangilab qayta urinadi.
  async function authed(method, path, opts = {}) {
    let s = await currentSession();
    if (!s) return { status: 401, json: { error: "Sessiya tugagan. Qaytadan kiring" } };
    let r = await rawFetch(method, path, { ...opts, token: s.access_token });
    if (r.status === 401) {
      s = await refresh();
      if (!s) return r;
      r = await rawFetch(method, path, { ...opts, token: s.access_token });
      if (r.status === 401) announceSignedOut();
    }
    return r;
  }

  // ---------- Ma'lumotlar so'rovlari ----------
  const toErr = (r) => {
    if (r.status === 0) return netError();
    const e = r.json?.error;
    const message = (e && typeof e === "object" ? e.message : e) || `Xatolik (${r.status})`;
    return { message, status: r.status, code: e?.code, details: r.json?.details };
  };

  class Query {
    constructor(table) { this.table = table; this.op = null; this.filters = []; this.orderBy = []; this.cols = undefined; this.returning = false; this.mode = undefined; }
    need(m) { if (this.op === null) throw new TypeError(`from("${this.table}").${m}: avval select/insert/update/delete chaqiring`); }
    select(cols) { if (this.op === null) this.op = "select"; else this.returning = true; this.cols = cols; return this; }
    insert(v) { this.op = "insert"; this.values = v; return this; }
    update(v) { this.op = "update"; this.values = v; return this; }
    upsert(v, o = {}) { this.op = "upsert"; this.values = v; this.onConflict = o.onConflict; return this; }
    delete() { this.op = "delete"; return this; }
    f(op, col, val) { this.need(op); this.filters.push({ col, op, val }); return this; }
    eq(c, v) { return this.f("eq", c, v); }
    neq(c, v) { return this.f("neq", c, v); }
    gt(c, v) { return this.f("gt", c, v); }
    lt(c, v) { return this.f("lt", c, v); }
    gte(c, v) { return this.f("gte", c, v); }
    lte(c, v) { return this.f("lte", c, v); }
    in(c, v) { return this.f("in", c, v); }
    order(col, o = {}) { this.need("order"); this.orderBy.push({ col, asc: o.ascending !== false }); return this; }
    limit(n) { this.need("limit"); this.lim = n; return this; }
    range(a, b) { this.need("range"); this.rng = [a, b]; return this; }
    maybeSingle() { this.need("maybeSingle"); this.mode = "maybe"; return this; }
    single() { this.need("single"); this.mode = "one"; return this; } // aynan bitta qator bo'lishi shart
    then(res, rej) { return this.run().then(res, rej); }
    async run() {
      const body = { table: this.table, op: this.op };
      if (this.filters.length) body.filters = this.filters;
      if (this.cols !== undefined) body.select = this.cols;
      if (this.orderBy.length) body.order = this.orderBy;
      if (this.lim !== undefined) body.limit = this.lim;
      if (this.rng) body.range = this.rng;
      if (this.values !== undefined) body.values = this.values;
      if (this.onConflict) body.onConflict = this.onConflict;
      if (this.returning) body.returning = true;
      if (this.mode) body.single = this.mode;
      const r = await authed("POST", "/api/db", { body });
      if (r.status === 200 && r.json) return { data: r.json.data ?? null, error: null };
      return { data: null, error: toErr(r) };
    }
  }
  // ---------- Kirish ----------
  const userOf = (u) => ({ id: u.id, login: u.login, full_name: u.full_name, role: u.role, must_change_password: !!u.must_change_password });
  const auth = {
    async signIn({ login, password, remember }) {
      const r = await rawFetch("POST", "/api/auth/login", { body: { login, password, remember: !!remember } });
      if (r.status === 200 && r.json?.access_token) { safeStore.set(r.json); return { data: { user: userOf(r.json.user) }, error: null }; }
      return { data: null, error: toErr(r) };
    },
    async activate({ hemis_id, code, password }) {
      const r = await rawFetch("POST", "/api/auth/activate", { body: { hemis_id, code, password } });
      if (r.status === 200) return { data: r.json, error: null };
      return { data: null, error: { ...toErr(r), attempts_left: r.json?.attempts_left } };
    },
    async getSession() {
      const s = await currentSession();
      return { data: { session: s ? { access_token: s.access_token, user: userOf(s.user) } : null }, error: null };
    },
    async getUser() {
      const { data: { session } } = await auth.getSession();
      return session ? { data: { user: session.user }, error: null } : { data: { user: null }, error: { message: "Sessiya yo'q" } };
    },
    async signOut() {
      const s = safeStore.get();
      safeStore.clear();
      if (s?.refresh_token) await rawFetch("POST", "/api/auth/logout", { body: { refresh_token: s.refresh_token } });
      return { error: null };
    },
    async changePassword(current_password, new_password) {
      const r = await authed("POST", "/api/auth/change-password", { body: { current_password, new_password } });
      if (r.status !== 200) return { data: null, error: toErr(r) };
      const s = safeStore.get();
      if (s) safeStore.set({ ...s, user: { ...s.user, must_change_password: false } });
      return { data: { ok: true }, error: null };
    },
  };

  // ---------- Rasm saqlash ----------
  const storage = {
    from(bucket) {
      const url = (p) => `/api/storage/${bucket}/${p.split("/").map(encodeURIComponent).join("/")}`;
      return {
        async upload(path, blob) {
          const r = await authed("PUT", url(path), { raw: blob, headers: { "Content-Type": blob.type || "application/octet-stream" } });
          return r.status === 200 ? { data: { path }, error: null } : { data: null, error: toErr(r) };
        },
        async createSignedUrls(paths, ttl = 3600) {
          const r = await authed("POST", "/api/storage/sign", { body: { paths, ttl } });
          return r.status === 200 ? { data: r.json.data, error: null } : { data: null, error: toErr(r) };
        },
        async remove(paths) {
          for (const p of paths) { const r = await authed("DELETE", url(p)); if (r.status !== 200) return { data: null, error: toErr(r) }; }
          return { data: [], error: null };
        },
      };
    },
  };

  // ---------- Boshqaruv amallari (import, xodimlar) ----------
  const FN_PATH = { "import-students": "/api/admin/import-students", "manage-users": "/api/admin/users" };
  async function callFn(name, body) {
    const path = FN_PATH[name];
    if (!path) throw new Error("Noma'lum amal: " + name);
    const r = await authed("POST", path, { body });
    if (r.status === 200) return r.json;
    const e = new Error(toErr(r).message); e.status = r.status; e.data = r.json; throw e;
  }

  return { from: (t) => new Query(t), auth, storage, callFn };
}
