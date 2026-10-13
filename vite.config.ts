import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Dev proxy: the front calls same-origin /api/*; forward it to the backend
    // (default port 3000). No CORS on the server — this is the only bridge.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    // Domain/application logic is pure TypeScript: no DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
