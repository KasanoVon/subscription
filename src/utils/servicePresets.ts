import type { BillingCycle, Currency } from '../types';

export interface ServicePreset {
  name: string;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  category: string;
  url: string;
}

export const SERVICE_PRESETS: ServicePreset[] = [
  // 動画
  { name: 'Netflix スタンダード', amount: 1490, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://netflix.com' },
  { name: 'Netflix プレミアム', amount: 1980, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://netflix.com' },
  { name: 'YouTube Premium', amount: 1280, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://youtube.com/premium' },
  { name: 'Amazon Prime', amount: 600, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://amazon.co.jp/prime' },
  { name: 'Amazon Prime (年払い)', amount: 5900, currency: 'JPY', billingCycle: 'yearly', category: 'エンタメ', url: 'https://amazon.co.jp/prime' },
  { name: 'Disney+', amount: 990, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://disneyplus.com' },
  { name: 'Apple TV+', amount: 900, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://tv.apple.com' },
  { name: 'Hulu', amount: 1026, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://hulu.jp' },
  { name: 'U-NEXT', amount: 2189, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://video.unext.jp' },
  { name: 'dアニメストア', amount: 440, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://animestore.docomo.ne.jp' },
  { name: 'NHKオンデマンド', amount: 990, currency: 'JPY', billingCycle: 'monthly', category: 'エンタメ', url: 'https://nhk-ondemand.jp' },
  // 音楽
  { name: 'Spotify', amount: 980, currency: 'JPY', billingCycle: 'monthly', category: '音楽', url: 'https://spotify.com' },
  { name: 'Apple Music', amount: 1080, currency: 'JPY', billingCycle: 'monthly', category: '音楽', url: 'https://music.apple.com' },
  { name: 'LINE MUSIC', amount: 980, currency: 'JPY', billingCycle: 'monthly', category: '音楽', url: 'https://music.line.me' },
  { name: 'AWA', amount: 960, currency: 'JPY', billingCycle: 'monthly', category: '音楽', url: 'https://awa.fm' },
  { name: 'YouTube Music Premium', amount: 980, currency: 'JPY', billingCycle: 'monthly', category: '音楽', url: 'https://music.youtube.com' },
  // 読書・学習
  { name: 'Kindle Unlimited', amount: 980, currency: 'JPY', billingCycle: 'monthly', category: 'ニュース・学習', url: 'https://amazon.co.jp/kindle-unlimited' },
  { name: 'Audible', amount: 1500, currency: 'JPY', billingCycle: 'monthly', category: 'ニュース・学習', url: 'https://audible.co.jp' },
  { name: 'Duolingo Plus', amount: 1667, currency: 'JPY', billingCycle: 'monthly', category: 'ニュース・学習', url: 'https://duolingo.com' },
  // クラウド・ストレージ
  { name: 'iCloud+ 50GB', amount: 130, currency: 'JPY', billingCycle: 'monthly', category: 'クラウド・ストレージ', url: 'https://icloud.com' },
  { name: 'iCloud+ 200GB', amount: 400, currency: 'JPY', billingCycle: 'monthly', category: 'クラウド・ストレージ', url: 'https://icloud.com' },
  { name: 'iCloud+ 2TB', amount: 1300, currency: 'JPY', billingCycle: 'monthly', category: 'クラウド・ストレージ', url: 'https://icloud.com' },
  { name: 'Google One 100GB', amount: 250, currency: 'JPY', billingCycle: 'monthly', category: 'クラウド・ストレージ', url: 'https://one.google.com' },
  { name: 'Google One 200GB', amount: 380, currency: 'JPY', billingCycle: 'monthly', category: 'クラウド・ストレージ', url: 'https://one.google.com' },
  { name: 'Google One 2TB', amount: 1300, currency: 'JPY', billingCycle: 'monthly', category: 'クラウド・ストレージ', url: 'https://one.google.com' },
  { name: 'Dropbox Plus', amount: 11.99, currency: 'USD', billingCycle: 'monthly', category: 'クラウド・ストレージ', url: 'https://dropbox.com' },
  // 仕事・生産性
  { name: 'Microsoft 365 Personal', amount: 1490, currency: 'JPY', billingCycle: 'monthly', category: '仕事・生産性', url: 'https://microsoft.com/microsoft-365' },
  { name: 'Adobe Creative Cloud', amount: 54.99, currency: 'USD', billingCycle: 'monthly', category: '仕事・生産性', url: 'https://adobe.com' },
  { name: 'Notion Plus', amount: 8, currency: 'USD', billingCycle: 'monthly', category: '仕事・生産性', url: 'https://notion.so' },
  { name: 'Canva Pro', amount: 1500, currency: 'JPY', billingCycle: 'monthly', category: '仕事・生産性', url: 'https://canva.com' },
  { name: 'ChatGPT Plus', amount: 20, currency: 'USD', billingCycle: 'monthly', category: '仕事・生産性', url: 'https://chat.openai.com' },
  { name: 'Claude Pro', amount: 20, currency: 'USD', billingCycle: 'monthly', category: '仕事・生産性', url: 'https://claude.ai' },
  { name: 'Figma Professional', amount: 12, currency: 'USD', billingCycle: 'monthly', category: '仕事・生産性', url: 'https://figma.com' },
  // 開発ツール
  { name: 'GitHub Copilot', amount: 10, currency: 'USD', billingCycle: 'monthly', category: '開発ツール', url: 'https://github.com/features/copilot' },
  { name: 'GitHub Pro', amount: 4, currency: 'USD', billingCycle: 'monthly', category: '開発ツール', url: 'https://github.com' },
  { name: 'Vercel Pro', amount: 20, currency: 'USD', billingCycle: 'monthly', category: '開発ツール', url: 'https://vercel.com' },
  { name: 'Linear', amount: 8, currency: 'USD', billingCycle: 'monthly', category: '開発ツール', url: 'https://linear.app' },
  // ゲーム
  { name: 'Nintendo Switch Online', amount: 2400, currency: 'JPY', billingCycle: 'yearly', category: 'ゲーム', url: 'https://nintendo.com' },
  { name: 'Nintendo Switch Online + 追加パック', amount: 4900, currency: 'JPY', billingCycle: 'yearly', category: 'ゲーム', url: 'https://nintendo.com' },
  { name: 'PlayStation Plus エッセンシャル', amount: 850, currency: 'JPY', billingCycle: 'monthly', category: 'ゲーム', url: 'https://playstation.com' },
  { name: 'Xbox Game Pass Ultimate', amount: 1210, currency: 'JPY', billingCycle: 'monthly', category: 'ゲーム', url: 'https://xbox.com' },
];

export function searchPresets(query: string): ServicePreset[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return SERVICE_PRESETS.filter((s) =>
    s.name.toLowerCase().includes(q)
  ).slice(0, 6);
}
