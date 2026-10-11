import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['supabase/tests/database/**/*.test.ts'],
    passWithNoTests: false,
    fileParallelism: false,
    setupFiles: ['supabase/tests/database/setup.ts'],
  },
});
