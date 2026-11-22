import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDate,
  formatDateShort,
  daysUntil,
  isOverdue,
  isUpcomingSoon,
  nextBillingDate,
  todayISOString,
} from './date';

// vitest.config.ts でタイムゾーンを Asia/Tokyo に固定している
function setNow(isoWithOffset: string) {
  vi.setSystemTime(new Date(isoWithOffset));
}

beforeEach(() => {
  vi.useFakeTimers();
  setNow('2026-11-23T10:00:00+09:00');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDate / formatDateShort', () => {
  it('日本語の日付に整形する', () => {
    expect(formatDate('2026-03-05')).toBe('2026年3月5日');
    expect(formatDateShort('2026-03-05')).toBe('3/5');
  });
});

describe('daysUntil', () => {
  it('今日は0、明日は1、昨日は-1', () => {
    expect(daysUntil('2026-11-23')).toBe(0);
    expect(daysUntil('2026-11-24')).toBe(1);
    expect(daysUntil('2026-11-22')).toBe(-1);
  });

  it('時刻に関係なく日付単位で数える', () => {
    setNow('2026-11-23T23:59:00+09:00');
    expect(daysUntil('2026-11-24')).toBe(1);
    setNow('2026-11-23T00:01:00+09:00');
    expect(daysUntil('2026-11-23')).toBe(0);
  });

  it('月や年をまたいでも数えられる', () => {
    expect(daysUntil('2026-12-01')).toBe(8);
    expect(daysUntil('2027-01-01')).toBe(39);
  });
});

describe('isOverdue', () => {
  it('更新日当日はまだ期限超過ではない（請求前に日付が繰り上がらない）', () => {
    expect(isOverdue('2026-11-23')).toBe(false);
    setNow('2026-11-23T23:59:00+09:00');
    expect(isOverdue('2026-11-23')).toBe(false);
  });

  it('前日以前は期限超過', () => {
    expect(isOverdue('2026-11-22')).toBe(true);
    expect(isOverdue('2025-01-01')).toBe(true);
  });

  it('未来は期限超過ではない', () => {
    expect(isOverdue('2026-11-24')).toBe(false);
  });
});

describe('isUpcomingSoon', () => {
  it('明日から7日以内なら true', () => {
    expect(isUpcomingSoon('2026-11-24')).toBe(true);
    expect(isUpcomingSoon('2026-11-30')).toBe(true);
  });

  it('8日以上先・過去は false', () => {
    expect(isUpcomingSoon('2026-12-01')).toBe(false);
    expect(isUpcomingSoon('2026-11-22')).toBe(false);
  });

  it('日数を指定できる', () => {
    expect(isUpcomingSoon('2026-11-26', 3)).toBe(true);
    expect(isUpcomingSoon('2026-11-27', 3)).toBe(false);
  });
});

describe('nextBillingDate', () => {
  it('週・月・年・カスタムの周期で進める', () => {
    expect(nextBillingDate('2026-11-23', 'weekly')).toBe('2026-11-30');
    expect(nextBillingDate('2026-11-23', 'monthly')).toBe('2026-12-23');
    expect(nextBillingDate('2026-11-23', 'yearly')).toBe('2027-11-23');
    expect(nextBillingDate('2026-11-23', 'custom', 45)).toBe('2027-01-07');
  });

  it('カスタム周期で日数がなければ30日', () => {
    expect(nextBillingDate('2026-11-23', 'custom')).toBe('2026-12-23');
  });

  it('月末は翌月の末日に丸める', () => {
    expect(nextBillingDate('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(nextBillingDate('2028-01-31', 'monthly')).toBe('2028-02-29');
    expect(nextBillingDate('2026-03-31', 'monthly')).toBe('2026-04-30');
  });

  it('うるう日の年払いは翌年2/28', () => {
    expect(nextBillingDate('2028-02-29', 'yearly')).toBe('2029-02-28');
  });

  it('年をまたぐ', () => {
    expect(nextBillingDate('2026-12-31', 'monthly')).toBe('2027-01-31');
    expect(nextBillingDate('2026-12-28', 'weekly')).toBe('2027-01-04');
  });
});

describe('todayISOString', () => {
  it('端末のローカル日付を返す（UTC ではない）', () => {
    expect(todayISOString()).toBe('2026-11-23');
    // 日本時間 0:30 は UTC ではまだ前日 15:30
    setNow('2026-11-24T00:30:00+09:00');
    expect(todayISOString()).toBe('2026-11-24');
  });
});
