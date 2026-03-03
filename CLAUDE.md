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
- 環境変数: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`（省略時は DB 管理）
- フック: `src/hooks/usePushNotifications.ts`

---

## 主要な設計判断

- **状態永続化**: `AppState`（サブスクリプション一覧 + 通貨設定）は `user_states` テーブルに JSON ブロブとして一括保存。サブスクリプション単位のDBレコードはない。
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
| `VITE_CHANGELOG_BRANCH` | アップデート履歴ページが参照する GitHub ブランチ名 | `claude/subscription-management-app-3gncf` |

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
  index.js          # Express API サーバー（認証・状態保存・Push通知）
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
  hooks/
    usePushNotifications.ts  # Web Push 購読管理
  utils/
    currency.ts     # 通貨変換・フォーマット・月額/年額換算
    date.ts         # 日付ユーティリティ
    servicePresets.ts # サービス名プリセット
  styles/
    pencil.css      # 手書き風スタイル
```
