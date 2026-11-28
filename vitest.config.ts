import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  publicDir: false,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    exclude: ['tests/e2e/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/**/*.{ts,tsx}',
        'cli/**/*.ts',
        'bin/peerjs.js',
        'public/sw.js',
      ],
      // The generated route tree, and the two files that only wire the command
      // line client to the real network (tests/e2e/cli.test.ts covers them).
      exclude: ['src/routeTree.gen.ts', 'cli/main.ts', 'cli/webrtc.ts'],
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
