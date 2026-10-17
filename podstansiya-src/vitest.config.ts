import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testlar faqat engine va ma'lumotlar uchun (sof TypeScript, DOM shart emas).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
