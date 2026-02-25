import type { Currency, BillingCycle } from '../types';

// 為替レート: 1 USD = JPY
// 本番環境では外部APIから取得することを推奨
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

// 年間コストに換算 (表示通貨)
export function toMonthlyAmount(
  amount: number,
  billingCycle: BillingCycle
): number {
  switch (billingCycle) {
    case 'weekly':
      return amount * 52 / 12;
    case 'monthly':
      return amount;
    case 'yearly':
      return amount / 12;
  }
}

export function toYearlyAmount(
  amount: number,
  billingCycle: BillingCycle
): number {
  switch (billingCycle) {
    case 'weekly':
      return amount * 52;
    case 'monthly':
      return amount * 12;
    case 'yearly':
      return amount;
  }
}

export function billingCycleLabel(cycle: BillingCycle): string {
  switch (cycle) {
    case 'weekly':
      return '週払い';
    case 'monthly':
      return '月払い';
    case 'yearly':
      return '年払い';
  }
}
