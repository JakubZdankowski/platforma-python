import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_BASE_PATH || '/',
  plugins: [react()],
  worker: { format: 'es' },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'supabase/functions/**/*.test.ts'],
    environment: 'node',
  },
}));
