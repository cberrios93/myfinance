import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // carga TODAS las vars, no solo VITE_

  return {
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/boleta': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: () => '/v1/messages',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY ?? '')
            proxyReq.setHeader('anthropic-version', '2023-06-01')
            // Eliminar headers de browser para que Anthropic no lo trate como CORS
            proxyReq.removeHeader('origin')
            proxyReq.removeHeader('referer')
          })
        },
      },
      '/api/tipo-cambio': {
        target: 'https://app.rextie.com',
        changeOrigin: true,
        rewrite: () => '/api/v1/fxrates/rate/',
        configure: (proxy) => {
          // Rextie requiere POST — interceptamos la request y cambiamos el método
          proxy.on('proxyReq', (proxyReq) => {
            const body = JSON.stringify({ source_currency: 'USD', target_currency: 'PEN', source_amount: 1 })
            proxyReq.method = 'POST'
            proxyReq.setHeader('Content-Type', 'application/json; charset=UTF-8')
            proxyReq.setHeader('Content-Length', Buffer.byteLength(body))
            proxyReq.write(body)
          })
        },
      },
    },
  },
  }
})
