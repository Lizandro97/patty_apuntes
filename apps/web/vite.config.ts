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
    host: true, // LAN: the phone reaches the dev server at http://<pc-ip>:5173
    port: 5173,
    proxy: {
      // LAN: overridable with VITE_API_PROXY (default local backend).
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:8000',
    },
  },
})
