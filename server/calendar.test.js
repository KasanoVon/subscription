import { describe, it, expect } from 'vitest';
import { buildCalendar, upcomingBillingDates, escapeText, foldLine } from './calendar.js';

const today = '2026-11-23';
const now = new Date('2026-11-22T16:00:00Z');

function unfold(ics) {
  return ics.replace(/\r\n /g, '');
}

function events(ics) {
  return unfold(ics).split('BEGIN:VEVENT').slice(1).map((block) => {
    const get = (key) => block.match(new RegExp(`^${key}[;:](.*)$`, 'm'))?.[1];
    return { uid: get('UID'), start: get('DTSTART'), end: get('DTEND'), summary: get('SUMMARY'), description: get('DESCRIPTION') };
  });
}

describe('upcomingBillingDates', () => {
  const horizon = '2027-11-23';

  it('月払いは今日以降の毎月の日付を1年先まで出す', () => {
    const dates = upcomingBillingDates({ nextBillingDate: '2026-11-24', billingCycle: 'monthly' }, today, horizon);
    expect(dates[0]).toBe('2026-11-24');
    expect(dates.at(-1)).toBe('2027-10-24');
    expect(dates).toHaveLength(12);
  });

  it('保存日付が過去でも今日以降から始める', () => {
    const dates = upcomingBillingDates({ nextBillingDate: '2026-09-24', billingCycle: 'monthly' }, today, horizon);
    expect(dates[0]).toBe('2026-11-24');
  });

  it('更新日当日も含める', () => {
    const dates = upcomingBillingDates({ nextBillingDate: '2026-11-23', billingCycle: 'yearly' }, today, horizon);
    expect(dates).toEqual(['2026-11-23', '2027-11-23']);
  });

  it('月末は丸めて繰り返す', () => {
    const dates = upcomingBillingDates({ nextBillingDate: '2027-01-31', billingCycle: 'monthly' }, today, '2027-04-30');
    expect(dates).toEqual(['2027-01-31', '2027-02-28', '2027-03-28', '2027-04-28']);
  });

  it('週払い・カスタム周期', () => {
    expect(upcomingBillingDates({ nextBillingDate: '2026-11-23', billingCycle: 'weekly' }, today, horizon)).toHaveLength(53);
    expect(upcomingBillingDates({ nextBillingDate: '2026-11-23', billingCycle: 'custom', customCycleDays: 90 }, today, horizon))
      .toEqual(['2026-11-23', '2027-02-21', '2027-05-22', '2027-08-20', '2027-11-18']);
  });

  it('日付がない・周期が不明なら何も出さない', () => {
    expect(upcomingBillingDates({ billingCycle: 'monthly' }, today, horizon)).toEqual([]);
    expect(upcomingBillingDates({ nextBillingDate: '2026-12-01', billingCycle: 'unknown' }, today, horizon)).toEqual(['2026-12-01']);
  });
});

describe('escapeText', () => {
  it('カンマ・セミコロン・バックスラッシュ・改行をエスケープする', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
});

describe('foldLine', () => {
  it('75オクテットを超える行を折り返し、日本語の途中で割らない', () => {
    const line = `SUMMARY:${'あ'.repeat(60)}`;
    const folded = foldLine(line);
    for (const part of folded.split('\r\n')) {
      expect(Buffer.byteLength(part, 'utf8')).toBeLessThanOrEqual(75);
    }
    expect(folded.split('\r\n').slice(1).every((p) => p.startsWith(' '))).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('短い行はそのまま', () => {
    expect(foldLine('VERSION:2.0')).toBe('VERSION:2.0');
  });
});

describe('buildCalendar', () => {
  const state = {
    exchangeRate: 157.82,
    subscriptions: [
      { id: 'a1', name: 'Netflix', amount: 1490, currency: 'JPY', billingCycle: 'monthly', status: 'active', nextBillingDate: '2026-11-24', paymentMethod: '楽天カード' },
      { id: 'b2', name: 'Spotify', amount: 9.99, currency: 'USD', billingCycle: 'yearly', status: 'active', nextBillingDate: '2027-01-10' },
      { id: 'c3', name: '停止中', amount: 500, currency: 'JPY', billingCycle: 'monthly', status: 'paused', nextBillingDate: '2026-11-24' },
      { id: 'd4', name: 'Hulu, Premium; 家族', amount: 1026, currency: 'JPY', billingCycle: 'yearly', status: 'active', nextBillingDate: '2026-12-01' },
    ],
  };
  const ics = buildCalendar(state, { today, now });

  it('カレンダーの枠と CRLF 改行', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
    expect(ics).toContain('X-WR-CALNAME:SubNote サブスク更新日');
  });

  it('全行が75オクテット以内', () => {
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  it('アクティブなサブスクだけを終日の予定として出す', () => {
    const list = events(ics);
    expect(list.filter((e) => e.summary.startsWith('Netflix'))).toHaveLength(12);
    expect(list.some((e) => e.summary.includes('停止中'))).toBe(false);
    const first = list.find((e) => e.uid === 'a1-20261124@subnote');
    expect(first.start).toBe('VALUE=DATE:20261124');
    expect(first.end).toBe('VALUE=DATE:20261125');
    expect(first.summary).toBe('Netflix 更新（￥1\\,490）');
    expect(first.description).toContain('支払い方法: 楽天カード');
  });

  it('ドルは円の概算を添える', () => {
    const spotify = events(ics).find((e) => e.uid === 'b2-20270110@subnote');
    expect(spotify.summary).toBe('Spotify 更新（$9.99（約￥1\\,577））');
  });

  it('名前の記号はエスケープされる', () => {
    expect(events(ics).find((e) => e.uid === 'd4-20261201@subnote').summary).toBe('Hulu\\, Premium\\; 家族 更新（￥1\\,026）');
  });

  it('前日9時のリマインダーを付ける', () => {
    expect(ics).toContain('TRIGGER:-PT15H');
  });

  it('同じ入力なら同じ UID（カレンダー側で重複しない）', () => {
    const again = buildCalendar(state, { today, now: new Date('2026-11-23T10:00:00Z') });
    expect(events(again).map((e) => e.uid)).toEqual(events(ics).map((e) => e.uid));
  });

  it('サブスクがなくても有効なカレンダーを返す', () => {
    const empty = buildCalendar({}, { today, now });
    expect(empty).toContain('BEGIN:VCALENDAR');
    expect(empty).not.toContain('BEGIN:VEVENT');
  });
});
