import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ADMIN_BASE lets the same build run at the domain root (Vercel project) or under
// /elektr-uy/admin/ on energyvibe.uz (static site, see .github/workflows/elektruy-admin.yml).
export default defineConfig({
  base: process.env.ADMIN_BASE || '/',
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 900 },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
