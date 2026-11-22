// アプリ画面（app.html）を配信するページごとのタイトル・説明文・正式な URL。
// 画面は JavaScript で描画されるため、検索エンジンや SNS のプレビューが読むこれらの値は
// サーバーで HTML に埋め込む。トップページ（/）は静的な紹介ページ（index.html）で別扱い。

export const OG_IMAGE_PATH = '/og-image.png';

export const APP_PAGES = {
  '/login': {
    title: 'ログイン・新規登録｜SubNote',
    description:
      'SubNote にログイン、または無料で新規登録。メールアドレス不要、ユーザー名とパスワードだけでサブスクの管理を始められます。',
    index: true,
  },
  '/changelog': {
    title: 'アップデート履歴｜SubNote',
    description: 'サブスク管理アプリ SubNote の新機能・改善・修正の履歴です。',
    index: true,
  },
  // ログイン後の画面。検索結果には出さない
  '/app': {
    title: 'SubNote - サブスクリプション管理',
    description: 'サブスクの更新日と金額をまとめて管理するアプリです。',
    index: false,
  },
};

const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function pageMetaTags(page, url, siteUrl) {
  const e = escapeHtml;
  const image = `${siteUrl}${OG_IMAGE_PATH}`;
  return [
    `<meta name="description" content="${e(page.description)}" />`,
    page.index ? `<link rel="canonical" href="${e(url)}" />` : '<meta name="robots" content="noindex" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:url" content="${e(url)}" />`,
    `<meta property="og:title" content="${e(page.title)}" />`,
    `<meta property="og:description" content="${e(page.description)}" />`,
    `<meta property="og:image" content="${e(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:locale" content="ja_JP" />',
    '<meta property="og:site_name" content="SubNote" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:site" content="@KasanoVonZ" />',
    `<meta name="twitter:title" content="${e(page.title)}" />`,
    `<meta name="twitter:description" content="${e(page.description)}" />`,
    `<meta name="twitter:image" content="${e(image)}" />`,
  ].join('\n    ');
}

// app.html のタイトルを差し替え、page-meta の目印のところにメタタグを入れる。
// 対象外のパスなら null（呼び出し側で 404 を返す）
export function renderAppPage(template, pathname, siteUrl) {
  const page = APP_PAGES[pathname];
  if (!page) return null;
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<!-- page-meta:[^>]*-->/, pageMetaTags(page, `${siteUrl}${pathname}`, siteUrl));
}
