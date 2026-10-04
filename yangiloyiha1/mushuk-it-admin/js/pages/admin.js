// admin_panel.html sahifasi mantig'i (alohida fayl: CSP inline skriptga ruxsat bermaydi).
import {
  sb, requireAdmin, initShell, esc, fmtDate, fmtDateTime, toast, confirmModal, promptModal, openModal, showImage,
  mapsUrl, coords, animalBadge, postStatusBadge, safeImg, removePhotos, debounce, cleanFilter, ANIMAL,
} from "../app.js";

const { user, profile } = await requireAdmin();
const PAGE = 24;
const sections = {};

// ---------- Umumiy yordamchilar ----------
const stat = (ico, n, label, bg) => `<div class="card stat"><div class="ico" style="background:${bg}">${ico}</div><div><b>${n}</b><span>${label}</span></div></div>`;
const initialOf = (name) => esc((name || "?").trim().charAt(0).toUpperCase());

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

// ---------- Bosh sahifa: statistika ----------
sections.dashboard = async (el) => {
  const { data: s, error } = await sb.rpc("admin_stats");
  if (error) throw error;
  const days = s.daily || [];
  const max = Math.max(1, ...days.map((d) => d.posts));
  const bars = days.map((d) => {
    const [, m, dd] = d.day.split("-");
    return `<div class="bar" title="${esc(fmtDate(d.day))}: ${d.posts} ta post, ${d.users} ta yangi foydalanuvchi"><b>${d.posts || ""}</b><i style="height:${Math.round((d.posts / max) * 100)}%"></i><span>${dd}.${m}</span></div>`;
  }).join("");
  const catPct = s.total_posts ? Math.round((s.cat_posts / s.total_posts) * 100) : 0;
  el.innerHTML = `<h2>Bosh sahifa</h2>
    <div class="grid c4 mb">
      ${stat("🖼", s.total_posts, "Jami postlar", "var(--accent-soft)")}
      ${stat("🆕", s.new_posts_today, "Bugungi yangi postlar", "var(--ok-soft)")}
      ${stat("🔥", s.active_users_7d, "Faol foydalanuvchilar (7 kun)", "var(--warn-soft)")}
      ${stat("👥", s.total_users, "Jami foydalanuvchilar", "var(--accent-soft)")}
    </div>
    <div class="grid c4 mb">
      ${stat("📆", s.active_users_30d, "Faol foydalanuvchilar (30 kun)", "var(--ok-soft)")}
      ${stat("❤️", s.total_likes, "Jami layklar", "var(--bad-soft)")}
      ${stat("💬", s.total_comments, "Jami izohlar", "var(--accent-soft)")}
      ${stat("🚫", `${s.blocked_posts} / ${s.blocked_users}`, "Bloklangan post / foydalanuvchi", "var(--bad-soft)")}
    </div>
    <div class="grid c2">
      <div class="card"><h3>Kunlik yangi postlar (oxirgi 14 kun)</h3><div class="bars">${bars}</div></div>
      <div class="card"><h3>Hayvon turlari</h3>
        <p style="margin:0 0 6px">🐱 Mushuk: <b>${s.cat_posts}</b> &nbsp; 🐶 It: <b>${s.dog_posts}</b></p>
        <div style="height:14px;border-radius:7px;background:var(--warn);overflow:hidden"><div style="height:100%;width:${catPct}%;background:var(--accent)"></div></div>
        <p class="muted small mt" style="margin-bottom:0">Faol postlar: ${s.active_posts}. Bugungi yangi foydalanuvchilar: ${s.new_users_today}. Faol foydalanuvchi: oxirgi kunlarda post, layk yoki izoh qoldirgan.</p>
      </div>
    </div>`;
};

// ---------- Postlar ----------
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

sections.posts = async (el) => {
  const users = await loadUsers();
  el.innerHTML = `<h2>🖼 Postlar</h2>
    <p class="muted">Barcha e'lon qilingan hayvon postlari. Spam yoki nomaqbul postni bloklang (foydalanuvchilarga ko'rinmaydi) yoki butunlay o'chiring.</p>
    <div class="filters">
      <label class="field grow"><span>Qidirish (muallif yoki manzil)</span><input type="search" id="fq" placeholder="Ism, email yoki manzil"></label>
      <label class="field"><span>Holat</span><select id="fs"><option value="">Hammasi</option><option value="active">Faol</option><option value="blocked">Bloklangan</option></select></label>
      <label class="field"><span>Hayvon</span><select id="fa"><option value="">Hammasi</option><option value="cat">🐱 Mushuk</option><option value="dog">🐶 It</option></select></label>
    </div>
    <div class="post-grid" id="grid"></div>
    <div id="empty" class="empty hidden">Post topilmadi</div>
    <p class="center mt"><button class="btn secondary hidden" id="more">Yana yuklash</button></p>`;
  const grid = el.querySelector("#grid"), more = el.querySelector("#more"), empty = el.querySelector("#empty");
  const posts = new Map();

  const load = (from, to) => {
    let q = sb.from("posts").select("id, user_id, animal_type, title, image_url, latitude, longitude, address, caption, status, blocked_reason, created_at, likes(count), comments(count)")
      .order("created_at", { ascending: false }).range(from, to);
    const s = el.querySelector("#fs").value, a = el.querySelector("#fa").value, t = cleanFilter(el.querySelector("#fq").value).toLowerCase();
    if (s) q = q.eq("status", s);
    if (a) q = q.eq("animal_type", a);
    if (t) {
      const ids = users.list.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(t)).map((u) => u.user_id);
      q = q.or([`address.ilike.*${t}*`, ids.length ? `user_id.in.(${ids.join(",")})` : null].filter(Boolean).join(","));
    }
    return q.then(({ data, error }) => { if (error) throw error; return data; });
  };

  const cardHtml = (p) => {
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
  };
  const render = (rows, append) => {
    rows.forEach((p) => posts.set(p.id, p));
    const html = rows.map(cardHtml).join("");
    if (append) grid.insertAdjacentHTML("beforeend", html); else grid.innerHTML = html;
    empty.classList.toggle("hidden", grid.children.length > 0);
    bindZoom(grid);
  };
  const pager = paginate(grid, more, load, render);

  grid.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const card = b.closest(".pcard"), post = posts.get(card.dataset.id), act = b.dataset.act;
    b.disabled = true;
    try {
      if (act === "open") await openPostModal(post, users.byId.get(post.user_id), () => pager.reset());
      else if (act === "block") {
        const reason = await promptModal("Postni bloklash", "Post foydalanuvchilarga ko'rinmaydi (muallifga ko'rinadi). Keyin qayta ochish mumkin.");
        if (reason === null) return;
        await setPostStatus(post, "blocked", reason); toast("Post bloklandi", "ok"); await pager.reset();
      } else if (act === "unblock") { await setPostStatus(post, "active"); toast("Post qayta ochildi", "ok"); await pager.reset(); }
      else if (act === "delete") {
        if (!(await confirmModal("Postni o'chirish", "Post, rasm, layk va izohlar butunlay o'chiriladi. Qaytarib bo'lmaydi.", "O'chirish"))) return;
        await deletePost(post); toast("Post o'chirildi", "ok"); await pager.reset();
      }
    } catch (err) { toast(err.message || String(err), "err"); }
    finally { b.disabled = false; }
  });
  for (const id of ["fs", "fa"]) el.querySelector("#" + id).onchange = () => pager.reset();
  el.querySelector("#fq").oninput = debounce(() => pager.reset());
  await pager.reset();
};

// ---------- Foydalanuvchilar ----------
sections.users = async (el) => {
  const { list } = await loadUsers();
  el.innerHTML = `<h2>👥 Foydalanuvchilar</h2>
    <p class="muted">Google orqali ro'yxatdan o'tganlar. Bloklangan foydalanuvchi post, layk va izoh qoldira olmaydi. O'chirilsa, uning barcha postlari, rasmlari, layk va izohlari ham o'chadi.</p>
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
        if (!(await confirmModal(on ? "Bloklash" : "Blokdan chiqarish", on ? `${u.full_name || u.email} post, layk va izoh qoldira olmaydi, joriy sessiyalari bekor qilinadi.` : `${u.full_name || u.email} yana ilovadan foydalana oladi.`, on ? "Bloklash" : "Blokdan chiqarish", on ? "bad" : "ok"))) return;
        const { error } = await sb.rpc("admin_set_user_blocked", { p_user: u.user_id, p_blocked: on });
        if (error) throw error;
        u.blocked = on; toast(on ? "Bloklandi" : "Blokdan chiqarildi", "ok"); draw();
      } else if (act === "delete") {
        if (!(await confirmModal("Foydalanuvchini o'chirish", `${u.full_name || u.email} va uning ${u.posts_count} ta posti, layk va izohlari butunlay o'chiriladi. Qaytarib bo'lmaydi.`, "O'chirish"))) return;
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
  el.innerHTML = `<h2>💬 Izohlar</h2>
    <p class="muted">Eng yangi izohlar. Nomaqbul izohni o'chiring.</p>
    <div class="filters"><label class="field grow"><span>Qidirish (matn yoki muallif)</span><input type="search" id="cq" placeholder="Matn, ism yoki email"></label></div>
    <div class="table-wrap"><table><thead><tr><th>Post</th><th>Muallif</th><th>Izoh</th><th>Sana</th><th></th></tr></thead><tbody id="cb"></tbody></table></div>
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
  el.innerHTML = `<h2>❤️ Layklar</h2>
    <p class="muted">Eng yangi layklar. Soxta (bot) layklarni bittadan yoki foydalanuvchi bo'yicha hammasini olib tashlash mumkin.</p>
    <div class="filters"><label class="field grow"><span>Foydalanuvchi bo'yicha</span><input type="search" id="lq" placeholder="Ism yoki email"></label></div>
    <div class="table-wrap"><table><thead><tr><th>Post</th><th>Kim layk qo'ygan</th><th>Sana</th><th></th></tr></thead><tbody id="lb"></tbody></table></div>
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

initShell({
  title: "ADMINISTRATOR", subtitle: "Mushuk va It Top", profile,
  menu: [
    { id: "dashboard", icon: "🏠", label: "Bosh sahifa" }, { id: "posts", icon: "🖼", label: "Postlar" },
    { id: "users", icon: "👥", label: "Foydalanuvchilar" }, { id: "comments", icon: "💬", label: "Izohlar" },
    { id: "likes", icon: "❤️", label: "Layklar" },
  ],
  sections,
});
