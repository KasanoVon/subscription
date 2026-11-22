import { describe, it, expect } from 'vitest';
import { sortSubscriptions, isSortKey } from './sort';
import type { Subscription } from '../types';

function sub(id: string, name: string, nextBillingDate: string, amount: number, currency: 'JPY' | 'USD', billingCycle: Subscription['billingCycle'] = 'monthly'): Subscription {
  return { id, name, nextBillingDate, amount, currency, billingCycle, category: 'その他', status: 'active', color: '#000', createdAt: '2026-01-01' };
}

const subs = [
  sub('a', 'Spotify', '2026-12-05', 9.99, 'USD'), // 約 ￥1,499/月
  sub('b', 'Netflix', '2026-11-24', 1490, 'JPY'),
  sub('c', 'Adobe', '2027-01-10', 30000, 'JPY', 'yearly'), // ￥2,500/月
  sub('d', 'あとで', '2026-11-24', 500, 'JPY'),
];

const ids = (list: Subscription[]) => list.map((s) => s.id);

describe('sortSubscriptions', () => {
  it('manual は保存順のまま', () => {
    expect(ids(sortSubscriptions(subs, 'manual', 'JPY', 150))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('更新日が近い順（同じ日は名前順）', () => {
    expect(ids(sortSubscriptions(subs, 'nextBilling', 'JPY', 150))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('金額が高い順は、通貨と請求サイクルをそろえた月額で比べる', () => {
    expect(ids(sortSubscriptions(subs, 'amount', 'JPY', 150))).toEqual(['c', 'a', 'b', 'd']);
    // レートが下がると Spotify の円換算が Netflix を下回る
    expect(ids(sortSubscriptions(subs, 'amount', 'JPY', 140))).toEqual(['c', 'b', 'a', 'd']);
  });

  it('名前順', () => {
    expect(ids(sortSubscriptions(subs, 'name', 'JPY', 150))).toEqual(['c', 'b', 'a', 'd']);
  });

  it('元の配列を書き換えない', () => {
    const copy = [...subs];
    sortSubscriptions(subs, 'name', 'JPY', 150);
    expect(subs).toEqual(copy);
  });
});

describe('isSortKey', () => {
  it('保存値が正しい並び順か確かめる', () => {
    expect(isSortKey('amount')).toBe(true);
    expect(isSortKey('bogus')).toBe(false);
    expect(isSortKey(null)).toBe(false);
  });
});
