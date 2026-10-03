// Talabani faollashtiradi: HEMIS ID + bir martalik kod + o'zi tanlagan parol -> tizim hisobi.
//
// Chaqiruvchi hali tizimga kirmagan, shuning uchun funksiya JWT talab qilmaydi (verify_jwt = false);
// shaxsni tasdiqlash vositasi - o'quv bo'limi bergan kod (import-students yaratadi).
//
// So'rov:  POST { hemis_id, code, password }
// Javob:   { ok: true, login }  -> keyin brauzer signInWithPassword(login@students.res.invalid, parol) qiladi.
//
// Himoya:
//  - noma'lum ID, noto'g'ri kod va faol bo'lmagan talaba uchun BIR XIL javob (ID'larni terib chiqib bo'lmasin);
//  - noto'g'ri urinishlar bump_code_attempt orqali ATOMAR hisoblanadi, MAX_CODE_ATTEMPTS dan keyin kod bloklanadi;
//  - kod avval "band qilinadi" (used_at), shundan keyin hisob yaratiladi: parallel so'rovlar ikki hisob ocholmaydi;
//  - hisob yaratish yarim yo'lda to'xtasa hammasi ortga qaytariladi va kod yana ishlaydi.
import { adminClient, corsHeaders, json, readJson } from "../_shared/server.ts";
import {
  codeUsable,
  hashCode,
  MAX_CODE_ATTEMPTS,
  normalizeCode,
  normalizeHemisId,
  passwordError,
  studentEmail,
  timingSafeEqual,
} from "../_shared/logic.ts";

const BAD_CREDENTIALS = "HEMIS ID yoki faollashtirish kodi noto'g'ri";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Faqat POST" }, 405);

  const body = await readJson(req);
  const hemisId = normalizeHemisId(body?.hemis_id);
  const code = normalizeCode(body?.code);
  if (!hemisId || code.length !== 8) return json({ error: BAD_CREDENTIALS }, 400);
  // Parolni urinish hisoblanmasidan OLDIN tekshiramiz: parol xatosi kodni "yoqib" yubormasin.
  const pwErr = passwordError(body?.password);
  if (pwErr) return json({ error: pwErr }, 400);
  const password = body!.password as string;

  const admin = adminClient();

  const { data: st, error: stErr } = await admin.from("students")
    .select("id, full_name, profile_id, active").eq("hemis_id", hemisId).maybeSingle();
  if (stErr) return json({ error: "Server xatosi" }, 500);
  if (!st || !st.active) return json({ error: BAD_CREDENTIALS }, 400);
  if (st.profile_id) return json({ error: "Hisob allaqachon faollashtirilgan. Tizimga kiring" }, 409);

  const { data: row, error: rowErr } = await admin.from("activation_codes")
    .select("code_hash, expires_at, used_at").eq("student_id", st.id).maybeSingle();
  if (rowErr) return json({ error: "Server xatosi" }, 500);
  if (!codeUsable(row)) {
    return json({ error: "Faollashtirish kodi yo'q yoki muddati o'tgan. O'qituvchidan yangi kod so'rang" }, 400);
  }

  // Urinishni AVVAL hisoblaymiz (parallel so'rovlar bilan aylanib o'tib bo'lmasin).
  const { data: attempts, error: bumpErr } = await admin.rpc("bump_code_attempt", { p_student: st.id });
  if (bumpErr) return json({ error: "Server xatosi" }, 500);
  if (attempts === null) return json({ error: "Kod allaqachon ishlatilgan" }, 409);
  if (attempts > MAX_CODE_ATTEMPTS) {
    return json({ error: "Urinishlar soni tugadi. O'qituvchidan yangi kod so'rang" }, 429);
  }

  const given = await hashCode(code, hemisId, Deno.env.get("ACTIVATION_PEPPER") ?? "");
  if (!timingSafeEqual(given, row!.code_hash)) {
    return json({ error: BAD_CREDENTIALS, attempts_left: MAX_CODE_ATTEMPTS - attempts }, 400);
  }

  // Kodni band qilamiz: faqat bitta so'rov muvaffaqiyatli bo'ladi.
  const { data: claimed, error: claimErr } = await admin.from("activation_codes")
    .update({ used_at: new Date().toISOString() }).eq("student_id", st.id).is("used_at", null).select("student_id");
  if (claimErr) return json({ error: "Server xatosi" }, 500);
  if (!claimed || claimed.length === 0) return json({ error: "Kod allaqachon ishlatilgan" }, 409);

  const unclaim = () => admin.from("activation_codes").update({ used_at: null }).eq("student_id", st.id);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: studentEmail(hemisId),
    password,
    email_confirm: true,
    user_metadata: { full_name: st.full_name },
  });
  if (createErr || !created?.user) {
    console.error("createUser xatosi:", createErr?.message);
    await unclaim();
    return json({ error: "Hisob yaratib bo'lmadi. Keyinroq urinib ko'ring" }, 500);
  }
  const uid = created.user.id;
  const rollback = async () => {
    await admin.auth.admin.deleteUser(uid); // profiles ON DELETE CASCADE, students.profile_id -> null
    await unclaim();
  };

  const { error: profErr } = await admin.from("profiles")
    .insert({ id: uid, login: hemisId, full_name: st.full_name, role: "student" });
  if (profErr) {
    console.error("profiles xatosi:", profErr.message);
    await rollback();
    return json({ error: "Hisob yaratib bo'lmadi. Keyinroq urinib ko'ring" }, 500);
  }

  const { data: linked, error: linkErr } = await admin.from("students")
    .update({ profile_id: uid }).eq("id", st.id).is("profile_id", null).select("id");
  if (linkErr || !linked || linked.length === 0) {
    console.error("students bog'lash xatosi:", linkErr?.message);
    await rollback();
    return json({ error: "Hisob yaratib bo'lmadi. Keyinroq urinib ko'ring" }, 500);
  }

  return json({ ok: true, login: hemisId });
});
