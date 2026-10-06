// Supabase clients for edge functions. The service-role client is used only for
// writes users may not make directly (AI call log, work-check results, account
// deletion); every read of user content goes through the caller's own JWT so RLS applies.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.2";
import { HttpError } from "./http.ts";

export interface Ctx {
  userId: string;
  email: string | null;
  userClient: SupabaseClient;
  admin: SupabaseClient;
}

export async function authContext(req: Request): Promise<Ctx> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) throw new HttpError(401, "unauthorized");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) throw new HttpError(401, "unauthorized");

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await admin.from("ew_profiles").select("is_banned").eq("id", data.user.id).maybeSingle();
  if (profile?.is_banned) throw new HttpError(403, "banned");

  return { userId: data.user.id, email: data.user.email ?? null, userClient, admin };
}

export async function isAdmin(ctx: Ctx): Promise<boolean> {
  const { data } = await ctx.userClient.rpc("ew_am_i_admin");
  return data === true;
}

export async function getConfig<T>(admin: SupabaseClient, key: string, fallback: T): Promise<T> {
  const { data } = await admin.from("ew_app_config").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}
