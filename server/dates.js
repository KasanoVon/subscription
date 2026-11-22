// サーバー側の日付計算。日付は 'YYYY-MM-DD' 文字列で扱い、タイムゾーンの影響を受けないよう UTC で計算する。

export function addDaysToDateStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getTodayJST(now = new Date()) {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

// date-fns の addMonths と同じく、月末は移動先の月の末日に丸める（1/31 → 2/28）
export function addMonthsToDateStr(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

// 保存済みの次回更新日が今日より前なら、周期ぶん進めて今日以降にする。
// クライアントの advanceOverdueDates（src/context/AppContext.tsx）と同じ処理。
// 日付はアプリを開いたときにしか進まないため、しばらく開いていないと
// 保存データの日付が過去のまま残り、通知の判定から漏れてしまう。
export function advanceToCurrent(dateStr, cycle, customCycleDays, today) {
  let date = dateStr;
  for (let i = 0; date < today && i < 1000; i++) {
    switch (cycle) {
      case 'weekly': date = addDaysToDateStr(date, 7); break;
      case 'monthly': date = addMonthsToDateStr(date, 1); break;
      case 'yearly': date = addMonthsToDateStr(date, 12); break;
      case 'custom': date = addDaysToDateStr(date, customCycleDays || 30); break;
      default: return date;
    }
  }
  return date;
}
