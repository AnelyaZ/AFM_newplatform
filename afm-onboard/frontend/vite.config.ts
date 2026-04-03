import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['localhost', '127.0.0.1', 'afm.ngrok.app', 'afmback.ngrok.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Без безопасного режима, так как backend http в dev
        secure: false,
      },
      // Проксируем статические медиа, чтобы ссылки вида "/uploads/..." работали с dev-сервера
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
