// Soxta Supabase: brauzer so'rovlarini ushlab, xotiradagi ma'lumotlar bilan javob beradi.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

export const SB = 'https://vcbdzfwvavxkedgmbrvf.supabase.co';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };

/** dist papkasini statik tarzda xizmat qiladi. */
export function serveDir(dir) {
  const srv = createServer(async (req, res) => {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (p.endsWith('/')) p += 'index.html';
    try {
      const buf = await readFile(join(dir, p));
      res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
      res.end(buf);
    } catch { res.writeHead(404); res.end('yo\'q'); }
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, url: `http://127.0.0.1:${srv.address().port}/` })));
}

const jwt = (uid) => {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'HS256', typ: 'JWT' })}.${b({ sub: uid, role: 'authenticated', exp: 4102444800 })}.sig`;
};

export function sessionFor(user) {
  return {
    access_token: jwt(user.id), refresh_token: 'r', token_type: 'bearer', expires_in: 3600 * 24 * 365, expires_at: 4102444800,
    user: { id: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, app_metadata: {}, user_metadata: user.meta ?? {}, created_at: '2026-01-01T00:00:00Z' },
  };
}

/** db: { table: rows[] } ; rpc: { name: (args) => result } ; log: so'rovlar yozuvi */
export async function installMock(context, { db, rpc = {}, user, seed = true }) {
  const log = [];
  if (seed) {
    await context.addInitScript(([key, s]) => { try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* */ } },
      ['sb-vcbdzfwvavxkedgmbrvf-auth-token', sessionFor(user)]);
  }

  await context.route('https://img.test/**', (route) => {
    const hue = (route.request().url().length * 37) % 360;
    route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="540"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},80%,70%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},85%,55%)"/></linearGradient></defs><rect width="600" height="540" fill="url(#g)"/><text x="300" y="320" font-size="180" text-anchor="middle">🍲</text></svg>` });
  });
  await context.route('https://*.tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8efe4"/><path d="M0 128H256M128 0V256" stroke="#fff" stroke-width="10"/></svg>' }));
  await context.route(`${SB}/realtime/**`, (route) => route.abort());

  await context.route(`${SB}/auth/v1/**`, (route) => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('/token')) { log.push({ method: 'POST', name: 'auth/token', body: route.request().postData() }); return route.fulfill({ json: sessionFor(user) }); }
    if (u.pathname.endsWith('/user') && route.request().method() === 'GET') return route.fulfill({ json: sessionFor(user).user });
    if (route.request().method() === 'PUT' && u.pathname.endsWith('/user')) { log.push({ method: 'PUT', name: 'auth/user', body: route.request().postData() }); return route.fulfill({ json: sessionFor(user).user }); }
    return route.fulfill({ json: {} });
  });

  await context.route(`${SB}/rest/v1/**`, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const name = u.pathname.replace('/rest/v1/', '');
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    log.push({ method: req.method(), name, query: u.search, body: req.postData() });

    if (name.startsWith('rpc/')) {
      const fn = rpc[name.slice(4)];
      const out = fn ? await fn(req.postDataJSON?.() ?? {}) : null;
      return route.fulfill({ json: out ?? null });
    }
    if (req.method() === 'GET' || req.method() === 'HEAD') {
      let rows = [...(db[name] ?? [])];
      for (const [k, v] of u.searchParams) {
        if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
        const m = /^(eq|neq|in|is)\.(.*)$/.exec(v);
        if (!m) continue;
        rows = rows.filter((r) => {
          const val = r[k];
          if (m[1] === 'eq') return String(val) === m[2];
          if (m[1] === 'neq') return String(val) !== m[2];
          if (m[1] === 'in') return m[2].replace(/[()]/g, '').split(',').includes(String(val));
          if (m[1] === 'is') return m[2] === 'null' ? val == null : String(val) === m[2];
          return true;
        });
      }
      const ord = u.searchParams.get('order');
      if (ord) { const [col, dir] = ord.split('.'); rows.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (dir === 'desc' ? -1 : 1)); }
      // Ichki (embedded) bog'lanishlar: select=*,order_items(name,portions) -> order_id bo'yicha biriktiriladi
      for (const m of (u.searchParams.get('select') ?? '').matchAll(/(\w+)\([^)]*\)/g)) {
        const fk = `${m[1].replace(/s$/, '')}_id`;
        rows = rows.map((r) => (fk in r
          ? { ...r, [m[1]]: (db[m[1]] ?? []).find((x) => x.id === r[fk]) ?? null }                       // ko'pga-bir
          : { ...r, [m[1]]: (db[m[1]] ?? []).filter((x) => x.order_id === r.id) }));                     // birga-ko'p
      }
      const lim = Number(u.searchParams.get('limit') ?? 0); if (lim) rows = rows.slice(0, lim);
      if (single) return rows.length ? route.fulfill({ json: rows[0] }) : route.fulfill({ status: 406, json: { message: 'no rows', code: 'PGRST116' } });
      return route.fulfill({ json: rows, headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` } });
    }
    if (req.method() === 'POST') { const body = req.postDataJSON(); (db[name] ??= []).push(...(Array.isArray(body) ? body : [body])); return route.fulfill({ status: 201, json: body }); }
    if (req.method() === 'PATCH') {
      const body = req.postDataJSON();
      for (const [k, v] of u.searchParams) { const m = /^eq\.(.*)$/.exec(v); if (m) (db[name] ?? []).filter((r) => String(r[k]) === m[1]).forEach((r) => Object.assign(r, body)); }
      return route.fulfill({ status: 204, body: '' });
    }
    return route.fulfill({ status: 204, body: '' });
  });
  return { log };
}
