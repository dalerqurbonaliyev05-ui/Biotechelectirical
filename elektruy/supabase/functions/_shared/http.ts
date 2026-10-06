// Shared HTTP helpers: CORS, JSON responses, localized errors.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type Lang = "uz" | "ru" | "en";

export function pickLang(value: unknown): Lang {
  return value === "ru" || value === "en" ? value : "uz";
}

const MESSAGES: Record<string, Record<Lang, string>> = {
  unauthorized: {
    uz: "Tizimga kiring.",
    ru: "Войдите в аккаунт.",
    en: "Please sign in.",
  },
  forbidden: {
    uz: "Ruxsat yo'q.",
    ru: "Нет доступа.",
    en: "Access denied.",
  },
  banned: {
    uz: "Hisobingiz bloklangan.",
    ru: "Ваш аккаунт заблокирован.",
    en: "Your account is blocked.",
  },
  bad_request: {
    uz: "So'rov noto'g'ri.",
    ru: "Неверный запрос.",
    en: "Invalid request.",
  },
  too_many_images: {
    uz: "Juda ko'p rasm yuborildi.",
    ru: "Слишком много фото.",
    en: "Too many photos.",
  },
  image_too_large: {
    uz: "Rasm hajmi juda katta.",
    ru: "Фото слишком большое.",
    en: "Photo is too large.",
  },
  image_type: {
    uz: "Faqat JPEG, PNG yoki WEBP rasm qabul qilinadi.",
    ru: "Принимаются только JPEG, PNG или WEBP.",
    en: "Only JPEG, PNG or WEBP photos are accepted.",
  },
  image_not_found: {
    uz: "Rasm topilmadi.",
    ru: "Фото не найдено.",
    en: "Photo not found.",
  },
  rate_limited: {
    uz: "AI so'rovlari limiti tugadi. Keyinroq urinib ko'ring.",
    ru: "Лимит запросов к ИИ исчерпан. Попробуйте позже.",
    en: "AI request limit reached. Please try again later.",
  },
  feature_disabled: {
    uz: "Bu funksiya vaqtincha o'chirilgan.",
    ru: "Функция временно отключена.",
    en: "This feature is temporarily disabled.",
  },
  ai_refused: {
    uz: "AI bu rasmni tahlil qila olmadi. Boshqa rasm yuboring.",
    ru: "ИИ не смог проанализировать фото. Попробуйте другое фото.",
    en: "The AI could not analyse this photo. Try a different photo.",
  },
  ai_failed: {
    uz: "AI xizmati javob bermadi. Keyinroq urinib ko'ring.",
    ru: "Сервис ИИ не ответил. Попробуйте позже.",
    en: "The AI service did not respond. Please try again later.",
  },
  server_error: {
    uz: "Server xatosi.",
    ru: "Ошибка сервера.",
    en: "Server error.",
  },
};

export class HttpError extends Error {
  constructor(public status: number, public code: string, public detail?: string) {
    super(code);
  }
}

export function message(code: string, lang: Lang): string {
  return MESSAGES[code]?.[lang] ?? MESSAGES.server_error[lang];
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function errorResponse(err: unknown, lang: Lang): Response {
  if (err instanceof HttpError) {
    return json({ error: err.code, message: message(err.code, lang) }, err.status);
  }
  console.error(err);
  return json({ error: "server_error", message: message("server_error", lang) }, 500);
}

/** Wraps a handler with CORS preflight, POST-only and JSON body parsing. */
export function serve(handler: (req: Request, body: Record<string, unknown>, lang: Lang) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    let lang: Lang = "uz";
    try {
      if (req.method !== "POST") throw new HttpError(405, "bad_request");
      const len = Number(req.headers.get("content-length") ?? "0");
      if (len > 64 * 1024) throw new HttpError(413, "bad_request");
      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        throw new HttpError(400, "bad_request");
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "bad_request");
      lang = pickLang(body.lang);
      return await handler(req, body, lang);
    } catch (err) {
      return errorResponse(err, lang);
    }
  });
}
