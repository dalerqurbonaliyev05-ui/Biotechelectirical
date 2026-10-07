// Parol xeshlash (scrypt) va JWT (HS256): faqat node:crypto, tashqi kutubxonasiz.
import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64, "base64"), expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

let dummy;
// Mavjud bo'lmagan login uchun ham xuddi shuncha vaqt sarflanadi (login'larni terib chiqishga qarshi).
export async function burnPasswordTime(password) {
  dummy ||= await hashPassword("dummy-password-for-timing");
  await verifyPassword(password, dummy);
}

const b64 = (x) => Buffer.from(x).toString("base64url");
const sign = (data, secret) => crypto.createHmac("sha256", secret).update(data).digest("base64url");

export function signJwt(payload, secret) {
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify(payload));
  return `${head}.${body}.${sign(`${head}.${body}`, secret)}`;
}

export function verifyJwt(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let head, body;
  try {
    head = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    body = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch { return null; }
  if (head.alg !== "HS256") return null; // "none" va boshqa algoritmlar rad etiladi
  const want = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret)), got = Buffer.from(parts[2]);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  if (typeof body.exp !== "number" || body.exp <= now) return null;
  return body;
}

export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
