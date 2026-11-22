# CLAUDE.md — SubNote (サブスクリプション管理アプリ)

## コマンド

```bash
# 依存関係インストール
npm install

# バックエンドサーバー起動（ポート 8787）
npm run server

# フロントエンド開発サーバー起動（ポート 5173、/api を :8787 にプロキシ）
npm run dev

# 本番ビルド
npm run build

# テスト（Vitest。タイムゾーンは vitest.config.ts で Asia/Tokyo に固定）
npm test

# Railway へのデプロイは git push で自動実行（railway.toml 参照）
```

`npm run server` と `npm run dev` は同時起動が必要。

---

## アーキテクチャ

2プロセス構成（開発時）、本番は単一プロセス。

### バックエンド (`server/index.js`) — Express + libSQL / Turso

- ポート: `8787`（環境変数 `PORT` で上書き可）
- DB: ローカル → `server/subnote.db`（libSQL ファイルモード）、本番 → Turso クラウド（`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`）
- 本番環境では `dist/` の静的ファイルも配信（フロントエンドと同一プロセス）

**テーブル構成:**

| テーブル | 役割 |
|---|---|
| `users` | アカウント情報（id, username, password_hash） |
| `sessions` | セッショントークン（30日有効） |
| `user_states` | `AppState` 全体を JSON ブロブで保存（サブスクリプション + 通貨設定） |
| `push_subscriptions` | Web Push 購読情報 |
| `app_settings` | VAPID キーなどアプリ設定 |
| `calendar_tokens` | カレンダー配信 URL のトークン（SHA-256、1ユーザー1つ） |

**認証:** `Authorization: Bearer <token>` ヘッダー、セッション有効期限は30日。

**レートリミット:** `/api/auth/*` に 15分/10回制限。

### フロントエンド (`src/`) — React + TypeScript + Vite

- コンテキストのラップ順（重要）:
  ```
  AuthProvider > BrowserRouter > AppProvider
  ```
- `AppProvider` は `userId` と `authToken` の props が必須 → 認証済みユーザーのみマウント

**状態フロー:**
1. ログイン → `AuthContext` がトークンを `localStorage` に保存
2. `AppProvider` マウント時に `/api/state` からサーバー状態を取得（並列で為替レートも取得）
3. ローカルキャッシュ（`subnote_state_{userId}`）をオフラインフォールバックとして利用
4. 状態変化のたびに 500ms デバウンス後 `/api/state` に PUT 保存

---

## Web Push 通知

- VAPID キー: 起動時に DB から読み込み、なければ自動生成して保存
- cronジョブ: 毎朝 9:00 JST（= 0:00 UTC）に更新日 1日前・3日前のサブスクリプションを通知
  - 保存済みの `nextBillingDate` はアプリを開いたときにしか進まないため、判定前に `server/dates.js` の `advanceToCurrent()` で周期ぶん進める（クライアントの `advanceOverdueDates` と同じ結果になることをテストで保証）
- Android アプリ（Capacitor の WebView）は通常 Push API を持たないため Web Push は届かない見込み（実機未確認）。その場合 `usePushNotifications` の `supported` が false になり、ユーザーメニューの「更新通知」も表示されない
- 環境変数: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`（省略時は DB 管理）
- フック: `src/hooks/usePushNotifications.ts`

---

## ページ構成と SEO

- `/`：静的な紹介ページ（`index.html` + `src/styles/landing.css`、JavaScript のバンドルなし）。検索エンジン向けの本文・構造化データ（WebApplication / FAQPage）を持つ。FAQ を変えるときは、画面の文と JSON-LD の文を必ず一字一句そろえる（Google は両者の一致を求める）
- 紹介ページ冒頭のスクリプトで、ログイン済み（`subnote_auth_user` あり）と Android アプリ（`window.Capacitor`）は `/app` へ移動する。Capacitor は本番の `/` を開くため
- `/login`・`/app`・`/changelog`：React のアプリ画面（`app.html`）。本番では `server/pages.js` がページごとのタイトル・説明文・canonical・OGP を埋め込む。`/app` は noindex。開発時は `vite.config.ts` のプラグインが同じパスで `app.html` を返す
- 上記以外のパスは 404（`public/404.html`）。`/index.html`・`/app.html` は正式な URL へ 301
- シェア画像は `public/og-image.png`（1200×630）、紹介ページの画面写真は `public/screenshot-dashboard.webp`
- 新しいページを増やしたら `server/pages.js`・`vite.config.ts` の `APP_ROUTES`・`src/App.tsx` の `PAGE_TITLES`・`public/sitemap.xml` をそろえる

---

## カレンダー配信（ICS）

- アカウント設定の「📅 カレンダー連携」で秘密の URL を発行（`POST /api/calendar-token`、`DELETE` で停止）。URL は発行時に1回だけ表示し、再発行で古い URL は 404 になる
- `GET /api/calendar/snc_<64桁hex>.ics`：アクティブなサブスクの更新日を1年先まで終日の予定として返す。前日 9:00 の VALARM 付き
- カレンダーアプリはヘッダーを付けられないため、URL のトークンだけで認証する。読めるのは更新日・金額・支払い方法のみ
- ICS の組み立ては `server/calendar.js`（CRLF・75オクテット折り返し・TEXT エスケープ・安定した UID）
- Web Push が届かない Android アプリ利用者でも、カレンダーアプリの通知で更新日を知らせられる

---

## 主要な設計判断

- **状態永続化**: `AppState`（サブスクリプション一覧 + 通貨設定 + 月ごとの支出記録）は `user_states` テーブルに JSON ブロブとして一括保存。サブスクリプション単位のDBレコードはない。
- **支出の推移**: `AppState.monthlyHistory` に月ごとの月額合計（円換算）と当時のレートを記録。`AppContext` がサブスクやレートの変化時に今月分を上書きし、過去の月は残す（最大36か月）。アプリを開かなかった月は記録がなく、グラフでは「—」になる。計算は `src/utils/history.ts`
- **一覧の並び順**: 手動（ドラッグ）・更新日・金額（表示通貨の月額換算）・名前。選択は端末ごとに localStorage（`subnote_sort`）に保存。手動以外ではドラッグ不可
- **カテゴリ移行**: `AppContext.tsx` の `CATEGORY_MIGRATION_MAP` で旧英語カテゴリ名を日本語に変換。保存済みデータをロード時に `normalizeCategory()` で自動移行。
- **為替レート**: ログイン時に `open.er-api.com` からリアルタイムレートを取得。失敗時は `DEFAULT_EXCHANGE_RATE`（150円/ドル）を使用。通貨変換はレンダリング時に実施。
- **スタイル**: 手書き風カスタム CSS（`src/styles/pencil.css`）と SVG `feTurbulence` フィルター（`id="pencil-sketch"`、`App.tsx` で注入）。
- **Capacitor**: Android ネイティブビルドに対応（`capacitor.config.ts`）。CORS の許可オリジンに `capacitor://localhost` を含む。

---

## 環境変数

| 変数 | 説明 | デフォルト |
|---|---|---|
| `PORT` | サーバーポート | `8787` |
| `NODE_ENV` | `production` で静的ファイル配信を有効化 | - |
| `TURSO_DATABASE_URL` | Turso DB URL（未設定時はローカル SQLite） | `file:server/subnote.db` |
| `TURSO_AUTH_TOKEN` | Turso 認証トークン | - |
| `ALLOWED_ORIGIN` | 本番の許可オリジン | `https://subnote.up.railway.app` |
| `VAPID_PUBLIC_KEY` | Web Push VAPID 公開鍵（省略時は DB 管理） | - |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 秘密鍵（省略時は DB 管理） | - |
| `VAPID_EMAIL` | Web Push 連絡先メール | `noreply@subnote.app` |
| `VITE_API_BASE` | フロントエンドの API ベースURL（本番用） | `''`（相対パス） |

---

## デプロイ（Railway）

`railway.toml` で設定済み:
- ビルド: `npm install && npm run build`
- 起動: `npm start`（= `node server/index.js`）
- 本番では Express がフロントエンドの `dist/` も配信するためサーバー1つのみ起動。

---

## ファイル構成

```
server/
  pages.js          # アプリ画面のページごとのメタタグ（SEO）
  pages.test.js
  index.js          # Express API サーバー（認証・状態保存・Push通知）
  dates.js          # サーバー側の日付計算（JST の今日・月末丸め・更新日の繰り上げ）
  dates.test.js
  calendar.js       # カレンダー配信（ICS）の組み立て
  calendar.test.js
index.html          # / の紹介ページ（静的）
app.html            # アプリ画面（React）の HTML
src/
  types.ts          # 型定義・カテゴリ定数
  App.tsx           # ルーティング・SVGフィルター注入
  main.tsx          # エントリーポイント
  context/
    AuthContext.tsx  # 認証状態管理
    AppContext.tsx   # アプリ状態管理・サーバー同期
  components/
    AuthPage.tsx
    Dashboard.tsx
    Header.tsx
    SubscriptionCard.tsx
    SubscriptionList.tsx
    SubscriptionModal.tsx
    SpendingTrend.tsx # 月額の推移グラフ
  hooks/
    usePushNotifications.ts  # Web Push 購読管理
  utils/
    currency.ts     # 通貨変換・フォーマット・月額/年額換算
    currency.test.ts
    date.ts         # 日付ユーティリティ
    date.test.ts
    history.ts      # 月ごとの支出記録・推移グラフ用の系列
    history.test.ts
    sort.ts         # 一覧の並べ替え
    sort.test.ts
    servicePresets.ts # サービス名プリセット
  styles/
    pencil.css      # 手書き風スタイル
```
