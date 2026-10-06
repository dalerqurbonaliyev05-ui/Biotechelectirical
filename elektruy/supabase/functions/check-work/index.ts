// check-work: photo(s) of finished wiring work -> visible issues with severity and
// the lesson to re-read. Results are stored in ew_work_checks. This is NOT an
// inspection: the response always carries a disclaimer, and "ok" means only that
// nothing wrong was visible.
//
// POST { image_paths: string[] (ew-work-checks, own folder), project_id?: uuid, lang?, context?: string }
import { HttpError, json, type Lang, serve } from "../_shared/http.ts";
import { authContext } from "../_shared/supabase.ts";
import { aiLimits, askClaudeJson, LANG_NAME, loadImages, logCall, requireFeature, takeQuota, validatePaths } from "../_shared/ai.ts";

const LESSONS = [
  "safety-basics", "voltage-tester", "replace-bulb", "install-socket", "switch-single",
  "switch-double", "switch-pass-through", "lamp-install", "junction-box", "cable-routing", "none",
];

interface CheckResult {
  overall: "ok" | "warning" | "critical" | "unclear";
  image_quality: "good" | "poor" | "unusable";
  summary: string;
  issues: {
    title: string;
    detail: string;
    severity: "info" | "warning" | "critical";
    lesson_slug: string;
    location_hint: string;
  }[];
  positives: string[];
  call_electrician: boolean;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overall", "image_quality", "summary", "issues", "positives", "call_electrician"],
  properties: {
    overall: { type: "string", enum: ["ok", "warning", "critical", "unclear"] },
    image_quality: { type: "string", enum: ["good", "poor", "unusable"] },
    summary: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "severity", "lesson_slug", "location_hint"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          severity: { type: "string", enum: ["info", "warning", "critical"] },
          lesson_slug: { type: "string", enum: LESSONS },
          location_hint: { type: "string" },
        },
      },
    },
    positives: { type: "array", items: { type: "string" } },
    call_electrician: { type: "boolean" },
  },
};

const SYSTEM = `You review photos of DIY household wiring work (220 V single-phase, copper) for a safety-first educational app in Uzbekistan.
Report only problems that are actually VISIBLE. Be conservative: when in doubt, flag it as a warning rather than calling it fine.
Look for, among others: exposed or nicked copper outside terminals; conductors not fully inserted in terminals or lever connectors; twisted joints covered only with tape; joints made inside the wall instead of a junction box; copper joined directly to aluminium; wrong colour use (blue/neutral on a switch, yellow-green used as a live conductor); the switch breaking the neutral instead of the phase; earth terminal of a socket bridged to neutral; more conductors in a connector than it is rated for; socket/switch boxes not flush or not fixed; cables not clipped, diagonal routes, routes very close to corners/doors/windows or below sockets; burn marks, melting or soot; missing faceplates leaving live parts reachable; work in a wet zone; signs of a distribution board being opened.
Severity: critical = could cause shock or fire now; warning = against good practice or norms; info = cosmetic or advice.
Set call_electrician=true for any critical issue, any distribution-board work, aluminium wiring, burn marks, or wet-zone work.
If the photos cannot show the relevant parts, set overall="unclear" and image_quality accordingly - do not guess.
Never say the installation is "safe" or "approved": at most say that no problems were visible in these photos. Never give instructions for working on live circuits; any corrective step must start with switching off the breaker and verifying absence of voltage.
For lesson_slug choose the most relevant lesson from the allowed list, or "none".
Write title, detail, location_hint, summary and positives in the user's language, in plain words.`;

const DISCLAIMER: Record<Lang, string> = {
  uz: "AI faqat rasmda ko'ringan narsalarni baholaydi va xato qilishi mumkin. Bu rasmiy tekshiruv emas. Ishni tester bilan tekshiring va litsenziyali elektrikka ko'rsating.",
  ru: "ИИ оценивает только то, что видно на фото, и может ошибаться. Это не официальная проверка. Проверьте работу тестером и покажите её лицензированному электрику.",
  en: "The AI only judges what is visible in the photos and can miss problems. This is not an inspection. Check the work with a tester and have a licensed electrician inspect it.",
};

serve(async (req, body, lang) => {
  const ctx = await authContext(req);
  await requireFeature(ctx, "ai_check");
  const limits = await aiLimits(ctx);
  const paths = validatePaths(body.image_paths, ctx.userId, limits.maxImages);
  const projectId = typeof body.project_id === "string" && /^[0-9a-f-]{36}$/i.test(body.project_id) ? body.project_id : null;
  const context = typeof body.context === "string" ? body.context.slice(0, 500) : "";

  if (projectId) {
    const { data } = await ctx.userClient.from("ew_projects").select("id").eq("id", projectId).maybeSingle();
    if (!data) throw new HttpError(403, "forbidden");
  }
  await takeQuota(ctx, "check-work", limits.raw);

  const started = Date.now();
  try {
    const images = await loadImages(ctx, "ew-work-checks", paths, limits.maxBytes);
    const prompt = `Review the wiring work in these photos. The user's language is ${LANG_NAME[lang]}.` +
      (context ? `\nWhat the user says they did: ${context}` : "");
    const { data, usage, model } = await askClaudeJson<CheckResult>({ system: SYSTEM, images, prompt, schema: SCHEMA });
    await logCall(ctx, "check-work", { ok: true, started, usage });

    // A critical issue always forces overall=critical and the electrician advice.
    const hasCritical = data.issues.some((i) => i.severity === "critical");
    const result = {
      ...data,
      overall: hasCritical ? "critical" : data.overall,
      call_electrician: data.call_electrician || hasCritical,
      issues: data.issues.slice(0, 20),
      positives: data.positives.slice(0, 10),
      disclaimer: DISCLAIMER[lang],
      model,
    };

    const { data: row, error } = await ctx.admin
      .from("ew_work_checks")
      .insert({ user_id: ctx.userId, project_id: projectId, image_paths: paths, lang, overall: result.overall, result })
      .select("id, created_at")
      .single();
    if (error) throw error;
    return json({ id: row.id, created_at: row.created_at, ...result });
  } catch (err) {
    await logCall(ctx, "check-work", {
      ok: false,
      started,
      error: err instanceof HttpError ? `${err.code}: ${err.detail ?? ""}` : String(err),
    });
    throw err;
  }
});
