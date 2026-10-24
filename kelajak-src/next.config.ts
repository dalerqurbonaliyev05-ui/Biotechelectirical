import type { NextConfig } from "next";

// Statik eksport: `npm run build` -> out/, so'ng scripts/deploy.mjs uni ../kelajak/ ga ko'chiradi.
// Asosiy sayt build bosqichisiz statik HTML, shuning uchun bo'lim /kelajak/ ostida alohida yashaydi.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/kelajak",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
