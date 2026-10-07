// Rasm fayllari: serverning o'z diskida (DATA_DIR/photos). Kirish nazorati ma'lumotlar bazasidagi `photos` jadvali
// va RLS orqali: talaba faqat o'z papkasiga yuklaydi, faqat ruxsat etilgan qatorlar uchun havola beriladi.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { HttpError } from "./errors.js";

const PATH_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(\d{4}-\d{2}-\d{2})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/;
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function detectImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

export function createStorage({ db, config }) {
  const root = path.join(config.dataDir, "photos");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });

  const parse = (p) => {
    const m = PATH_RE.exec(String(p || ""));
    if (!m) throw new HttpError(400, "Fayl yo'li noto'g'ri");
    return { studentId: m[1], date: m[2], ext: m[4], full: path.join(root, p) };
  };
  const sig = (p, exp) => crypto.createHmac("sha256", config.jwtSecret).update(`file|${p}|${exp}`).digest("base64url");

  async function currentStudentId(claims) {
    return db.asUser(claims, async (c) => (await c.query("select public.current_student_id() as id")).rows[0].id);
  }

  async function upload(claims, relPath, body) {
    const { studentId, ext, full } = parse(relPath);
    if ((await currentStudentId(claims)) !== studentId) throw new HttpError(403, "Faqat o'z papkangizga yuklay olasiz");
    if (!body.length) throw new HttpError(400, "Fayl bo'sh");
    if (body.length > config.maxPhotoBytes) throw new HttpError(413, `Fayl juda katta (ko'pi bilan ${Math.round(config.maxPhotoBytes / 1048576)} MB)`);
    const type = detectImageType(body);
    if (!type) throw new HttpError(415, "Faqat JPEG, PNG yoki WebP rasm");
    if (type !== ext) throw new HttpError(415, "Fayl turi kengaytmaga mos emas");
    fs.mkdirSync(path.dirname(full), { recursive: true, mode: 0o700 });
    if (fs.existsSync(full)) throw new HttpError(409, "Bunday fayl bor");
    const tmp = `${full}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(tmp, body, { mode: 0o600 });
    fs.renameSync(tmp, full);
    return { path: relPath };
  }

  // Faqat RLS ruxsat bergan (talaba - o'zining, xodim - hammasi) `photos` qatorlari uchun imzolangan havola.
  async function sign(claims, paths, ttlSec = 3600) {
    if (!Array.isArray(paths) || paths.length > 500) throw new HttpError(400, "Yo'llar ro'yxati noto'g'ri");
    const valid = paths.filter((p) => PATH_RE.test(String(p)));
    const allowed = valid.length ? new Set(await db.asUser(claims, async (c) => (await c.query("select storage_path from public.photos where storage_path = any($1)", [valid])).rows.map((r) => r.storage_path))) : new Set();
    const exp = Math.floor(Date.now() / 1000) + Math.max(60, Math.min(Number(ttlSec) || 3600, 86400));
    return paths.map((p) => allowed.has(p)
      ? { path: p, signedUrl: `/api/storage/file?p=${encodeURIComponent(p)}&e=${exp}&s=${sig(p, exp)}`, error: null }
      : { path: p, signedUrl: null, error: "Ruxsat yo'q yoki fayl topilmadi" });
  }

  async function remove(claims, profile, relPath) {
    const { studentId, full } = parse(relPath);
    const mine = (await currentStudentId(claims)) === studentId;
    if (!mine && profile.role !== "admin") throw new HttpError(403, "Bu faylni o'chirish uchun ruxsat yo'q");
    try { fs.unlinkSync(full); } catch (e) { if (e.code !== "ENOENT") throw e; }
    return { ok: true };
  }

  function serve(query, res) {
    const p = query.get("p"), exp = Number(query.get("e")), s = query.get("s") || "";
    const { ext, full } = parse(p);
    const want = Buffer.from(sig(p, exp)), got = Buffer.from(s);
    if (!Number.isFinite(exp) || exp < Date.now() / 1000 || want.length !== got.length || !crypto.timingSafeEqual(want, got)) throw new HttpError(403, "Havola yaroqsiz yoki muddati o'tgan");
    let stat;
    try { stat = fs.statSync(full); } catch { throw new HttpError(404, "Fayl topilmadi"); }
    res.writeHead(200, { "Content-Type": MIME[ext], "Content-Length": stat.size, "Cache-Control": "private, max-age=300", "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff" });
    fs.createReadStream(full).pipe(res);
  }

  return { upload, sign, remove, serve };
}
