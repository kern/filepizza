import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

// The app needs inline scripts (hydration data and the theme script) and talks
// to a configurable PeerJS signalling server, hence 'unsafe-inline' and the
// broad connect-src. The policy still blocks third-party scripts, plugins,
// framing by other sites and form posts elsewhere. HSTS is intentionally left
// to whatever terminates TLS in front of the app.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: http: ws:",
  "frame-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ')

export default defineConfig({
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart({ srcDirectory: 'src' }),
    nitro({
      routeRules: {
        '/**': {
          headers: {
            'Content-Security-Policy': contentSecurityPolicy,
            'X-Content-Type-Options': 'nosniff',
            // stream.html is embedded by the app itself, so allow same-origin.
            'X-Frame-Options': 'SAMEORIGIN',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy':
              'camera=(), microphone=(), geolocation=(), payment=()',
          },
        },
      },
    }),
    react(),
  ],
})
