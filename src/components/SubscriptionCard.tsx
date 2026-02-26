import type { Subscription } from '../types';
import { useApp } from '../context/AppContext';
import { convertCurrency, formatCurrency, billingCycleLabel, toMonthlyAmount } from '../utils/currency';
import { formatDate, daysUntil } from '../utils/date';

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit: (s: Subscription) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionCard({ subscription: s, onEdit, onDelete }: SubscriptionCardProps) {
  const { state, dispatch } = useApp();
  const { displayCurrency, exchangeRate } = state;

  const amountDisplay = convertCurrency(s.amount, s.currency, displayCurrency, exchangeRate);
  const monthlyDisplay = toMonthlyAmount(amountDisplay, s.billingCycle, s.customCycleDays);

  const days = daysUntil(s.nextBillingDate);
  const urgent = days >= 0 && days <= 3;
  const upcoming = days >= 0 && days <= 7;
  const overdue = days < 0;

  function toggleStatus() {
    const next = s.status === 'active' ? 'paused' : 'active';
    dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: { ...s, status: next } });
  }

  function handleDelete() {
    if (window.confirm(`「${s.name}」を削除しますか？`)) {
      onDelete(s.id);
    }
  }

  return (
    <div
      className="p-card"
      style={{
        borderLeft: `4px solid ${s.color}`,
        opacity: s.status === 'cancelled' ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: s.color + '22',
              border: `2px solid ${s.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: 'var(--font-sketch)',
              fontWeight: 700,
              fontSize: '1rem',
              color: s.color,
            }}
          >
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-sketch)',
                fontWeight: 700,
                fontSize: '1.1rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {s.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)' }}>{s.category}</div>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-sketch)', fontWeight: 700, fontSize: '1.15rem' }}>
            {formatCurrency(amountDisplay, displayCurrency)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>
            {billingCycleLabel(s.billingCycle, s.customCycleDays)}
            {s.billingCycle !== 'monthly' && (
              <span style={{ marginLeft: '4px', color: 'var(--ink-faint)' }}>
                ({formatCurrency(monthlyDisplay, displayCurrency)}/月)
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          <StatusBadge status={s.status} />
          {overdue && <span className="p-badge p-badge--danger">期限超過</span>}
          {!overdue && urgent && <span className="p-badge p-badge--danger">あと {days}日</span>}
          {!overdue && !urgent && upcoming && <span className="p-badge p-badge--warning">あと {days}日</span>}
          {s.paymentMethod && (
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              💳 {s.paymentMethod}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)' }}>次回: {formatDate(s.nextBillingDate)}</div>
      </div>

      <hr className="p-divider" style={{ margin: 'auto 0 10px' }} />

      <div
        style={{
          display: 'flex',
          gap: '6px',
          justifyContent: 'flex-end',
          position: 'relative',
          zIndex: 5,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          className="p-btn p-btn--ghost p-btn--sm"
          onClick={toggleStatus}
          title={s.status === 'active' ? '一時停止' : '再開'}
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 20,
            touchAction: 'manipulation',
            cursor: 'pointer',
          }}
        >
          {s.status === 'active' ? '⏸' : '▶'}
        </button>
        <button
          type="button"
          className="p-btn p-btn--ghost p-btn--sm"
          onClick={() => onEdit(s)}
          title="編集"
          style={{
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 20,
            touchAction: 'manipulation',
            cursor: 'pointer',
          }}
        >
          ✏️
        </button>
        <button
          type="button"
          className="p-btn p-btn--ghost p-btn--sm"
          onPointerDown={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          onClick={handleDelete}
          title="削除"
          style={{
            color: 'var(--red)',
            pointerEvents: 'auto',
            position: 'relative',
            zIndex: 20,
            touchAction: 'manipulation',
            cursor: 'pointer',
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Subscription['status'] }) {
  switch (status) {
    case 'active':
      return <span className="p-badge p-badge--active">● アクティブ</span>;
    case 'paused':
      return <span className="p-badge p-badge--paused">⏸ 停止中</span>;
    case 'cancelled':
      return <span className="p-badge p-badge--cancelled">✖ キャンセル</span>;
    default:
      return null;
  }
}
