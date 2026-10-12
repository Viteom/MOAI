/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // En desarrollo, /api va al servidor de cuentas (npm run dev:api) y queda en el mismo origen.
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  // Se preparan desde el arranque: si Vite las descubre a mitad de sesión, mezcla dos copias de React.
  optimizeDeps: { include: ['react', 'react-dom/client', 'lucide-react', 'libphonenumber-js/min', '@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge'] },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
