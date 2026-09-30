import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the Ousia Research org page as a project page:
//   https://ousiaresearch.github.io/muse-um/
// Local dev:  http://127.0.0.1:5173/muse-um/
// BASE_URL is imported by the app so every asset path resolves under it.
export default defineConfig({
  base: '/muse-um/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
