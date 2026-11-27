import { createRequire } from 'node:module'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const require = createRequire(import.meta.url)

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      'server-only': require.resolve('next/dist/compiled/server-only/empty.js'),
    },
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    server: { deps: { inline: ['next-view-transitions'] } },
    setupFiles: './vitest.setup.ts',
    exclude: ['tests/e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'bin/peerjs.js', 'public/sw.js'],
      reporter: ['text', 'html'],
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
})
