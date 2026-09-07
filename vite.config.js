import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { authPlugin } from './server/vite-auth.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), authPlugin()],
  server: {
    port: 5173,
    strictPort: false,
  },
})
