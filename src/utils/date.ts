import { format, differenceInDays, parseISO, isAfter, isBefore, addMonths, addYears, addWeeks, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { BillingCycle } from '../types';

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年M月d日', { locale: ja });
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'M/d', { locale: ja });
}

export function daysUntil(dateStr: string): number {
  const target = parseISO(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(target, today);
}

// 日付単位で比較する。時刻で比較すると更新日当日（請求前）に
// true になり、advanceOverdueDates が日付を繰り上げてしまう。
export function isOverdue(dateStr: string): boolean {
  return daysUntil(dateStr) < 0;
}

export function isUpcomingSoon(dateStr: string, days: number = 7): boolean {
  const target = parseISO(dateStr);
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  return isAfter(target, now) && isBefore(target, future);
}

export function nextBillingDate(
  currentDate: string,
  cycle: BillingCycle,
  customCycleDays?: number
): string {
  const date = parseISO(currentDate);
  switch (cycle) {
    case 'weekly':
      return format(addWeeks(date, 1), 'yyyy-MM-dd');
    case 'monthly':
      return format(addMonths(date, 1), 'yyyy-MM-dd');
    case 'yearly':
      return format(addYears(date, 1), 'yyyy-MM-dd');
    case 'custom':
      return format(addDays(date, customCycleDays ?? 30), 'yyyy-MM-dd');
  }
}

export function todayISOString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
