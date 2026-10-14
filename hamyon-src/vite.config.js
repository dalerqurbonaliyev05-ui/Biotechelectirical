import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' kerak: Capacitor ilovasi fayllarni nisbiy yo'l bilan yuklaydi
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 800 },
});
