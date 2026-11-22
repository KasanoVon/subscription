import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// アプリ画面（React）のページ。本番では server/index.js が同じパスに app.html を返す
const APP_ROUTES = ['/login', '/app', '/changelog']

// 開発サーバーでも、アプリ画面のパスでは紹介ページ（index.html）ではなく app.html を返す
function appRoutesInDev(): Plugin {
  return {
    name: 'subnote-app-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url?.split('?')[0]
        if (pathname && APP_ROUTES.includes(pathname)) req.url = '/app.html'
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), appRoutesInDev()],
  build: {
    rollupOptions: {
      input: {
        // / の紹介ページ（JavaScript なしで読める静的 HTML）
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // ログイン・アプリ画面（React）
        app: fileURLToPath(new URL('./app.html', import.meta.url)),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
