import { defineConfig } from 'vitest/config';

// date.ts は端末のローカル時刻で「今日」を決めるため、実行環境のタイムゾーンで
// 結果が変わらないよう日本時間に固定する（テスト用のワーカーはこの環境変数を引き継ぐ）
process.env.TZ = 'Asia/Tokyo';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.js'],
    environment: 'node',
  },
});
