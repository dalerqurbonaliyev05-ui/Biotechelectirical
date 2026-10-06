// estimate-room: photo(s) of a room -> approximate length / width / height with a
// confidence level. The app always makes the user confirm or edit the numbers.
//
// POST { photo_paths: string[] (ew-project-photos, own folder), lang?: "uz"|"ru"|"en", hint?: string }
import { HttpError, json, serve } from "../_shared/http.ts";
import { authContext } from "../_shared/supabase.ts";
import { aiLimits, askClaudeJson, LANG_NAME, loadImages, logCall, requireFeature, takeQuota, validatePaths } from "../_shared/ai.ts";

interface Estimate {
  usable: boolean;
  length_m: number;
  width_m: number;
  height_m: number;
  confidence: "low" | "medium" | "high";
  reference_objects: { name: string; assumed_size_m: number }[];
  visible_walls: number;
  notes: string;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["usable", "length_m", "width_m", "height_m", "confidence", "reference_objects", "visible_walls", "notes"],
  properties: {
    usable: { type: "boolean", description: "false if the photos do not show a room interior well enough to estimate" },
    length_m: { type: "number", description: "longer horizontal side of the floor, metres" },
    width_m: { type: "number", description: "shorter horizontal side of the floor, metres" },
    height_m: { type: "number", description: "floor to ceiling, metres" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    reference_objects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "assumed_size_m"],
        properties: { name: { type: "string" }, assumed_size_m: { type: "number" } },
      },
    },
    visible_walls: { type: "integer" },
    notes: { type: "string" },
  },
};

const SYSTEM = `You estimate the interior dimensions of ONE small residential room from photos, for a home-wiring planning app used in Uzbekistan.
Use known reference objects to set scale: interior doors are about 2.0 m high and 0.8 m wide, standard sockets sit about 0.3 m above the floor, light switches about 0.9-1.0 m, floor tiles are often 0.3-0.6 m, a typical ceiling in Uzbek apartments is 2.5-2.8 m.
Be honest about uncertainty: if walls are hidden or there is no reference object, lower the confidence. Never invent precision - round to 0.05 m.
If the photos do not show a room interior, set usable=false and give zeros.
Write "name" fields and "notes" in the user's language. In notes, briefly say which references you used and remind the user to confirm the numbers with a tape measure.`;

serve(async (req, body, lang) => {
  const ctx = await authContext(req);
  await requireFeature(ctx, "ai_estimate");
  const limits = await aiLimits(ctx);
  const paths = validatePaths(body.photo_paths, ctx.userId, limits.maxImages);
  const hint = typeof body.hint === "string" ? body.hint.slice(0, 300) : "";
  await takeQuota(ctx, "estimate-room", limits.raw);

  const started = Date.now();
  try {
    const images = await loadImages(ctx, "ew-project-photos", paths, limits.maxBytes);
    const prompt = `Estimate this room's length, width and height in metres. The user's language is ${LANG_NAME[lang]}.` +
      (hint ? `\nUser hint (may be wrong): ${hint}` : "");
    const { data, usage, model } = await askClaudeJson<Estimate>({ system: SYSTEM, images, prompt, schema: SCHEMA });
    await logCall(ctx, "estimate-room", { ok: true, started, usage });

    // Sanity-clamp: a result outside a plausible single-room range is reported as unusable.
    const round = (v: number) => Math.round(v * 20) / 20;
    let [a, b] = [round(data.length_m), round(data.width_m)];
    if (b > a) [a, b] = [b, a];
    const h = round(data.height_m);
    const plausible = data.usable && a >= 1 && a <= 15 && b >= 1 && b <= 15 && h >= 2 && h <= 4.5;
    return json({
      usable: plausible,
      length_m: plausible ? a : null,
      width_m: plausible ? b : null,
      height_m: plausible ? h : null,
      confidence: plausible ? data.confidence : "low",
      reference_objects: data.reference_objects.slice(0, 8),
      visible_walls: data.visible_walls,
      notes: data.notes.slice(0, 1000),
      model,
      approximate: true,
    });
  } catch (err) {
    await logCall(ctx, "estimate-room", {
      ok: false,
      started,
      error: err instanceof HttpError ? `${err.code}: ${err.detail ?? ""}` : String(err),
    });
    throw err;
  }
});
