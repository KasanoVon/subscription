// サブスクの更新日を iCalendar（ICS, RFC 5545）形式で配信するための組み立て処理。
// Google カレンダーや iPhone のカレンダーが URL を定期的に読みに来る。
import { addDaysToDateStr, addMonthsToDateStr, advanceToCurrent } from './dates.js';

const HORIZON_MONTHS = 12; // 何か月先まで予定を出すか
const MAX_EVENTS_PER_SUB = 400;

// 次の請求日。クライアントの nextBillingDate（src/utils/date.ts）と同じ進め方
function stepDate(dateStr, cycle, customCycleDays) {
  switch (cycle) {
    case 'weekly': return addDaysToDateStr(dateStr, 7);
    case 'monthly': return addMonthsToDateStr(dateStr, 1);
    case 'yearly': return addMonthsToDateStr(dateStr, 12);
    case 'custom': return addDaysToDateStr(dateStr, customCycleDays || 30);
    default: return null;
  }
}

// 今日から horizon（含む）までの請求日を列挙する
export function upcomingBillingDates(sub, today, horizonEnd) {
  if (typeof sub.nextBillingDate !== 'string') return [];
  const dates = [];
  let date = advanceToCurrent(sub.nextBillingDate, sub.billingCycle, sub.customCycleDays, today);
  while (date && date <= horizonEnd && dates.length < MAX_EVENTS_PER_SUB) {
    if (date >= today) dates.push(date);
    date = stepDate(date, sub.billingCycle, sub.customCycleDays);
  }
  return dates;
}

// TEXT 値のエスケープ（RFC 5545 3.3.11）
export function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// 1行75オクテットで折り返す（RFC 5545 3.1）。日本語が途中で割れないよう文字単位で数える
export function foldLine(line) {
  const parts = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = Buffer.byteLength(ch, 'utf8');
    if (bytes + size > limit) {
      parts.push(current);
      current = ' ';
      bytes = 1;
      limit = 75;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

function formatAmount(amount, currency) {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount);
}

function amountLabel(sub, exchangeRate) {
  const base = formatAmount(Number(sub.amount) || 0, sub.currency);
  if (sub.currency === 'USD' && typeof exchangeRate === 'number' && exchangeRate > 0) {
    return `${base}（約${formatAmount((Number(sub.amount) || 0) * exchangeRate, 'JPY')}）`;
  }
  return base;
}

function cycleLabel(cycle, customCycleDays) {
  switch (cycle) {
    case 'weekly': return '週払い';
    case 'monthly': return '月払い';
    case 'yearly': return '年払い';
    case 'custom': return customCycleDays ? `${customCycleDays}日ごと` : 'カスタム';
    default: return '';
  }
}

const compactDate = (dateStr) => dateStr.replace(/-/g, '');

function utcStamp(now) {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// UID は同じサブスク・同じ日付なら毎回同じにする（カレンダー側で重複しないように）
function eventUid(sub, index, date) {
  const id = String(sub.id ?? `idx${index}`).replace(/[^A-Za-z0-9_-]/g, '');
  return `${id || `idx${index}`}-${compactDate(date)}@subnote`;
}

export function buildCalendar(state, { today, now = new Date(), appUrl = 'https://subnote.up.railway.app/app' }) {
  const horizonEnd = addMonthsToDateStr(today, HORIZON_MONTHS);
  const stamp = utcStamp(now);
  const exchangeRate = state?.exchangeRate;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SubNote//Subscription Renewals//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:SubNote サブスク更新日',
    'X-WR-TIMEZONE:Asia/Tokyo',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ];

  (state?.subscriptions ?? []).forEach((sub, index) => {
    if (sub.status !== 'active') return;
    const amount = amountLabel(sub, exchangeRate);
    const description = [
      `金額: ${amount}`,
      `請求サイクル: ${cycleLabel(sub.billingCycle, sub.customCycleDays)}`,
      sub.paymentMethod ? `支払い方法: ${sub.paymentMethod}` : null,
      appUrl,
    ].filter(Boolean).join('\n');

    for (const date of upcomingBillingDates(sub, today, horizonEnd)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${eventUid(sub, index, date)}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compactDate(date)}`,
        `DTEND;VALUE=DATE:${compactDate(addDaysToDateStr(date, 1))}`,
        `SUMMARY:${escapeText(`${sub.name} 更新（${amount}）`)}`,
        `DESCRIPTION:${escapeText(description)}`,
        'TRANSP:TRANSPARENT',
        // 終日の予定の開始（当日 0:00）の15時間前 = 前日 9:00 に通知
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(`明日 ${sub.name} が更新されます（${amount}）`)}`,
        'TRIGGER:-PT15H',
        'END:VALARM',
        'END:VEVENT'
      );
    }
  });

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
