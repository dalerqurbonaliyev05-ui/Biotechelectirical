import type { NextConfig } from "next";

// Statik eksport: `npm run build` -> out/, so'ng scripts/deploy.mjs uni ../oyinlar/ ga
// ko'chiradi. Asosiy sayt build bosqichisiz statik HTML bo'lgani uchun bo'lim shu tarzda
// /oyinlar/ ostida yashaydi va boshqa sahifalarga tegmaydi.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/oyinlar",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
