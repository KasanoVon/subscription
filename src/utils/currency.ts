import type { Currency, BillingCycle, Subscription } from '../types';

// 為替レート: 1 USD = JPY
export const DEFAULT_EXCHANGE_RATE = 150;

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rate: number = DEFAULT_EXCHANGE_RATE
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'JPY') return amount * rate;
  if (from === 'JPY' && to === 'USD') return amount / rate;
  return amount;
}

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'JPY') {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// 為替レートの表示用。表示通貨に合わせて向きを変える
//   JPY: 1 USD あたりの円（￥157.82）
//   USD: 100 円あたりのドル（$0.6336）
// formatCurrency は JPY を整数に、USD を小数2桁に丸めるため別途用意。
// USD 側は2桁だと ¥1 程度の変動が見えない（0.633→0.629）ので4桁にする
export function formatExchangeRate(rate: number, display: Currency): string {
  if (display === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(100 / rate);
  }
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function toMonthlyAmount(
  amount: number,
  billingCycle: BillingCycle,
  customCycleDays?: number
): number {
  switch (billingCycle) {
    case 'weekly':
      return amount * 52 / 12;
    case 'monthly':
      return amount;
    case 'yearly':
      return amount / 12;
    case 'custom':
      return customCycleDays && customCycleDays > 0 ? amount * 30 / customCycleDays : amount;
  }
}

export function toYearlyAmount(
  amount: number,
  billingCycle: BillingCycle,
  customCycleDays?: number
): number {
  switch (billingCycle) {
    case 'weekly':
      return amount * 52;
    case 'monthly':
      return amount * 12;
    case 'yearly':
      return amount;
    case 'custom':
      return customCycleDays && customCycleDays > 0 ? amount * 365 / customCycleDays : amount * 12;
  }
}

export function billingCycleLabel(cycle: BillingCycle, customCycleDays?: number): string {
  switch (cycle) {
    case 'weekly':
      return '週払い';
    case 'monthly':
      return '月払い';
    case 'yearly':
      return '年払い';
    case 'custom':
      return customCycleDays ? `${customCycleDays}日ごと` : 'カスタム';
  }
}

type BillableSub = Pick<Subscription, 'amount' | 'currency' | 'billingCycle' | 'customCycleDays'>;

// 1件のサブスクの月額を、指定した通貨に換算して返す
export function monthlyAmountIn(sub: BillableSub, currency: Currency, rate: number): number {
  return toMonthlyAmount(convertCurrency(sub.amount, sub.currency, currency, rate), sub.billingCycle, sub.customCycleDays);
}

// 月額の合計（指定した通貨）
export function monthlyTotal(subs: BillableSub[], currency: Currency, rate: number): number {
  return subs.reduce((sum, s) => sum + monthlyAmountIn(s, currency, rate), 0);
}

export interface GroupTotal {
  key: string;
  total: number;
  count: number;
}

// キーごとに月額を合計し、金額の多い順に並べる（カテゴリ別・支払い方法別の内訳用）
export function groupMonthlyTotals<T extends BillableSub>(
  subs: T[],
  keyOf: (sub: T) => string,
  currency: Currency,
  rate: number
): GroupTotal[] {
  const groups = new Map<string, GroupTotal>();
  for (const s of subs) {
    const key = keyOf(s);
    const g = groups.get(key) ?? { key, total: 0, count: 0 };
    g.total += monthlyAmountIn(s, currency, rate);
    g.count += 1;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}
