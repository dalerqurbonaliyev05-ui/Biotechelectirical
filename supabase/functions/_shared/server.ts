// Deno (Supabase Edge Runtime) uchun umumiy yordamchilar.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// service_role mijozi: RLS'ni chetlab o'tadi. FAQAT serverda, brauzerga HECH QACHON berilmaydi.
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Caller {
  userId: string;
  role: string;
}

// So'rovni yuborgan foydalanuvchini tekshiradi (tokenni Supabase Auth serveri tasdiqlaydi)
// va rolini `profiles` jadvalidan oladi. Faol bo'lmagan yoki profilsiz foydalanuvchi = null.
export async function getCaller(req: Request, admin: SupabaseClient): Promise<Caller | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: p } = await admin.from("profiles").select("role, active").eq("id", data.user.id).maybeSingle();
  if (!p || !p.active) return null;
  return { userId: data.user.id, role: p.role as string };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
