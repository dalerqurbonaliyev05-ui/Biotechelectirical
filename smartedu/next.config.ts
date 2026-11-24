import path from 'node:path'
import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

/**
 * Content-Security-Policy (faqat production: dev rejimi `eval` talab qiladi).
 * Supabase manzili build vaqtida NEXT_PUBLIC_SUPABASE_URL dan olinadi (REST, Auth, Storage: https; Realtime: wss).
 * 'unsafe-inline' — Next.js gidratatsiya skriptlari uchun (nonce'siz); eval KERAK EMAS.
 * worker-src blob: — pdf.js ishchi oqimi. frame-ancestors 'none' — boshqa saytga iframe qilib bo'lmaydi.
 */
function contentSecurityPolicy(): string {
  let host = '*.supabase.co'
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  } catch {
    /* noto'g'ri URL: umumiy supabase.co ga qaytamiz */
  }
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' https://${host} wss://${host}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Repo ildizida boshqa loyihalar bor — izlash faqat shu papka ichida bo'lsin.
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    const headers = [...securityHeaders]
    if (process.env.NODE_ENV === 'production') {
      headers.push({ key: 'Content-Security-Policy', value: contentSecurityPolicy() })
      // HTTPS'ga majburlash (Vercel/Cloudflare doim HTTPS beradi)
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' })
    }
    return [{ source: '/:path*', headers }]
  },
  webpack(config) {
    // pdf.js brauzerda ishlaydi; Node'dagi ixtiyoriy `canvas` bog'liqligi kerak emas.
    config.resolve.alias = { ...config.resolve.alias, canvas: false }
    return config
  },
}

export default nextConfig
