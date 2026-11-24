import path from 'node:path'
import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Repo ildizida boshqa loyihalar bor — izlash faqat shu papka ichida bo'lsin.
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  webpack(config) {
    // pdf.js brauzerda ishlaydi; Node'dagi ixtiyoriy `canvas` bog'liqligi kerak emas.
    config.resolve.alias = { ...config.resolve.alias, canvas: false }
    return config
  },
}

export default nextConfig
