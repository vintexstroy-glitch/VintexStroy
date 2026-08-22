import { defineConfig } from 'vitest/config';

// Отделен от vite.config.ts — там root е `app`, а тестовете живеят в корена.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'proba/**/*.test.ts'],
  },
});
