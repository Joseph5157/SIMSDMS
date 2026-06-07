import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we use our own manifest.json in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^\/(?:auth|users|admin|students|calendar|duty-slots|attendance|violations|violation-types|cover-requests|messages|reports|health)\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
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
