import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // Stesso alias del progetto, così i test importano come l'app.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // I test RLS parlano con un vero Supabase: la rete può essere lenta.
    testTimeout: 30_000,
  },
});
