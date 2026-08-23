import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    // Локального бэкенда в репозитории нет — проксируем на продовый Slush API.
    // Если запускаешь свой бэкенд, верни target: 'http://localhost:8080'.
    proxy: {
      '/api': {
        target: 'https://slush-api-backend-gwfqgjb2djf2bhd3.westeurope-01.azurewebsites.net',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'https://slush-api-backend-gwfqgjb2djf2bhd3.westeurope-01.azurewebsites.net',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
