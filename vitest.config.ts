import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    server: {
      deps: {
        inline: ['@cygnus-wealth/data-models']
      }
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      'src/test/e2e/vitest-e2e.test.ts', // Exclude full MetaMask test
      'src/test/e2e/puppeteer-wallet-test.ts' // Exclude the main puppeteer test file
    ]
  }
});