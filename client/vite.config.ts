import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:3000'

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'BACKEND_'],
    server: {
      proxy: {
        '/api': backendUrl,
        '/ws': {
          target: backendUrl,
          ws: true,
        },
      },
    },
  }
})
