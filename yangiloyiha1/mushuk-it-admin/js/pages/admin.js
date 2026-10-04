// admin_panel.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import {
  sb, requireAdmin, initShell, esc, fmtDate, fmtDateTime, toast, confirmModal, promptModal, openModal, showImage,
  mapsUrl, coords, animalBadge, postStatusBadge, safeImg, removePhotos, debounce, cleanFilter, ANIMAL, icon,
} from "../app.js";
import { SUPABASE_URL } from "../config.js";

const { user, profile } = await requireAdmin();
const PAGE = 24;
const sections = {};
const POST_COLS = "id, user_id, animal_type, title, image_url, latitude, longitude, address, caption, status, blocked_reason, created_at, likes(count), comments(count)";

// ---------- Umumiy yordamchilar ----------
const initialOf = (name) => esc((name || "?").trim().charAt(0).toUpperCase());
const kpi = (color, label, n, ico) => `<div class="kpi ${color}"><div><span class="l">${label}</span><b>${n}</b></div><div class="ic">${icon(ico, 26)}</div></div>`;
const kpiSm = (label, n, ico) => `<div class="kpi sm"><div><span class="l">${label}</span><b>${n}</b></div><div class="ic">${icon(ico, 22)}</div></div>`;

// Foydalanuvchilar ro'yxati (RPC): har bo'limda yangilanadi, id bo'yicha xarita ham beradi.
async function loadUsers() {
  const { data, error } = await sb.rpc("admin_list_users");
  if (error) throw error;
  return { list: data, byId: new Map(data.map((u) => [u.user_id, u])) };
}
function personHtml(u, fallback = "O'chirilgan foydalanuvchi") {
  if (!u) return `<div class="person"><span class="avatar" style="background:#94a3b8">?</span><div><b>${esc(fallback)}</b></div></div>`;
  const av = /^https:\/\//.test(u.avatar_url || "") ? `<img src="${esc(u.avatar_url)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar">${initialOf(u.full_name || u.email)}</span>`;
  return `<div class="person">${av}<div><b>${esc(u.full_name || "Ismsiz")}${u.blocked ? ' <span class="badge bad">Bloklangan</span>' : ""}</b><span class="muted small">${esc(u.email || "")}</span></div></div>`;
}
function thumbHtml(url, caption = "") {
  const s = safeImg(url);
  return s ? `<img class="thumb-sm" src="${esc(s)}" alt="" loading="lazy" data-zoom="${esc(s)}" data-cap="${esc(caption)}">` : '<span class="thumb-sm"></span>';
}
function bindZoom(root) {
  root.querySelectorAll("[data-zoom]").forEach((i) => (i.onclick = () => showImage(i.dataset.zoom, i.dataset.cap)));
}
// "Yana yuklash" bilan sahifalash: load(from, to) -> qatorlar massivi. render(rows, append) chaqiriladi.
function paginate(box, more, load, render, size = PAGE) {
  let from = 0, busy = false;
  const next = async () => {
    if (busy) return; busy = true; more.disabled = true;
    try {
      const rows = await load(from, from + size - 1);
      render(rows, from > 0);
      from += rows.length;
      more.classList.toggle("hidden", rows.length < size);
    } catch (e) { toast("Yuklab bo'lmadi: " + (e.message || e), "err"); }
    busy = false; more.disabled = false;
  };
  more.onclick = next;
  return { reset: () => { from = 0; box.replaceChildren(); return next(); }, next };
}
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ixtiyoriy */ } };

// Kunlik ustunli diagramma: days = [{day, posts, ...}], key = ustun nomi, cls = rang sinfi (green/blue/pink/orange)
function barChart(days, key, cls, short = false) {
  const max = Math.max(1, ...days.map((d) => d[key]));
  const bars = days.map((d) => {
    const dd = d.day.split("-")[2];   // sana to'liq ko'rinishi title'da (ustiga olib borilganda)
    return `<div class="bar" title="${esc(fmtDate(d.day))}: ${d[key]}"><b>${d[key] || ""}</b><i style="height:${Math.round((d[key] / max) * 100)}%"></i><span>${dd}</span></div>`;
  }).join("");
  return `<div class="bars ${cls}${short ? " short" : ""}">${bars}</div>`;
}

// ---------- Faollik lentasi (Xabarlar): so'nggi 7 kundagi e'lon, izoh, layk va yangi foydalanuvchilar ----------
async function fetchActivity(users, limit = 50) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const emb = "posts(id, title, animal_type, image_url)";
  const [p, c, l] = await Promise.all([
    sb.from("posts").select("id, user_id, title, animal_type, image_url, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    sb.from("comments").select(`id, post_id, user_id, text, created_at, ${emb}`).gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    sb.from("likes").select(`id, post_id, user_id, created_at, ${emb}`).gte("created_at", since).order("created_at", { ascending: false }).limit(30),
  ]);
  for (const r of [p, c, l]) if (r.error) throw r.error;
  const ev = [
    ...p.data.map((x) => ({ kind: "post", at: x.created_at, user_id: x.user_id, post_id: x.id, title: x.title, animal: x.animal_type })),
    ...c.data.map((x) => ({ kind: "comment", at: x.created_at, user_id: x.user_id, post_id: x.post_id, text: x.text, title: x.posts?.title, animal: x.posts?.animal_type })),
    ...l.data.map((x) => ({ kind: "like", at: x.created_at, user_id: x.user_id, post_id: x.post_id, title: x.posts?.title, animal: x.posts?.animal_type })),
    ...users.list.filter((u) => u.created_at >= since).map((u) => ({ kind: "user", at: u.created_at, user_id: u.user_id })),
  ];
  return ev.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}
function feedHtml(events, users) {
  if (!events.length) return '<div class="empty">So\'nggi 7 kunda faollik yo\'q</div>';
  return events.map((e) => {
    const name = `<b>${esc(users.byId.get(e.user_id)?.full_name || "Foydalanuvchi")}</b>`;
    const t = e.title || ANIMAL[e.animal]?.label || "e'lon";
    const text = {
      post: `${name} yangi e'lon qo'shdi «${esc(t)}»`,
      comment: `${name} «${esc(t)}» e'loniga izoh yozdi: <span class="muted">${esc(e.text)}</span>`,
      like: `${name} «${esc(t)}» e'loniga layk bosdi`,
      user: `${name} ro'yxatdan o'tdi`,
    }[e.kind];
    const ico = { post: "image", comment: "comment", like: "heart", user: "user" }[e.kind];
    return `<div class="feed-item${e.post_id ? "" : " static"}" ${e.post_id ? `data-post="${esc(e.post_id)}"` : ""}><span class="f-ico ${e.kind}">${icon(ico, 19)}</span><div class="grow">${text}<div class="muted small">${fmtDateTime(e.at)}</div></div></div>`;
  }).join("");
}
async function showPost(id, users) {
  const { data, error } = await sb.from("posts").select(POST_COLS).eq("id", id).maybeSingle();
  if (error) return toast(error.message, "err");
  if (!data) return toast("E'lon topilmadi (o'chirilgan bo'lishi mumkin)", "err");
  await openPostModal(data, users.byId.get(data.user_id), null);
}
function bindFeed(root, users) {
  root.querySelectorAll("[data-post]").forEach((n) => (n.onclick = () => void showPost(n.dataset.post, users)));
}

// ---------- Postlar: karta va amallar (E'lonlar va Xarita bo'limlarida bir xil) ----------
async function setPostStatus(post, status, reason) {
  const patch = status === "blocked" ? { status, blocked_reason: reason || null } : { status, blocked_reason: null };
  const { error } = await sb.from("posts").update(patch).eq("id", post.id);
  if (error) throw error;
}
async function deletePost(post) {
  await removePhotos([post.image_url]);
  const { error } = await sb.from("posts").delete().eq("id", post.id);
  if (error) throw error;
}
function postCardHtml(p, users) {
  const u = users.byId.get(p.user_id);
  const blocked = p.status === "blocked";
  return `<div class="pcard ${blocked ? "is-blocked" : ""}" data-id="${esc(p.id)}">
    <div class="pimg">${safeImg(p.image_url) ? `<img src="${esc(safeImg(p.image_url))}" alt="" loading="lazy" data-zoom="${esc(safeImg(p.image_url))}">` : ""}
      <div class="tags">${animalBadge(p.animal_type)}${blocked ? '<span class="badge bad">Bloklangan</span>' : ""}</div></div>
    <div class="pbody">
      ${p.title ? `<b>${esc(p.title)}</b>` : ""}
      ${personHtml(u)}
      <div class="small">📍 ${esc(p.address || "Manzil aniqlanmagan")}<br><span class="muted">${coords(p.latitude, p.longitude)}</span> · <a href="${esc(mapsUrl(p.latitude, p.longitude))}" target="_blank" rel="noopener noreferrer">Xarita</a></div>
      <div class="muted small">${fmtDateTime(p.created_at)} · ❤️ ${p.likes?.[0]?.count ?? 0} · 💬 ${p.comments?.[0]?.count ?? 0}</div>
      ${blocked && p.blocked_reason ? `<div class="small" style="color:var(--bad)">Sabab: ${esc(p.blocked_reason)}</div>` : ""}
      <div class="actions">
        <button class="btn secondary sm" data-act="open">Izoh/layklar</button>
        <button class="btn ${blocked ? "ok" : "warn"} sm" data-act="${blocked ? "unblock" : "block"}">${blocked ? "Ochish" : "Bloklash"}</button>
        <button class="btn bad sm" data-act="delete">O'chirish</button>
      </div></div></div>`;
}
// Karta tugmasi bosilganda: amalni bajaradi; muvaffaqiyatli o'zgarishdan so'ng done() chaqiriladi.
async function postAction(act, post, users, done) {
  if (act === "open") return openPostModal(post, users.byId.get(post.user_id), done);
  if (act === "block") {
    const reason = await promptModal("Postni bloklash", "Post foydalanuvchilarga ko'rinmaydi (muallifga ko'rinadi). Keyin qayta ochish mumkin.");
    if (reason === null) return;
    await setPostStatus(post, "blocked", reason); toast("Post bloklandi", "ok");
  } else if (act === "unblock") { await setPostStatus(post, "active"); toast("Post qayta ochildi", "ok"); }
  else if (act === "delete") {
    if (!(await confirmModal("Postni o'chirish", "Post, rasm, layk va izohlar butunlay o'chiriladi. Qaytarib bo'lmaydi.", "O'chirish"))) return;
    await deletePost(post); toast("Post o'chirildi", "ok");
  }
  await done();
}

// Post tafsiloti: rasm, joy, izohlar va layklar (har birini o'chirish mumkin).
async function openPostModal(post, author, onChange) {
  const m = openModal({ title: "Post", html: '<div class="loading"><div class="spinner"></div>Yuklanmoqda...</div>', actions: [{ label: "Yopish" }] });
  const [cm, lk, users] = await Promise.all([
    sb.from("comments").select("id, user_id, text, created_at").eq("post_id", post.id).order("created_at"),
    sb.from("likes").select("id, user_id, created_at").eq("post_id", post.id).order("created_at"),
    loadUsers(),
  ]);
  if (cm.error || lk.error) { m.el.innerHTML = `<div class="alert err">${esc((cm.error || lk.error).message)}</div>`; return; }
  const render = () => {
    m.el.innerHTML = `
      ${safeImg(post.image_url) ? `<img class="lightbox" src="${esc(safeImg(post.image_url))}" alt="">` : ""}
      <div class="row between mt"><div>${personHtml(author)}</div><div>${animalBadge(post.animal_type)} ${postStatusBadge(post.status)}</div></div>
      ${post.title ? `<h3 style="margin-top:10px">${esc(post.title)}</h3>` : ""}
      ${post.caption ? `<p>${esc(post.caption)}</p>` : ""}
      ${post.status === "blocked" && post.blocked_reason ? `<div class="alert err">Bloklash sababi: ${esc(post.blocked_reason)}</div>` : ""}
      <p class="small">📍 ${esc(post.address || "Manzil aniqlanmagan")} <span class="muted">(${coords(post.latitude, post.longitude)})</span> · <a href="${esc(mapsUrl(post.latitude, post.longitude))}" target="_blank" rel="noopener noreferrer">Xaritada ochish</a><br><span class="muted">${fmtDateTime(post.created_at)}</span></p>
      <h4>Izohlar (${cm.data.length})</h4>
      ${cm.data.length ? cm.data.map((c) => `<div class="cmt"><div><b class="small">${esc(users.byId.get(c.user_id)?.full_name || "Foydalanuvchi")}</b> <span class="muted small">${fmtDateTime(c.created_at)}</span><p>${esc(c.text)}</p></div><button class="btn bad sm" data-dc="${esc(c.id)}">O'chirish</button></div>`).join("") : '<p class="muted small">Izoh yo\'q</p>'}
      <h4 style="margin-top:14px">Layklar (${lk.data.length})</h4>
      ${lk.data.length ? lk.data.map((l) => `<div class="cmt"><div><b class="small">${esc(users.byId.get(l.user_id)?.full_name || "Foydalanuvchi")}</b> <span class="muted small">${fmtDateTime(l.created_at)}</span></div><button class="btn bad sm" data-dl="${esc(l.id)}">Olib tashlash</button></div>`).join("") : '<p class="muted small">Layk yo\'q</p>'}`;
    const del = (attr, table, arr) => m.el.querySelectorAll(`[${attr}]`).forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      const { error } = await sb.from(table).delete().eq("id", b.getAttribute(attr));
      if (error) { toast(error.message, "err"); b.disabled = false; return; }
      const i = arr.findIndex((x) => x.id === b.getAttribute(attr)); if (i >= 0) arr.splice(i, 1);
      toast("O'chirildi", "ok"); render(); onChange?.();
    }));
    del("data-dc", "comments", cm.data); del("data-dl", "likes", lk.data);
  };
  render();
}

// ---------- Bosh sahifa ----------
sections.dashboard = async (el) => {
  const [{ data: s, error }, users] = await Promise.all([sb.rpc("admin_stats"), loadUsers()]);
  if (error) throw error;
  const events = await fetchActivity(users, 8);
  const days = s.daily || [];
  const catPct = s.total_posts ? Math.round((s.cat_posts / s.total_posts) * 100) : 0;
  el.innerHTML = `<h2>Bosh sahifa</h2>
    <div class="grid c4 mb">
      ${kpi("green", "Jami e'lonlar", s.total_posts, "image")}
      ${kpi("blue", "Foydalanuvchilar", s.total_users, "users")}
      ${kpi("pink", "Layklar", s.total_likes.toLocaleString("en-US"), "heart")}
      ${kpi("orange", "Izohlar", s.total_comments.toLocaleString("en-US"), "comment")}
    </div>
    <div class="grid c4 mb">
      ${kpiSm("Bugungi yangi e'lonlar", s.new_posts_today, "image")}
      ${kpiSm("Faol foydalanuvchilar (7 kun)", s.active_users_7d, "users")}
      ${kpiSm("Faol foydalanuvchilar (30 kun)", s.active_users_30d, "users")}
      ${kpiSm("Bloklangan e'lon / foydalanuvchi", `${s.blocked_posts} / ${s.blocked_users}`, "alert")}
    </div>
    <div class="grid c2 mb">
      <div class="card"><h3>Kunlik yangi e'lonlar (oxirgi 14 kun)</h3>${barChart(days, "posts", "green")}</div>
      <div class="card"><h3>Hayvon turlari</h3>
        <div class="split" style="background:var(--dog)"><i style="width:${catPct}%"></i></div>
        <div class="legend"><span><i style="background:var(--cat)"></i>🐱 Mushuk: <b>${s.cat_posts}</b></span><span><i style="background:var(--dog)"></i>🐶 It: <b>${s.dog_posts}</b></span></div>
        <p class="muted small mt" style="margin-bottom:0">Faol e'lonlar: ${s.active_posts}. Bugungi yangi foydalanuvchilar: ${s.new_users_today}. Faol foydalanuvchi: oxirgi kunlarda e'lon, layk yoki izoh qoldirgan.</p>
      </div>
    </div>
    <div class="card"><div class="row between"><h3 style="margin:0">So'nggi faollik</h3><button class="btn secondary sm" id="toFeed">Hammasi</button></div><div id="feed" class="mt">${feedHtml(events, users)}</div></div>`;
  bindFeed(el.querySelector("#feed"), users);
  el.querySelector("#toFeed").onclick = () => ctx.navigate("activity");
};

// ---------- E'lonlar ----------
sections.posts = async (el) => {
  const users = await loadUsers();
  el.innerHTML = `<h2>E'lonlar</h2>
    <p class="muted">Barcha e'lon qilingan hayvon e'lonlari. Spam yoki nomaqbul e'lonni bloklang (foydalanuvchilarga ko'rinmaydi) yoki butunlay o'chiring.</p>
    <div class="filters">
      <label class="field grow"><span>Qidirish (sarlavha, muallif yoki manzil)</span><input type="search" id="fq" placeholder="Sarlavha, ism, email yoki manzil"></label>
      <label class="field"><span>Holat</span><select id="fs"><option value="">Hammasi</option><option value="active">Faol</option><option value="blocked">Bloklangan</option></select></label>
      <label class="field"><span>Hayvon</span><select id="fa"><option value="">Hammasi</option><option value="cat">🐱 Mushuk</option><option value="dog">🐶 It</option></select></label>
    </div>
    <div class="post-grid" id="grid"></div>
    <div id="empty" class="empty hidden">E'lon topilmadi</div>
    <p class="center mt"><button class="btn secondary hidden" id="more">Yana yuklash</button></p>`;
  const grid = el.querySelector("#grid"), more = el.querySelector("#more"), empty = el.querySelector("#empty");
  const posts = new Map();

  const load = (from, to) => {
    let q = sb.from("posts").select(POST_COLS).order("created_at", { ascending: false }).range(from, to);
    const s = el.querySelector("#fs").value, a = el.querySelector("#fa").value, t = cleanFilter(el.querySelector("#fq").value).toLowerCase();
    if (s) q = q.eq("status", s);
    if (a) q = q.eq("animal_type", a);
    if (t) {
      const ids = users.list.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(t)).map((u) => u.user_id);
      q = q.or([`address.ilike.*${t}*`, `title.ilike.*${t}*`, ids.length ? `user_id.in.(${ids.join(",")})` : null].filter(Boolean).join(","));
    }
    return q.then(({ data, error }) => { if (error) throw error; return data; });
  };
  const render = (rows, append) => {
    rows.forEach((p) => posts.set(p.id, p));
    const html = rows.map((p) => postCardHtml(p, users)).join("");
    if (append) grid.insertAdjacentHTML("beforeend", html); else grid.innerHTML = html;
    empty.classList.toggle("hidden", grid.children.length > 0);
    bindZoom(grid);
  };
  const pager = paginate(grid, more, load, render);

  grid.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    b.disabled = true;
    try { await postAction(b.dataset.act, posts.get(b.closest(".pcard").dataset.id), users, () => pager.reset()); }
    catch (err) { toast(err.message || String(err), "err"); }
    finally { b.disabled = false; }
  });
  for (const id of ["fs", "fa"]) el.querySelector("#" + id).onchange = () => pager.reset();
  el.querySelector("#fq").oninput = debounce(() => pager.reset());
  await pager.reset();
};

// ---------- Foydalanuvchilar ----------
sections.users = async (el) => {
  const { list } = await loadUsers();
  el.innerHTML = `<h2>Foydalanuvchilar</h2>
    <p class="muted">Google orqali ro'yxatdan o'tganlar. Bloklangan foydalanuvchi e'lon, layk va izoh qoldira olmaydi. O'chirilsa, uning barcha e'lonlari, rasmlari, layk va izohlari ham o'chadi.</p>
    <div class="filters">
      <label class="field grow"><span>Qidirish</span><input type="search" id="uq" placeholder="Ism, email, shahar"></label>
      <label class="field"><span>Holat</span><select id="us"><option value="">Hammasi</option><option value="active">Faol</option><option value="blocked">Bloklangan</option></select></label>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Foydalanuvchi</th><th>Telefon / shahar</th><th>Ro'yxatdan o'tgan</th><th>Faollik</th><th>Holat</th><th></th></tr></thead><tbody id="ub"></tbody></table></div>
    <p class="muted small mt" id="ucount"></p>`;
  const body = el.querySelector("#ub");
  const draw = () => {
    const t = el.querySelector("#uq").value.trim().toLowerCase(), s = el.querySelector("#us").value;
    const rows = list.filter((u) => (!t || `${u.full_name} ${u.email} ${u.city || ""} ${u.phone || ""}`.toLowerCase().includes(t))
      && (!s || (s === "blocked") === u.blocked));
    body.innerHTML = rows.map((u) => `<tr data-id="${esc(u.user_id)}">
      <td>${personHtml(u)}</td>
      <td>${esc(u.phone || "—")}<br><span class="muted small">${esc(u.city || "")}</span></td>
      <td>${fmtDate(u.created_at)}</td>
      <td class="small">🖼 ${u.posts_count} · 💬 ${u.comments_count} · ❤️ ${u.likes_count}</td>
      <td>${u.is_admin ? '<span class="badge info">Admin</span>' : u.blocked ? '<span class="badge bad">Bloklangan</span>' : '<span class="badge ok">Faol</span>'}</td>
      <td class="right">${u.is_admin || u.user_id === user.id ? "" : `<button class="btn ${u.blocked ? "ok" : "warn"} sm" data-act="${u.blocked ? "unblock" : "block"}">${u.blocked ? "Blokdan chiqarish" : "Bloklash"}</button> <button class="btn bad sm" data-act="delete">O'chirish</button>`}</td></tr>`).join("")
      || '<tr><td colspan="6" class="center muted">Foydalanuvchi topilmadi</td></tr>';
    el.querySelector("#ucount").textContent = `Jami: ${rows.length} / ${list.length}`;
  };
  draw();
  el.querySelector("#uq").oninput = debounce(draw, 200);
  el.querySelector("#us").onchange = draw;

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const u = list.find((x) => x.user_id === b.closest("tr").dataset.id), act = b.dataset.act;
    b.disabled = true;
    try {
      if (act === "block" || act === "unblock") {
        const on = act === "block";
        if (!(await confirmModal(on ? "Bloklash" : "Blokdan chiqarish", on ? `${u.full_name || u.email} e'lon, layk va izoh qoldira olmaydi, joriy sessiyalari bekor qilinadi.` : `${u.full_name || u.email} yana ilovadan foydalana oladi.`, on ? "Bloklash" : "Blokdan chiqarish", on ? "bad" : "ok"))) return;
        const { error } = await sb.rpc("admin_set_user_blocked", { p_user: u.user_id, p_blocked: on });
        if (error) throw error;
        u.blocked = on; toast(on ? "Bloklandi" : "Blokdan chiqarildi", "ok"); draw();
      } else if (act === "delete") {
        if (!(await confirmModal("Foydalanuvchini o'chirish", `${u.full_name || u.email} va uning ${u.posts_count} ta e'loni, layk va izohlari butunlay o'chiriladi. Qaytarib bo'lmaydi.`, "O'chirish"))) return;
        const { data: ps, error: pe } = await sb.from("posts").select("image_url").eq("user_id", u.user_id);
        if (pe) throw pe;
        await removePhotos(ps.map((p) => p.image_url));
        const { error } = await sb.rpc("admin_delete_user", { p_user: u.user_id });
        if (error) throw error;
        list.splice(list.indexOf(u), 1); toast("Foydalanuvchi o'chirildi", "ok"); draw();
      }
    } catch (err) { toast(err.message || String(err), "err"); }
    finally { b.disabled = false; }
  });
};

// ---------- Izohlar moderatsiyasi ----------
sections.comments = async (el) => {
  const users = await loadUsers();
  el.innerHTML = `<h2>Izohlar</h2>
    <p class="muted">Eng yangi izohlar. Nomaqbul izohni o'chiring.</p>
    <div class="filters"><label class="field grow"><span>Qidirish (matn yoki muallif)</span><input type="search" id="cq" placeholder="Matn, ism yoki email"></label></div>
    <div class="table-wrap"><table><thead><tr><th>E'lon</th><th>Muallif</th><th>Izoh</th><th>Sana</th><th></th></tr></thead><tbody id="cb"></tbody></table></div>
    <div id="empty" class="empty hidden mt">Izoh topilmadi</div>
    <p class="center mt"><button class="btn secondary hidden" id="more">Yana yuklash</button></p>`;
  const body = el.querySelector("#cb"), more = el.querySelector("#more"), empty = el.querySelector("#empty");
  const load = (from, to) => {
    let q = sb.from("comments").select("id, post_id, user_id, text, created_at, posts(image_url, animal_type)").order("created_at", { ascending: false }).range(from, to);
    const t = cleanFilter(el.querySelector("#cq").value).toLowerCase();
    if (t) {
      const ids = users.list.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(t)).map((u) => u.user_id);
      q = q.or([`text.ilike.*${t}*`, ids.length ? `user_id.in.(${ids.join(",")})` : null].filter(Boolean).join(","));
    }
    return q.then(({ data, error }) => { if (error) throw error; return data; });
  };
  const render = (rows, append) => {
    const html = rows.map((c) => `<tr data-id="${esc(c.id)}"><td>${thumbHtml(c.posts?.image_url, ANIMAL[c.posts?.animal_type]?.label)}</td><td>${personHtml(users.byId.get(c.user_id))}</td>
      <td><div class="txt">${esc(c.text)}</div></td><td>${fmtDateTime(c.created_at)}</td><td class="right"><button class="btn bad sm" data-act="delete">O'chirish</button></td></tr>`).join("");
    if (append) body.insertAdjacentHTML("beforeend", html); else body.innerHTML = html;
    empty.classList.toggle("hidden", body.children.length > 0);
    bindZoom(body);
  };
  const pager = paginate(body, more, load, render, 30);
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (!(await confirmModal("Izohni o'chirish", "Izoh butunlay o'chiriladi.", "O'chirish"))) return;
    b.disabled = true;
    const { error } = await sb.from("comments").delete().eq("id", b.closest("tr").dataset.id);
    if (error) { toast(error.message, "err"); b.disabled = false; return; }
    toast("Izoh o'chirildi", "ok"); b.closest("tr").remove();
    empty.classList.toggle("hidden", body.children.length > 0);
  });
  el.querySelector("#cq").oninput = debounce(() => pager.reset());
  await pager.reset();
};

// ---------- Layklar moderatsiyasi ----------
sections.likes = async (el) => {
  const users = await loadUsers();
  el.innerHTML = `<h2>Layklar</h2>
    <p class="muted">Eng yangi layklar. Soxta (bot) layklarni bittadan yoki foydalanuvchi bo'yicha hammasini olib tashlash mumkin.</p>
    <div class="filters"><label class="field grow"><span>Foydalanuvchi bo'yicha</span><input type="search" id="lq" placeholder="Ism yoki email"></label></div>
    <div class="table-wrap"><table><thead><tr><th>E'lon</th><th>Kim layk qo'ygan</th><th>Sana</th><th></th></tr></thead><tbody id="lb"></tbody></table></div>
    <div id="empty" class="empty hidden mt">Layk topilmadi</div>
    <p class="center mt"><button class="btn secondary hidden" id="more">Yana yuklash</button></p>`;
  const body = el.querySelector("#lb"), more = el.querySelector("#more"), empty = el.querySelector("#empty");
  const matchIds = () => {
    const t = cleanFilter(el.querySelector("#lq").value).toLowerCase();
    return t ? users.list.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(t)).map((u) => u.user_id) : null;
  };
  const load = (from, to) => {
    let q = sb.from("likes").select("id, post_id, user_id, created_at, posts(image_url, animal_type)").order("created_at", { ascending: false }).range(from, to);
    const ids = matchIds();
    if (ids) q = q.in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    return q.then(({ data, error }) => { if (error) throw error; return data; });
  };
  const render = (rows, append) => {
    const html = rows.map((l) => `<tr data-id="${esc(l.id)}" data-user="${esc(l.user_id)}"><td>${thumbHtml(l.posts?.image_url, ANIMAL[l.posts?.animal_type]?.label)}</td><td>${personHtml(users.byId.get(l.user_id))}</td>
      <td>${fmtDateTime(l.created_at)}</td><td class="right"><button class="btn bad sm" data-act="one">Olib tashlash</button> <button class="btn secondary sm" data-act="all">Hammasini olib tashlash</button></td></tr>`).join("");
    if (append) body.insertAdjacentHTML("beforeend", html); else body.innerHTML = html;
    empty.classList.toggle("hidden", body.children.length > 0);
    bindZoom(body);
  };
  const pager = paginate(body, more, load, render, 30);
  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const tr = b.closest("tr"), uid = tr.dataset.user, u = users.byId.get(uid);
    const all = b.dataset.act === "all";
    if (!(await confirmModal(all ? "Hamma layklarni olib tashlash" : "Laykni olib tashlash", all ? `${u?.full_name || "Foydalanuvchi"} qo'ygan BARCHA layklar o'chiriladi.` : "Layk o'chiriladi.", "Olib tashlash"))) return;
    b.disabled = true;
    const { error } = all ? await sb.from("likes").delete().eq("user_id", uid) : await sb.from("likes").delete().eq("id", tr.dataset.id);
    if (error) { toast(error.message, "err"); b.disabled = false; return; }
    toast("Bajarildi", "ok"); await pager.reset();
  });
  el.querySelector("#lq").oninput = debounce(() => pager.reset());
  await pager.reset();
};

// ---------- Xarita: barcha e'lonlar rasmli pinlar bilan ----------
function pinIcon(p, selected) {
  // DOM yaratamiz (HTML satri emas): foydalanuvchi ma'lumotlari hech qachon HTML sifatida talqin qilinmaydi.
  const wrap = document.createElement("div");
  wrap.className = `photo-pin ${p.animal_type}${p.status === "blocked" ? " blocked" : ""}${selected ? " sel" : ""}`;
  const img = document.createElement("img");
  img.alt = "";
  const full = safeImg(p.image_url);
  img.src = full ? full.replace(/\.jpg$/, "_t.jpg") : "";
  img.onerror = () => { img.onerror = null; if (full) img.src = full; };   // kichik rasm yo'q (eski e'lon): to'liq rasm
  wrap.appendChild(img);
  return window.L.divIcon({ className: "pin-wrap", html: wrap, iconSize: [42, 50], iconAnchor: [21, 48] });
}
sections.map = async (el) => {
  const L = window.L;
  if (!L) throw new Error("Xarita kutubxonasi (vendor/leaflet) yuklanmadi");
  const users = await loadUsers();
  el.innerHTML = `<h2>Xarita</h2>
    <p class="muted">Barcha e'lonlar joylashuvi bo'yicha. Pinni bosing: e'lon kartasi o'ngda chiqadi (bloklash/o'chirish shu yerdan ham mumkin).</p>
    <div class="filters">
      <label class="field"><span>Hayvon</span><select id="ma"><option value="">Hammasi</option><option value="cat">🐱 Mushuk</option><option value="dog">🐶 It</option></select></label>
      <label class="field"><span>Holat</span><select id="ms"><option value="">Hammasi</option><option value="active">Faol</option><option value="blocked">Bloklangan</option></select></label>
      <span class="muted small" id="mcount"></span>
    </div>
    <div class="map-split"><div id="amap" class="admin-map"></div><div id="msel" class="map-side"><div class="hint-box">Pinni bosing</div></div></div>`;
  const box = el.querySelector("#amap"), side = el.querySelector("#msel");
  let all = [], map = null, layer = null, selected = null, fitted = false;
  const posts = new Map();

  const filtered = () => {
    const a = el.querySelector("#ma").value, s = el.querySelector("#ms").value;
    return all.filter((p) => (!a || p.animal_type === a) && (!s || p.status === s));
  };
  const draw = () => {
    if (!map) return;
    layer.clearLayers();
    const list = filtered();
    for (const p of list) L.marker([p.latitude, p.longitude], { icon: pinIcon(p, p.id === selected), zIndexOffset: p.id === selected ? 1000 : 0 }).on("click", () => select(p.id)).addTo(layer);
    el.querySelector("#mcount").textContent = `${list.length} ta e'lon`;
    if (!fitted && list.length) { fitted = true; map.fitBounds(L.latLngBounds(list.map((p) => [p.latitude, p.longitude])), { padding: [40, 40], maxZoom: 14, animate: false }); }
  };
  const select = (id) => {
    selected = id;
    const p = posts.get(id);
    side.innerHTML = p ? postCardHtml(p, users) : '<div class="hint-box">Pinni bosing</div>';
    bindZoom(side); draw();
  };
  const reload = async () => {
    const { data, error } = await sb.from("posts").select(POST_COLS).order("created_at", { ascending: false }).limit(500);
    if (error) { toast(error.message, "err"); return; }
    all = data; posts.clear(); all.forEach((p) => posts.set(p.id, p));
    if (selected && !posts.has(selected)) selected = null;
    select(selected);
  };
  side.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    b.disabled = true;
    try { await postAction(b.dataset.act, posts.get(selected), users, reload); }
    catch (err) { toast(err.message || String(err), "err"); }
    finally { b.disabled = false; }
  });
  for (const id of ["ma", "ms"]) el.querySelector("#" + id).onchange = draw;

  // Xarita konteyner DOM'ga ulangach (o'lchami bor) yaratiladi: bo'lim tayyor bo'lgach qobiq uni sahifaga qo'yadi.
  let tries = 0;
  const init = () => {
    if (!box.isConnected) { if (tries++ < 300) requestAnimationFrame(init); return; }   // boshqa bo'limga o'tilgan bo'lsa ham to'xtaydi
    map = L.map(box).setView([41.3111, 69.2797], 11);
    // OSM plitka siyosati Referer talab qiladi: sahifa no-referrer bo'lsa ham plitkalarga origin yuboriladi
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap", referrerPolicy: "origin" }).addTo(map);
    layer = L.layerGroup().addTo(map);
    new ResizeObserver(() => map.invalidateSize()).observe(box);
    draw();
  };
  requestAnimationFrame(init);
  await reload();
};

// ---------- Xabarlar: faollik lentasi ----------
sections.activity = async (el, c) => {
  const users = await loadUsers();
  const events = await fetchActivity(users, 60);
  el.innerHTML = `<h2>Xabarlar</h2>
    <p class="muted">So'nggi 7 kundagi yangi e'lonlar, izohlar, layklar va ro'yxatdan o'tganlar. Bosing: e'lon ochiladi (izoh/laykni o'chirish mumkin).</p>
    <div class="card" id="feed">${feedHtml(events, users)}</div>`;
  bindFeed(el.querySelector("#feed"), users);
  lsSet("mi_admin_seen", new Date().toISOString());
  c.setBadge("activity", 0, "red");
};

// ---------- Statistika ----------
sections.stats = async (el) => {
  const [{ data: s, error }, users, top] = await Promise.all([
    sb.rpc("admin_stats"), loadUsers(),
    sb.from("posts").select("id, title, animal_type, image_url, user_id, likes(count), comments(count)").order("created_at", { ascending: false }).limit(200),
  ]);
  if (error) throw error;
  if (top.error) throw top.error;
  const days = s.daily || [];
  const sum = (k) => days.reduce((a, d) => a + d[k], 0);
  const topPosts = top.data.map((p) => ({ ...p, n: p.likes?.[0]?.count ?? 0, c: p.comments?.[0]?.count ?? 0 })).sort((a, b) => b.n + b.c - (a.n + a.c)).slice(0, 5);
  const topUsers = [...users.list].sort((a, b) => (b.posts_count * 3 + b.comments_count + b.likes_count) - (a.posts_count * 3 + a.comments_count + a.likes_count)).slice(0, 5);
  el.innerHTML = `<h2>Statistika</h2>
    <p class="muted">Oxirgi 14 kun (Toshkent vaqti bilan).</p>
    <div class="grid two mb">
      <div class="card"><h3>Yangi e'lonlar <span class="muted small">jami ${sum("posts")}</span></h3>${barChart(days, "posts", "green", true)}</div>
      <div class="card"><h3>Yangi foydalanuvchilar <span class="muted small">jami ${sum("users")}</span></h3>${barChart(days, "users", "blue", true)}</div>
      <div class="card"><h3>Layklar <span class="muted small">jami ${sum("likes")}</span></h3>${barChart(days, "likes", "pink", true)}</div>
      <div class="card"><h3>Izohlar <span class="muted small">jami ${sum("comments")}</span></h3>${barChart(days, "comments", "orange", true)}</div>
    </div>
    <div class="grid c2">
      <div class="card"><h3>Eng faol e'lonlar</h3>${topPosts.length ? topPosts.map((p, i) => `<div class="rank"><span class="n">${i + 1}</span>${thumbHtml(p.image_url, p.title || "")}<div class="grow"><b>${esc(p.title || ANIMAL[p.animal_type]?.label || "E'lon")}</b><span class="muted small">${esc(users.byId.get(p.user_id)?.full_name || "")}</span></div><span class="small">❤️ ${p.n} · 💬 ${p.c}</span></div>`).join("") : '<div class="muted">Ma\'lumot yo\'q</div>'}</div>
      <div class="card"><h3>Eng faol foydalanuvchilar</h3>${topUsers.length ? topUsers.map((u, i) => `<div class="rank"><span class="n">${i + 1}</span><div class="grow">${personHtml(u)}</div><span class="small">🖼 ${u.posts_count} · 💬 ${u.comments_count} · ❤️ ${u.likes_count}</span></div>`).join("") : '<div class="muted">Ma\'lumot yo\'q</div>'}</div>
    </div>`;
  bindZoom(el);
};

// ---------- Sozlamalar ----------
sections.settings = async (el) => {
  const { list } = await loadUsers();
  const admins = list.filter((u) => u.is_admin);
  el.innerHTML = `<h2>Sozlamalar</h2>
    <div class="grid c2">
      <div class="card"><h3>Hisobingiz</h3>
        <dl class="kv"><dt>Ism</dt><dd>${esc(profile.full_name)}</dd><dt>Email</dt><dd>${esc(profile.email)}</dd><dt>Rol</dt><dd>Administrator</dd></dl>
        <button class="btn bad sm mt" id="so">Chiqish</button></div>
      <div class="card"><h3>Ulangan loyiha</h3>
        <dl class="kv"><dt>Supabase</dt><dd>${esc(SUPABASE_URL)}</dd><dt>Bucket</dt><dd>animal-photos</dd></dl>
        <p class="muted small" style="margin-bottom:0">URL va kalit <code>js/config.js</code> da. <code>service_role</code> kalitini bu yerga hech qachon yozmang.</p></div>
    </div>
    <div class="card mt"><h3>Adminlar (${admins.length})</h3>
      ${admins.map((u) => `<div class="rank"><div class="grow">${personHtml(u)}</div></div>`).join("") || '<div class="muted">Admin topilmadi</div>'}
      <p class="muted small mt">Yangi admin qo'shish: u avval Google bilan ilova yoki panelga bir marta kirishi kerak, so'ng Supabase SQL Editor'da:</p>
      <pre class="sql">insert into public.admins (user_id)
select id from auth.users where email = 'yangi.admin@gmail.com';</pre>
      <p class="muted small" style="margin-bottom:0">Adminni olib tashlash: <code>delete from public.admins where user_id = '...';</code></p></div>`;
  el.querySelector("#so").onclick = () => sb.auth.signOut().then(() => location.replace("login.html"));
};

const ctx = initShell({
  title: "Mushuk va Itlarni Top", subtitle: "Administrator paneli", profile,
  menu: [
    { id: "dashboard", icon: icon("home"), label: "Bosh sahifa" }, { id: "posts", icon: icon("image"), label: "E'lonlar" },
    { id: "users", icon: icon("users"), label: "Foydalanuvchilar" }, { id: "comments", icon: icon("comment"), label: "Izohlar" },
    { id: "likes", icon: icon("heart"), label: "Layklar" }, { id: "map", icon: icon("map"), label: "Xarita" },
    { id: "activity", icon: icon("mail"), label: "Xabarlar" }, { id: "stats", icon: icon("chart"), label: "Statistika" },
    { id: "settings", icon: icon("settings"), label: "Sozlamalar" },
  ],
  sections,
});

// Yon menyudagi nishonlar: jami e'lon/foydalanuvchi, ko'rilmagan faollik (qizil).
(async () => {
  try {
    const [{ data: s }, users] = await Promise.all([sb.rpc("admin_stats"), loadUsers()]);
    if (s) { ctx.setBadge("posts", s.total_posts); ctx.setBadge("users", s.total_users); }
    const seen = lsGet("mi_admin_seen") || new Date(Date.now() - 86400000).toISOString();
    const unseen = (await fetchActivity(users, 99)).filter((e) => e.at > seen && e.user_id !== user.id).length;
    if (!/activity/.test(location.hash)) ctx.setBadge("activity", unseen, "red");
  } catch { /* nishonlar ixtiyoriy */ }
})();
