import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Privzeto okolje je 'node' (hitri testi logike). UI testi uporabljajo
    // posebno oznako v datoteki: // @vitest-environment jsdom
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
});
