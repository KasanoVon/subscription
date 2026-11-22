import { describe, it, expect } from 'vitest';
import { addDaysToDateStr, getTodayJST, addMonthsToDateStr, advanceToCurrent } from './dates.js';
import { nextBillingDate } from '../src/utils/date';

describe('addDaysToDateStr', () => {
  it('月・年をまたいで日数を足す', () => {
    expect(addDaysToDateStr('2026-11-23', 1)).toBe('2026-11-24');
    expect(addDaysToDateStr('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysToDateStr('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDateStr('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToDateStr('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('getTodayJST', () => {
  it('UTC の時刻を日本時間の日付にする', () => {
    expect(getTodayJST(new Date('2026-11-22T14:59:00Z'))).toBe('2026-11-22');
    expect(getTodayJST(new Date('2026-11-22T15:00:00Z'))).toBe('2026-11-23');
  });
});

describe('addMonthsToDateStr', () => {
  it('月末は移動先の月の末日に丸める', () => {
    expect(addMonthsToDateStr('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDateStr('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsToDateStr('2026-08-31', 1)).toBe('2026-09-30');
    expect(addMonthsToDateStr('2028-02-29', 12)).toBe('2029-02-28');
    expect(addMonthsToDateStr('2026-12-15', 1)).toBe('2027-01-15');
  });
});

describe('advanceToCurrent', () => {
  const today = '2026-11-23';

  it('今日以降の日付はそのまま', () => {
    expect(advanceToCurrent('2026-11-24', 'monthly', undefined, today)).toBe('2026-11-24');
    expect(advanceToCurrent('2027-05-01', 'yearly', undefined, today)).toBe('2027-05-01');
  });

  it('更新日当日は進めない（当日の通知・表示が消えない）', () => {
    expect(advanceToCurrent('2026-11-23', 'monthly', undefined, today)).toBe('2026-11-23');
  });

  it('過去の日付は周期ぶん進めて今日以降にする', () => {
    expect(advanceToCurrent('2026-09-24', 'monthly', undefined, today)).toBe('2026-11-24');
    expect(advanceToCurrent('2026-11-10', 'weekly', undefined, today)).toBe('2026-11-24');
    expect(advanceToCurrent('2025-11-24', 'yearly', undefined, today)).toBe('2026-11-24');
    expect(advanceToCurrent('2026-10-25', 'custom', 30, today)).toBe('2026-11-24');
  });

  it('カスタム周期で日数がなければ30日', () => {
    expect(advanceToCurrent('2026-10-25', 'custom', undefined, today)).toBe('2026-11-24');
  });

  it('月末の丸めは繰り返し適用される（1/31 → 2/28 → 3/28 …）', () => {
    expect(advanceToCurrent('2026-01-31', 'monthly', undefined, '2026-04-15')).toBe('2026-04-28');
  });

  it('不明な周期はそのまま返す', () => {
    expect(advanceToCurrent('2020-01-01', 'unknown', undefined, today)).toBe('2020-01-01');
  });

  it('アプリ（src/utils/date.ts）と同じ日付に進める', () => {
    // クライアントは isOverdue（今日より前）の間 nextBillingDate を繰り返す
    const client = (date, cycle, days) => {
      let d = date;
      for (let i = 0; d < today && i < 1000; i++) d = nextBillingDate(d, cycle, days);
      return d;
    };
    const cycles = [
      ['weekly'], ['monthly'], ['yearly'], ['custom', 14], ['custom', 45], ['custom', undefined],
    ];
    let checked = 0;
    for (let start = '2024-01-01'; start <= '2027-03-01'; start = addDaysToDateStr(start, 11)) {
      for (const [cycle, days] of cycles) {
        expect(advanceToCurrent(start, cycle, days, today), `${start} ${cycle} ${days}`).toBe(
          client(start, cycle, days)
        );
        checked++;
      }
    }
    for (const monthEnd of ['2024-01-31', '2024-02-29', '2025-03-31', '2025-08-31', '2026-01-31']) {
      expect(advanceToCurrent(monthEnd, 'monthly', undefined, today)).toBe(client(monthEnd, 'monthly'));
    }
    expect(checked).toBeGreaterThan(500);
  });
});
