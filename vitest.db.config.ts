import { defineConfig } from 'vitest/config';

// Permission and account tests against the local Supabase stack.
// Run `pnpm supabase start` and `pnpm supabase db reset` first.
export default defineConfig({
  test: {
    include: ['tests/db/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
