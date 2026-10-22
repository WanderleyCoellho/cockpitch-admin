import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const backendTarget = env.OPS_BACKEND_URL || 'http://localhost:3001'

    return {
        plugins: [react(), tailwindcss()],
        server: {
            proxy: {
                '/api': {
                    target: backendTarget,
                    changeOrigin: true,
                    secure: false
                }
            }
        }
    }
})
