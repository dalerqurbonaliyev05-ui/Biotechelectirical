// Claude vision helper: per-user quota, image loading from private storage, a
// structured-output request with server-side refusal fallback, and call logging.
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";
import { HttpError } from "./http.ts";
import { type Ctx, getConfig } from "./supabase.ts";

export const MODEL = Deno.env.get("EW_CLAUDE_MODEL") ?? "claude-opus-5-5";

type Fn = "estimate-room" | "check-work";

interface AiLimits {
  [fn: string]: unknown;
  max_image_bytes?: number;
  max_images?: number;
}

export async function aiLimits(ctx: Ctx): Promise<{ maxBytes: number; maxImages: number; raw: AiLimits }> {
  const raw = await getConfig<AiLimits>(ctx.admin, "ai_limits", {});
  return {
    maxBytes: Math.min(Number(raw.max_image_bytes ?? 5_242_880), 6_291_456),
    maxImages: Math.min(Number(raw.max_images ?? 4), 6),
    raw,
  };
}

export async function requireFeature(ctx: Ctx, flag: string) {
  const flags = await getConfig<Record<string, boolean>>(ctx.admin, "feature_flags", {});
  if (flags[flag] === false) throw new HttpError(503, "feature_disabled");
}

/** Throws 429 when the caller has used up their hourly or daily quota for `fn`. */
export async function takeQuota(ctx: Ctx, fn: Fn, limits: AiLimits) {
  const cfg = (limits[fn] ?? {}) as { per_hour?: number; per_day?: number };
  const perHour = Number(cfg.per_hour ?? 10);
  const perDay = Number(cfg.per_day ?? 30);
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (from: string) => {
    const { count, error } = await ctx.admin
      .from("ew_ai_calls")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .eq("fn", fn)
      .gte("created_at", from);
    if (error) throw error;
    return count ?? 0;
  };
  if ((await count(since(3_600_000))) >= perHour || (await count(since(86_400_000))) >= perDay) {
    throw new HttpError(429, "rate_limited");
  }
}

export async function logCall(
  ctx: Ctx,
  fn: Fn,
  row: { ok: boolean; started: number; usage?: { input_tokens?: number; output_tokens?: number }; error?: string },
) {
  await ctx.admin.from("ew_ai_calls").insert({
    user_id: ctx.userId,
    fn,
    ok: row.ok,
    duration_ms: Date.now() - row.started,
    input_tokens: row.usage?.input_tokens ?? null,
    output_tokens: row.usage?.output_tokens ?? null,
    error: row.error?.slice(0, 500) ?? null,
  });
}

const MEDIA: Record<string, "image/jpeg" | "image/png" | "image/webp"> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function validatePaths(value: unknown, userId: string, maxImages: number): string[] {
  if (!Array.isArray(value) || value.length === 0) throw new HttpError(400, "bad_request");
  if (value.length > maxImages) throw new HttpError(400, "too_many_images");
  return value.map((p) => {
    if (typeof p !== "string" || p.length > 500 || p.includes("..") || !p.startsWith(`${userId}/`)) {
      throw new HttpError(403, "forbidden");
    }
    return p;
  });
}

/** Downloads images with the caller's JWT (storage RLS limits them to their own folder). */
export async function loadImages(ctx: Ctx, bucket: string, paths: string[], maxBytes: number) {
  const out: Anthropic.Beta.BetaImageBlockParam[] = [];
  for (const path of paths) {
    const { data, error } = await ctx.userClient.storage.from(bucket).download(path);
    if (error || !data) throw new HttpError(404, "image_not_found");
    if (data.size > maxBytes) throw new HttpError(413, "image_too_large");
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const media = MEDIA[data.type] ?? MEDIA[ext];
    if (!media) throw new HttpError(415, "image_type");
    out.push({
      type: "image",
      source: { type: "base64", media_type: media, data: encodeBase64(new Uint8Array(await data.arrayBuffer())) },
    });
  }
  return out;
}

/**
 * One vision request with a JSON-schema-constrained answer. Refusals that survive the
 * server-side fallback become a 422 the app shows as "try a different photo".
 */
export async function askClaudeJson<T>(opts: {
  system: string;
  images: Anthropic.Beta.BetaImageBlockParam[];
  prompt: string;
  schema: Record<string, unknown>;
}): Promise<{ data: T; usage: { input_tokens: number; output_tokens: number }; model: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new HttpError(503, "ai_failed", "ANTHROPIC_API_KEY secret is not set");
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 });

  let res: Anthropic.Beta.BetaMessage;
  try {
    res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: opts.schema } },
      system: opts.system,
      messages: [{ role: "user", content: [...opts.images, { type: "text", text: opts.prompt }] }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(503, "ai_failed", "anthropic rate limit");
    if (err instanceof Anthropic.BadRequestError) throw new HttpError(502, "ai_failed", err.message);
    if (err instanceof Anthropic.APIError) throw new HttpError(502, "ai_failed", `${err.status} ${err.message}`);
    throw new HttpError(502, "ai_failed", String(err));
  }

  if (res.stop_reason === "refusal") throw new HttpError(422, "ai_refused", res.stop_details?.category ?? "refusal");
  if (res.stop_reason === "max_tokens") throw new HttpError(502, "ai_failed", "max_tokens");

  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  try {
    return {
      data: JSON.parse(text) as T,
      usage: { input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens },
      model: res.model,
    };
  } catch {
    throw new HttpError(502, "ai_failed", "invalid JSON from model");
  }
}

export const LANG_NAME = { uz: "Uzbek (Latin script)", ru: "Russian", en: "English" } as const;
