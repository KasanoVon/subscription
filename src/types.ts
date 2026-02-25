export interface User {
  id: string;
  username: string;
  passwordHash: string; // SHA-256 hex (注: 本番では bcrypt + バックエンドを使用すること)
  createdAt: string;
}

export type Currency = 'JPY' | 'USD';
export type BillingCycle = 'monthly' | 'yearly' | 'weekly';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  category: string;
  nextBillingDate: string; // ISO date string
  status: SubscriptionStatus;
  notes?: string;
  url?: string;
  color: string;
  createdAt: string;
}

export interface AppState {
  subscriptions: Subscription[];
  displayCurrency: Currency;
  exchangeRate: number; // JPY per 1 USD
}

export const CATEGORIES = [
  'エンタメ',
  '音楽',
  '仕事・生産性',
  'クラウド・ストレージ',
  '開発ツール',
  'ゲーム',
  'ニュース・学習',
  'ユーティリティ',
  'その他',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  'エンタメ': '#D45B5B',
  '音楽': '#A05BD4',
  '仕事・生産性': '#5B8DD4',
  'クラウド・ストレージ': '#5BA8D4',
  '開発ツール': '#5BD4A8',
  'ゲーム': '#D4875B',
  'ニュース・学習': '#D4C85B',
  'ユーティリティ': '#8BD45B',
  'その他': '#8B8B8B',
};

// デフォルトのサンプルデータ
export const DEFAULT_SUBSCRIPTIONS: Subscription[] = [
  {
    id: '1',
    name: 'Netflix',
    amount: 1490,
    currency: 'JPY',
    billingCycle: 'monthly',
    category: 'エンタメ',
    nextBillingDate: '2026-03-15',
    status: 'active',
    url: 'https://netflix.com',
    color: '#D45B5B',
    createdAt: '2026-01-01',
  },
  {
    id: '2',
    name: 'Spotify',
    amount: 9.99,
    currency: 'USD',
    billingCycle: 'monthly',
    category: '音楽',
    nextBillingDate: '2026-03-10',
    status: 'active',
    url: 'https://spotify.com',
    color: '#A05BD4',
    createdAt: '2026-01-01',
  },
  {
    id: '3',
    name: 'Adobe Creative Cloud',
    amount: 54.99,
    currency: 'USD',
    billingCycle: 'monthly',
    category: '仕事・生産性',
    nextBillingDate: '2026-03-20',
    status: 'active',
    url: 'https://adobe.com',
    color: '#5B8DD4',
    createdAt: '2026-01-01',
  },
  {
    id: '4',
    name: 'GitHub Copilot',
    amount: 10.00,
    currency: 'USD',
    billingCycle: 'monthly',
    category: '開発ツール',
    nextBillingDate: '2026-03-05',
    status: 'active',
    url: 'https://github.com',
    color: '#5BD4A8',
    createdAt: '2026-01-01',
  },
  {
    id: '5',
    name: 'iCloud+ 200GB',
    amount: 400,
    currency: 'JPY',
    billingCycle: 'monthly',
    category: 'クラウド・ストレージ',
    nextBillingDate: '2026-03-25',
    status: 'active',
    url: 'https://icloud.com',
    color: '#5BA8D4',
    createdAt: '2026-01-01',
  },
  {
    id: '6',
    name: 'Nintendo Switch Online',
    amount: 2400,
    currency: 'JPY',
    billingCycle: 'yearly',
    category: 'ゲーム',
    nextBillingDate: '2027-01-01',
    status: 'active',
    url: 'https://nintendo.com',
    color: '#D4875B',
    createdAt: '2026-01-01',
  },
];
