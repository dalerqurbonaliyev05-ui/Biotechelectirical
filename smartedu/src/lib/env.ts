/**
 * Muhit o'zgaruvchilari. NEXT_PUBLIC_* qiymatlari kodda to'g'ridan-to'g'ri
 * `process.env.NEXT_PUBLIC_...` ko'rinishida yozilishi shart (Next.js ularni shunda joylab qo'yadi).
 */
export function publicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  }
}

export function isSupabaseConfigured(): boolean {
  const e = publicEnv()
  return e.supabaseUrl.startsWith('http') && e.supabaseAnonKey.length > 10
}

/** Faqat serverda chaqiring. */
export function serverEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    syntheticEmailDomain: (
      process.env.SYNTHETIC_EMAIL_DOMAIN ?? 'students.smartedu.example'
    ).toLowerCase(),
    labSharedSecret: process.env.LAB_SHARED_SECRET ?? '',
    attendanceSecret: process.env.ATTENDANCE_SECRET ?? '',
    cronSecret: process.env.CRON_SECRET ?? '',
    labBaseUrl: (process.env.LAB_BASE_URL ?? 'https://energyvibe.uz/laboratoriya').replace(
      /\/$/,
      '',
    ),
    booksBaseUrl: (process.env.BOOKS_BASE_URL ?? 'https://energyvibe.uz/kutubxona').replace(
      /\/$/,
      '',
    ),
  }
}
