import { useApp } from '../context/AppContext';
import { convertCurrency, formatCurrency, toMonthlyAmount } from '../utils/currency';
import { daysUntil } from '../utils/date';
import { CATEGORY_COLORS } from '../types';

export function Dashboard() {
  const { state } = useApp();
  const { subscriptions, displayCurrency, exchangeRate } = state;
  const active = subscriptions.filter((s) => s.status === 'active');

  // 月額合計 (表示通貨)
  const totalMonthly = active.reduce((sum, s) => {
    const amountInDisplay = convertCurrency(s.amount, s.currency, displayCurrency, exchangeRate);
    const monthly = toMonthlyAmount(amountInDisplay, s.billingCycle);
    return sum + monthly;
  }, 0);

  // 年間合計
  const totalYearly = totalMonthly * 12;

  // カテゴリ別集計
  const byCategory = active.reduce<Record<string, number>>((acc, s) => {
    const amountInDisplay = convertCurrency(s.amount, s.currency, displayCurrency, exchangeRate);
    const monthly = toMonthlyAmount(amountInDisplay, s.billingCycle);
    acc[s.category] = (acc[s.category] || 0) + monthly;
    return acc;
  }, {});

  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 近い更新日
  const upcoming = subscriptions
    .filter((s) => s.status === 'active')
    .filter((s) => {
      const days = daysUntil(s.nextBillingDate);
      return days >= 0 && days <= 14;
    })
    .sort((a, b) => daysUntil(a.nextBillingDate) - daysUntil(b.nextBillingDate))
    .slice(0, 5);

  return (
    <div style={{ padding: '24px 20px 0' }}>
      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          label="月額合計"
          value={formatCurrency(totalMonthly, displayCurrency)}
          sub={`${active.length} 件のサブスクリプション`}
        />
        <StatCard
          label="年間合計（概算）"
          value={formatCurrency(totalYearly, displayCurrency)}
          sub="月額 × 12 ヶ月"
        />
        <StatCard
          label="アクティブ"
          value={`${active.length}`}
          sub={`停止中 ${subscriptions.filter((s) => s.status === 'paused').length} 件`}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* Category Breakdown */}
        {sortedCategories.length > 0 && (
          <div className="p-card p-card--flat" style={{ border: '1.5px solid var(--ink)' }}>
            <h2 className="p-heading p-heading--sm" style={{ marginBottom: '14px' }}>
              📊 カテゴリ別内訳
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sortedCategories.map(([cat, amount]) => {
                const pct = totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0;
                const color = CATEGORY_COLORS[cat] || '#8B8B8B';
                return (
                  <div key={cat}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-sketch)',
                          fontSize: '0.95rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span
                          className="p-color-dot"
                          style={{ background: color }}
                        />
                        {cat}
                      </span>
                      <span style={{ fontFamily: 'var(--font-sketch)', fontSize: '0.9rem', color: 'var(--ink-light)' }}>
                        {formatCurrency(amount, displayCurrency)}/月
                      </span>
                    </div>
                    <div className="p-category-bar">
                      <div
                        className="p-category-bar__fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Renewals */}
        {upcoming.length > 0 && (
          <div className="p-card p-card--flat" style={{ border: '1.5px solid var(--ink)' }}>
            <h2 className="p-heading p-heading--sm" style={{ marginBottom: '14px' }}>
              🔔 近日の更新 (14日以内)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcoming.map((s) => {
                const days = daysUntil(s.nextBillingDate);
                const urgent = days <= 3;
                const amountDisplay = convertCurrency(s.amount, s.currency, displayCurrency, exchangeRate);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: urgent ? 'var(--red-bg)' : 'var(--paper-warm)',
                      border: `1px solid ${urgent ? 'var(--red)' : 'var(--pencil-line)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="p-color-dot"
                        style={{ background: s.color }}
                      />
                      <span style={{ fontFamily: 'var(--font-sketch)', fontSize: '0.95rem' }}>
                        {s.name}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-sketch)', fontSize: '0.9rem', fontWeight: 700, color: urgent ? 'var(--red)' : 'var(--ink)' }}>
                        {days === 0 ? '今日' : days === 1 ? '明日' : `${days}日後`}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>
                        {formatCurrency(amountDisplay, displayCurrency)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-stat-card">
      <div className="p-stat-card__label">{label}</div>
      <div className="p-stat-card__value">{value}</div>
      {sub && <div className="p-stat-card__sub">{sub}</div>}
    </div>
  );
}
