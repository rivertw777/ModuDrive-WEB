import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup-tests.ts'],
  },
})
