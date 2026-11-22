import { describe, it, expect } from 'vitest';
import { shiftMonth, upsertSnapshot, buildMonthlySeries } from './history';
import type { MonthlySnapshot } from '../types';

describe('shiftMonth', () => {
  it('年をまたいで月をずらす', () => {
    expect(shiftMonth('2026-11', 1)).toBe('2026-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', -11)).toBe('2025-12');
  });
});

describe('upsertSnapshot', () => {
  const base: MonthlySnapshot[] = [
    { month: '2026-09', totalJPY: 9000, rate: 150 },
    { month: '2026-10', totalJPY: 9500, rate: 152 },
  ];

  it('新しい月を追加し、月順に並べる', () => {
    const next = upsertSnapshot(base, { month: '2026-11', totalJPY: 10000, rate: 157.82 });
    expect(next.map((h) => h.month)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('同じ月は上書きする（過去の月はそのまま）', () => {
    const next = upsertSnapshot(base, { month: '2026-10', totalJPY: 9800, rate: 153 });
    expect(next).toEqual([base[0], { month: '2026-10', totalJPY: 9800, rate: 153 }]);
  });

  it('変化がなければ同じ配列を返す（無駄な保存をしない）', () => {
    expect(upsertSnapshot(base, { month: '2026-10', totalJPY: 9500, rate: 152 })).toBe(base);
  });

  it('記録がない状態からも始められる', () => {
    expect(upsertSnapshot(undefined, { month: '2026-11', totalJPY: 1, rate: 150 })).toHaveLength(1);
  });

  it('保存するのは直近36か月まで', () => {
    let list: MonthlySnapshot[] = [];
    for (let i = 0; i < 40; i++) list = upsertSnapshot(list, { month: shiftMonth('2023-01', i), totalJPY: i, rate: 150 });
    expect(list).toHaveLength(36);
    expect(list[0].month).toBe(shiftMonth('2023-01', 4));
  });
});

describe('buildMonthlySeries', () => {
  const history: MonthlySnapshot[] = [
    { month: '2026-08', totalJPY: 9000, rate: 150 },
    { month: '2026-10', totalJPY: 9500, rate: 152 },
    { month: '2026-11', totalJPY: 10000, rate: 160 },
  ];

  it('最初の記録から今月までを並べ、記録のない月は null', () => {
    expect(buildMonthlySeries(history, '2026-11', 'JPY')).toEqual([
      { month: '2026-08', value: 9000 },
      { month: '2026-09', value: null },
      { month: '2026-10', value: 9500 },
      { month: '2026-11', value: 10000 },
    ]);
  });

  it('ドル表示は記録したときのレートで換算する', () => {
    const series = buildMonthlySeries(history, '2026-11', 'USD');
    expect(series[0].value).toBeCloseTo(60);
    expect(series[3].value).toBeCloseTo(62.5);
  });

  it('直近12か月だけにする', () => {
    const long: MonthlySnapshot[] = Array.from({ length: 20 }, (_, i) => ({
      month: shiftMonth('2025-04', i),
      totalJPY: i,
      rate: 150,
    }));
    const series = buildMonthlySeries(long, '2026-11', 'JPY');
    expect(series).toHaveLength(12);
    expect(series[0].month).toBe('2025-12');
    expect(series.at(-1)!.month).toBe('2026-11');
  });

  it('今月の記録がまだなくても今月まで並べる', () => {
    const series = buildMonthlySeries([{ month: '2026-09', totalJPY: 1, rate: 150 }], '2026-11', 'JPY');
    expect(series.map((p) => p.value)).toEqual([1, null, null]);
  });

  it('未来の月の記録は無視し、記録がなければ空', () => {
    expect(buildMonthlySeries([{ month: '2027-01', totalJPY: 1, rate: 150 }], '2026-11', 'JPY')).toEqual([]);
    expect(buildMonthlySeries(undefined, '2026-11', 'JPY')).toEqual([]);
  });
});
