import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/auth':            'http://localhost:3000',
      '/users':           'http://localhost:3000',
      '/admin':           'http://localhost:3000',
      '/students':        'http://localhost:3000',
      '/calendar':        'http://localhost:3000',
      '/duty-slots':      'http://localhost:3000',
      '/attendance':      'http://localhost:3000',
      '/violations':      'http://localhost:3000',
      '/violation-types': 'http://localhost:3000',
      '/cover-requests':  'http://localhost:3000',
      '/messages':        'http://localhost:3000',
      '/reports':         'http://localhost:3000',
      '/health':          'http://localhost:3000',
    },
  },
})
