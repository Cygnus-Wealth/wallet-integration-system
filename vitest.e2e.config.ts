import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 10000,
    hookTimeout: 15000,
    include: ['src/test/e2e/**/*.test.ts'],
    exclude: ['src/test/e2e/modern-dapp-e2e.test.ts'],
    reporter: 'verbose',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    server: {
      deps: {
        inline: ['@cygnus-wealth/data-models']
      }
    }
  }
});
