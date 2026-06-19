import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { helmSync } from './vite-plugin-sync'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), helmSync()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
})