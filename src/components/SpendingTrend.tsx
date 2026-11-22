import { useState } from 'react';
import type { Currency, MonthlySnapshot } from '../types';
import { formatCurrency } from '../utils/currency';
import { todayISOString } from '../utils/date';
import { buildMonthlySeries, type MonthlyPoint } from '../utils/history';

// 今月を濃く、過去の月を灰色にする（今月には金額と「今月」も添えるので色だけに頼らない）
const CURRENT_COLOR = 'var(--ink)';
const PAST_COLOR = '#8A8981'; // 背景 #FDFDF5 とのコントラスト 3:1 以上
const CHART_HEIGHT = 140;

function monthLabel(month: string) {
  const [y, m] = month.split('-');
  return `${y}年${Number(m)}月`;
}

function tickLabel(value: number, currency: Currency) {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'ja-JP', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// 目盛りの上限と間隔を、1・2・5 の倍数のきりのいい数にする
function niceScale(max: number) {
  if (max <= 0) return { top: 1, step: 1 };
  const rough = max / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((f) => f * pow).find((s) => s >= rough) ?? 10 * pow;
  return { top: Math.ceil(max / step) * step, step };
}

interface SpendingTrendProps {
  history: MonthlySnapshot[] | undefined;
  currency: Currency;
}

export function SpendingTrend({ history, currency }: SpendingTrendProps) {
  const currentMonth = todayISOString().slice(0, 7);
  const points = buildMonthlySeries(history, currentMonth, currency);
  const [focused, setFocused] = useState<string | null>(null);

  if (points.length === 0) return null;

  const card = (children: React.ReactNode) => (
    <div className="p-card p-card--flat" style={{ border: '1.5px solid var(--ink)', gridColumn: '1 / -1' }}>
      <h2 className="p-heading p-heading--sm" style={{ marginBottom: '4px' }}>
        📈 月額の推移
      </h2>
      {children}
    </div>
  );

  if (points.length < 2) {
    return card(
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)', lineHeight: 1.6 }}>
        毎月、その月の月額合計を記録しています（記録開始：{monthLabel(points[0].month)}）。
        推移のグラフは来月から表示されます。
      </p>
    );
  }

  const values = points.map((p) => p.value ?? 0);
  const { top, step } = niceScale(Math.max(...values));
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);

  const shown: MonthlyPoint = points.find((p) => p.month === focused) ?? points[points.length - 1];
  const hasGap = points.some((p) => p.value === null);

  return card(
    <>
      <p style={{ fontSize: '0.8rem', color: 'var(--ink-light)', marginBottom: '10px' }}>
        直近 {points.length} か月の月額合計（{currency === 'USD' ? 'ドル' : '円'}）
      </p>

      {/* 選択中の月の読み上げ（ホバー・フォーカスで切り替わる） */}
      <div aria-live="polite" style={{ marginBottom: '10px', minHeight: '1.4em' }}>
        <span style={{ fontFamily: 'var(--font-sketch)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>
          {shown.value === null ? '記録なし' : formatCurrency(shown.value, currency)}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-light)', marginLeft: '8px' }}>
          {monthLabel(shown.month)}
          {shown.month === currentMonth && '（今月）'}
          {shown.value === null && '・アプリを開かなかった月'}
        </span>
      </div>

      {/* 上の余白は、今月の棒が最大のときに上に付く金額ラベルの分 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
        {/* Y 軸の目盛り */}
        <div style={{ position: 'relative', height: CHART_HEIGHT, width: '56px', flexShrink: 0 }} aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              style={{
                position: 'absolute',
                right: 0,
                bottom: `${(t / top) * 100}%`,
                transform: 'translateY(50%)',
                fontSize: '0.7rem',
                color: 'var(--ink-light)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {tickLabel(t, currency)}
            </span>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 棒グラフ本体 */}
          <div style={{ position: 'relative', height: CHART_HEIGHT }}>
            {ticks.map((t) => (
              <div
                key={t}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${(t / top) * 100}%`,
                  borderTop: `1px solid ${t === 0 ? 'var(--pencil-line)' : 'var(--paper-darker)'}`,
                }}
              />
            ))}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
              {points.map((p) => {
                const isCurrent = p.month === currentMonth;
                const isFocused = p.month === shown.month;
                const height = p.value === null ? 0 : Math.max((p.value / top) * 100, p.value > 0 ? 1 : 0);
                return (
                  <button
                    key={p.month}
                    type="button"
                    aria-label={`${monthLabel(p.month)} ${p.value === null ? '記録なし' : formatCurrency(p.value, currency)}`}
                    onMouseEnter={() => setFocused(p.month)}
                    onMouseLeave={() => setFocused(null)}
                    onFocus={() => setFocused(p.month)}
                    onBlur={() => setFocused(null)}
                    onClick={() => setFocused(p.month)}
                    style={{
                      flex: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      background: isFocused && focused ? 'rgba(44, 43, 38, 0.05)' : 'transparent',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                  >
                    {isCurrent && p.value !== null && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontFamily: 'var(--font-sketch)',
                          fontWeight: 700,
                          color: 'var(--ink)',
                          whiteSpace: 'nowrap',
                          marginBottom: '2px',
                        }}
                      >
                        {tickLabel(p.value, currency)}
                      </span>
                    )}
                    {p.value === null ? (
                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-faint)', marginBottom: '2px' }}>—</span>
                    ) : (
                      <span
                        style={{
                          display: 'block',
                          width: '100%',
                          maxWidth: '24px',
                          height: `${height}%`,
                          background: isCurrent ? CURRENT_COLOR : PAST_COLOR,
                          borderRadius: '4px 4px 0 0',
                          opacity: focused && !isFocused ? 0.55 : 1,
                          transition: 'opacity 0.12s',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* X 軸の月 */}
          <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }} aria-hidden="true">
            {points.map((p, i) => {
              const [y, m] = p.month.split('-');
              const showYear = i === 0 || m === '01';
              return (
                <span
                  key={p.month}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.68rem',
                    lineHeight: 1.2,
                    color: p.month === currentMonth ? 'var(--ink)' : 'var(--ink-light)',
                    fontWeight: p.month === currentMonth ? 700 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                >
                  {Number(m)}月
                  {showYear && <span style={{ display: 'block', color: 'var(--ink-faint)' }}>{y}</span>}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {hasGap && (
        <p style={{ fontSize: '0.75rem', color: 'var(--ink-faint)', marginTop: '8px' }}>
          ※ 「—」の月は、アプリを開かなかったため記録がありません
        </p>
      )}

      <details style={{ marginTop: '10px' }}>
        <summary style={{ fontSize: '0.8rem', color: 'var(--ink-light)', cursor: 'pointer' }}>表で見る</summary>
        <table style={{ width: '100%', marginTop: '6px', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: 'var(--ink-light)', textAlign: 'left' }}>
              <th style={{ fontWeight: 400, padding: '4px 0' }}>月</th>
              <th style={{ fontWeight: 400, padding: '4px 0', textAlign: 'right' }}>月額合計</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.month} style={{ borderTop: '1px dashed var(--paper-darker)' }}>
                <td style={{ padding: '4px 0' }}>
                  {monthLabel(p.month)}
                  {p.month === currentMonth && '（今月）'}
                </td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {p.value === null ? '記録なし' : formatCurrency(p.value, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
