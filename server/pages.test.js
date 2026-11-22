import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { renderAppPage, APP_PAGES } from './pages.js';

const SITE = 'https://subnote.up.railway.app';
const template = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');

describe('renderAppPage', () => {
  it('ページごとのタイトル・説明文・正式な URL を入れる', () => {
    const html = renderAppPage(template, '/login', SITE);
    expect(html).toContain('<title>ログイン・新規登録｜SubNote</title>');
    expect(html).toContain(`<link rel="canonical" href="${SITE}/login" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE}/login" />`);
    expect(html).toContain(`<meta property="og:image" content="${SITE}/og-image.png" />`);
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).not.toContain('page-meta:');
    expect(html).not.toContain('noindex');
  });

  it('アップデート履歴にも正式な URL', () => {
    expect(renderAppPage(template, '/changelog', SITE)).toContain(`<link rel="canonical" href="${SITE}/changelog" />`);
  });

  it('ログイン後の画面は検索結果に出さない', () => {
    const html = renderAppPage(template, '/app', SITE);
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('rel="canonical"');
  });

  it('アプリ画面以外のパスは null（404 にする）', () => {
    expect(renderAppPage(template, '/', SITE)).toBeNull();
    expect(renderAppPage(template, '/no-such-page', SITE)).toBeNull();
    expect(renderAppPage(template, '/login/extra', SITE)).toBeNull();
  });

  it('タイトルは1つだけ、本体のスクリプトは残る', () => {
    const html = renderAppPage(template, '/login', SITE);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<div id="root"></div>');
  });

  it('説明文は検索結果で切れにくい長さ（120字以内）', () => {
    for (const page of Object.values(APP_PAGES)) expect(page.description.length).toBeLessThanOrEqual(120);
  });
});
