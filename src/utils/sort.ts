import type { Currency, Subscription } from '../types';
import { monthlyAmountIn } from './currency';

export type SortKey = 'manual' | 'nextBilling' | 'amount' | 'name';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'manual', label: '手動（ドラッグ）' },
  { value: 'nextBilling', label: '更新日が近い順' },
  { value: 'amount', label: '金額が高い順' },
  { value: 'name', label: '名前順' },
];

const byName = (a: Subscription, b: Subscription) => a.name.localeCompare(b.name, 'ja');

// 一覧の並べ替え。manual は保存されている順（ドラッグで決めた順）のまま
export function sortSubscriptions(
  subs: Subscription[],
  key: SortKey,
  currency: Currency,
  rate: number
): Subscription[] {
  switch (key) {
    case 'nextBilling':
      return [...subs].sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate) || byName(a, b));
    case 'amount':
      // 請求サイクルや通貨が違っても比べられるよう、表示通貨の月額に換算して比べる
      return [...subs].sort(
        (a, b) => monthlyAmountIn(b, currency, rate) - monthlyAmountIn(a, currency, rate) || byName(a, b)
      );
    case 'name':
      return [...subs].sort(byName);
    default:
      return subs;
  }
}

export function isSortKey(value: unknown): value is SortKey {
  return SORT_OPTIONS.some((o) => o.value === value);
}
