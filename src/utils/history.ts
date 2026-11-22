import type { Currency, MonthlySnapshot } from '../types';

const MAX_MONTHS_KEPT = 36;

// 'YYYY-MM' の月を n か月ずらす
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// その月の記録を追加・上書きする。変化がなければ同じ配列を返す（無駄な保存を防ぐ）
export function upsertSnapshot(history: MonthlySnapshot[] | undefined, snapshot: MonthlySnapshot): MonthlySnapshot[] {
  const list = history ?? [];
  const existing = list.find((h) => h.month === snapshot.month);
  if (existing && existing.totalJPY === snapshot.totalJPY && existing.rate === snapshot.rate) return list;
  return [...list.filter((h) => h.month !== snapshot.month), snapshot]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-MAX_MONTHS_KEPT);
}

export interface MonthlyPoint {
  month: string;
  value: number | null; // 記録がない月は null
}

// 今月までの直近 months か月を、表示通貨の金額で返す。
// 最初の記録より前の月は含めない。途中で記録がない月は null（アプリを開かなかった月）
export function buildMonthlySeries(
  history: MonthlySnapshot[] | undefined,
  currentMonth: string,
  currency: Currency,
  months = 12
): MonthlyPoint[] {
  const list = (history ?? []).filter((h) => h.month <= currentMonth);
  if (list.length === 0) return [];
  const byMonth = new Map(list.map((h) => [h.month, h]));
  const first = list.reduce((min, h) => (h.month < min ? h.month : min), list[0].month);
  const start = [shiftMonth(currentMonth, -(months - 1)), first].sort()[1];

  const points: MonthlyPoint[] = [];
  for (let m = start; m <= currentMonth; m = shiftMonth(m, 1)) {
    const h = byMonth.get(m);
    const value = !h ? null : currency === 'USD' ? (h.rate > 0 ? h.totalJPY / h.rate : null) : h.totalJPY;
    points.push({ month: m, value });
  }
  return points;
}
