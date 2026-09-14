import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true, // LAN: el celular entra por http://<ip-pc>:5173
    port: 5173,
    proxy: {
      // Fase 0 LAN: redirigible con VITE_API_PROXY (default backend local).
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:8000',
    },
  },
})
