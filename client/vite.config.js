import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we use our own manifest.json in public/
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Precache only static build assets (JS, CSS, HTML, fonts, images).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Runtime caching — allowlist only. /violation-types and /calendar are
        // safe to cache: role-agnostic, non-sensitive GET responses.
        // /auth /users /messages /attendance and all other paths are never cached.
        // urlPattern must be a function — Workbox matches against the full URL
        // (https://host/path), so a regex anchored to / never matches.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              ['/violation-types', '/calendar'].some(p => url.pathname.startsWith(p)),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sims-api-safe',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 3600,
              },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    proxy: {
      '/auth':            { target: 'http://localhost:3000', changeOrigin: true },
      '/users':           { target: 'http://localhost:3000', changeOrigin: true },
      '/admin':           { target: 'http://localhost:3000', changeOrigin: true, bypass: (req) => { if (req.headers.accept?.includes('text/html')) return '/index.html'; } },
      '/students':        { target: 'http://localhost:3000', changeOrigin: true },
      '/calendar':        { target: 'http://localhost:3000', changeOrigin: true },
      '/duty-slots':      { target: 'http://localhost:3000', changeOrigin: true },
      '/attendance':      { target: 'http://localhost:3000', changeOrigin: true },
      '/violations':      { target: 'http://localhost:3000', changeOrigin: true },
      '/violation-types': { target: 'http://localhost:3000', changeOrigin: true },
      '/cover-requests':  { target: 'http://localhost:3000', changeOrigin: true },
      '/messages':        { target: 'http://localhost:3000', changeOrigin: true },
      '/reports':         { target: 'http://localhost:3000', changeOrigin: true },
      '/health':          { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
})
