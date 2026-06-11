import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8080'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['localhost', '127.0.0.1', 'afm.ngrok.app', 'afmback.ngrok.app'],
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        proxyTimeout: 300000, // 5 min for large video uploads
        timeout: 300000,
      },
      '/uploads': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
        proxyTimeout: 300000,
        timeout: 300000,
      },
    },
  },
})
