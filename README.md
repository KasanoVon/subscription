# ✏️ SubNote — サブスクリプション管理ノート

サブスクリプションをまとめて管理・更新通知が届く Web アプリ

**→ https://subnote.up.railway.app**

---

## 機能

- サブスクリプションの追加・編集・削除・一時停止
- 月額 / 年額の合計をリアルタイム表示（JPY / USD 切替）
- カテゴリ別コスト内訳グラフ
- 更新日が近づくとプッシュ通知（1日前・3日前）
- ドラッグ&ドロップで並び替え
- CSV エクスポート
- パスワードリセット（リカバリーコード方式）

## 技術スタック

| 層 | 技術 |
|---|---|
| フロントエンド | React 18 + TypeScript + Vite |
| バックエンド | Express.js + libSQL (Turso) |
| 認証 | HTTPOnly Cookie セッション + bcrypt |
| プッシュ通知 | Web Push API (VAPID) |
| デプロイ | Railway |

## 環境変数（本番）

| 変数 | 説明 |
|---|---|
| `TURSO_DATABASE_URL` | Turso DB URL |
| `TURSO_AUTH_TOKEN` | Turso 認証トークン |
| `ALLOWED_ORIGIN` | 許可オリジン |
| `VAPID_EMAIL` | Web Push 連絡先メール |

詳細は [CLAUDE.md](./CLAUDE.md) を参照。
