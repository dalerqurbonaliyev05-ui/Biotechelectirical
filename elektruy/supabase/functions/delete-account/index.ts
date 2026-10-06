// delete-account: removes ALL ElektrUy data and storage objects of a user.
// The auth.users row is intentionally kept: this Supabase project is shared with
// other apps that may use the same Google account (see docs/DECISIONS.md).
//
// POST { confirm: "DELETE" }                      -> deletes the caller's data
// POST { confirm: "DELETE", user_id: uuid }       -> admin only: deletes that user's data
import { HttpError, json, serve } from "../_shared/http.ts";
import { authContext, isAdmin } from "../_shared/supabase.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";

const PRIVATE_BUCKETS = ["ew-project-photos", "ew-work-checks"];

async function listRecursive(admin: SupabaseClient, bucket: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const out: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw error;
    for (const item of data ?? []) {
      const path = `${prefix}/${item.name}`;
      if (item.id === null) out.push(...(await listRecursive(admin, bucket, path, depth + 1)));
      else out.push(path);
    }
    if (!data || data.length < 100) break;
  }
  return out;
}

serve(async (req, body) => {
  const ctx = await authContext(req);
  if (body.confirm !== "DELETE") throw new HttpError(400, "bad_request");

  let target = ctx.userId;
  if (typeof body.user_id === "string" && body.user_id !== ctx.userId) {
    if (!(await isAdmin(ctx))) throw new HttpError(403, "forbidden");
    if (!/^[0-9a-f-]{36}$/i.test(body.user_id)) throw new HttpError(400, "bad_request");
    target = body.user_id;
  }

  const removed: Record<string, number> = {};
  for (const bucket of PRIVATE_BUCKETS) {
    const files = await listRecursive(ctx.admin, bucket, target);
    for (let i = 0; i < files.length; i += 100) {
      const { error } = await ctx.admin.storage.from(bucket).remove(files.slice(i, i + 100));
      if (error) throw error;
    }
    removed[bucket] = files.length;
  }

  // Projects cascade to photos and markers. Order keeps foreign keys happy.
  const tables: [string, string][] = [
    ["ew_work_checks", "user_id"],
    ["ew_projects", "user_id"],
    ["ew_lesson_progress", "user_id"],
    ["ew_reviews", "user_id"],
    ["ew_reports", "user_id"],
    ["ew_electricians", "user_id"],
    ["ew_consents", "user_id"],
    ["ew_ai_calls", "user_id"],
    ["ew_profiles", "id"],
  ];
  for (const [table, column] of tables) {
    const { error, count } = await ctx.admin.from(table).delete({ count: "exact" }).eq(column, target);
    if (error) throw error;
    removed[table] = count ?? 0;
  }
  // Remove a stale admin link, if any (the e-mail entry itself stays for admins to manage).
  await ctx.admin.from("ew_admins").update({ user_id: null }).eq("user_id", target);

  return json({ ok: true, user_id: target, removed });
});
