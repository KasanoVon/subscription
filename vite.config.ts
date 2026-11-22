import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// アプリ画面（React）のページ。本番では server/index.js が同じパスに app.html を返す
const APP_ROUTES = ['/login', '/app', '/changelog']

// 静的なページ（拡張子なしの URL → HTML ファイル）。本番では server/index.js が同じ対応で返す
const STATIC_PAGES: Record<string, string> = { '/usd-jpy': '/usd-jpy.html' }

// 開発サーバーでも本番と同じ URL で各ページを返す
// （アプリ画面のパスは紹介ページ（index.html）ではなく app.html）
function appRoutesInDev(): Plugin {
  return {
    name: 'subnote-app-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url?.split('?')[0]
        if (pathname && APP_ROUTES.includes(pathname)) req.url = '/app.html'
        else if (pathname && STATIC_PAGES[pathname]) req.url = STATIC_PAGES[pathname]
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
        // サブスクのドル円換算ツール（ログイン不要）
        usdJpy: fileURLToPath(new URL('./usd-jpy.html', import.meta.url)),
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
