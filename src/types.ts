export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export type Currency = 'JPY' | 'USD';
export type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'custom';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  customCycleDays?: number;
  category: string;
  nextBillingDate: string;
  status: SubscriptionStatus;
  paymentMethod?: string;
  notes?: string;
  url?: string;
  color: string;
  createdAt: string;
}

export interface AppState {
  subscriptions: Subscription[];
  displayCurrency: Currency;
  exchangeRate: number;
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
  エンタメ: '#D45B5B',
  音楽: '#A05BD4',
  仕事・生産性: '#5B8DD4',
  クラウド・ストレージ: '#5BA8D4',
  開発ツール: '#5BD4A8',
  ゲーム: '#D4875B',
  ニュース・学習: '#D4C85B',
  ユーティリティ: '#8BD45B',
  その他: '#8B8B8B',
};
