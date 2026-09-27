import path from 'node:path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Only our own scripts run, so an injected <script> or on*= handler is dead on arrival. The
// HttpOnly session cookie can't be stolen anyway, but a script running in the page could still
// send requests as the user — this stops the script itself.
// Sent as a response header by whatever serves dist/: `vite preview` here, the CloudFront
// response headers policy on AWS — keep that one in sync with this string.
// Not applied to `vite dev`: its HMR client needs inline scripts.
function contentSecurityPolicy(apiBaseUrl: string) {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // blob: — file previews are object URLs (features/drive/api/view-file.ts)
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    `connect-src 'self' ${new URL(apiBaseUrl).origin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

// https://vite.dev/config/
export default defineConfig(({ mode, isPreview }) => {
  const { VITE_API_BASE_URL } = loadEnv(mode, process.cwd())
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // must match gateway CORS allowed origin (FRONTEND_APP_URL) in ModuDrive-API
      port: 3000,
      // project lives on /mnt/c (WSL DrvFs) which doesn't emit inotify events,
      // so HMR needs polling to notice file changes
      watch: { usePolling: true },
    },
    preview: {
      port: 3000,
      // throws without VITE_API_BASE_URL rather than serving the page with no CSP at all
      headers: isPreview
        ? { 'Content-Security-Policy': contentSecurityPolicy(VITE_API_BASE_URL) }
        : undefined,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/testing/setup-tests.ts'],
    },
  }
})
