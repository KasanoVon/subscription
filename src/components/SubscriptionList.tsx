import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SubscriptionCard } from './SubscriptionCard';
import type { Subscription, SubscriptionStatus } from '../types';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubscriptionListProps {
  onEdit: (s: Subscription) => void;
}

const STATUS_FILTERS: { label: string; value: SubscriptionStatus | 'all' }[] = [
  { label: 'すべて', value: 'all' },
  { label: 'アクティブ', value: 'active' },
  { label: '停止中', value: 'paused' },
  { label: 'キャンセル', value: 'cancelled' },
];

function SortableCard({
  subscription,
  onEdit,
  onDelete,
}: {
  subscription: Subscription;
  onEdit: (s: Subscription) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subscription.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SubscriptionCard subscription={subscription} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

export function SubscriptionList({ onEdit }: SubscriptionListProps) {
  const { state, dispatch } = useApp();
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const filtered = state.subscriptions.filter((s) => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  function handleDelete(id: string) {
    dispatch({ type: 'DELETE_SUBSCRIPTION', payload: id });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.subscriptions.findIndex((s) => s.id === active.id);
    const newIndex = state.subscriptions.findIndex((s) => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      dispatch({
        type: 'REORDER_SUBSCRIPTIONS',
        payload: arrayMove(state.subscriptions, oldIndex, newIndex),
      });
    }
  }

  return (
    <section style={{ padding: '0 20px 40px' }}>
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <h2 className="p-heading p-heading--md">
          📋 サブスクリプション一覧
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--ink-light)',
              fontWeight: 400,
              marginLeft: '8px',
            }}
          >
            ({filtered.length} 件)
          </span>
        </h2>

        {/* Search */}
        <input
          type="search"
          className="p-input"
          placeholder="🔍 検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '220px' }}
        />
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`p-btn p-btn--sm${filterStatus === f.value ? ' p-btn--primary' : ''}`}
            onClick={() => setFilterStatus(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        search || filterStatus !== 'all' ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--ink-faint)',
              fontFamily: 'var(--font-sketch)',
              fontSize: '1.1rem',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
            条件に一致するサブスクリプションがありません
          </div>
        ) : (
          <div
            style={{
              border: '2px dashed var(--paper-darker)',
              borderRadius: 'var(--radius)',
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--paper-warm)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
            <p style={{ fontFamily: 'var(--font-sketch)', fontSize: '1.2rem', color: 'var(--ink)', marginBottom: '8px' }}>
              まだサブスクリプションがありません
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', marginBottom: '28px' }}>
              右上の「＋ 追加」から登録を始めましょう
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxWidth: '320px',
                margin: '0 auto',
                textAlign: 'left',
              }}
            >
              {[
                { step: '1', text: '右上の「＋ 追加」をクリック' },
                { step: '2', text: 'サービス名を入力（候補が自動で出ます）' },
                { step: '3', text: '金額・請求日を確認して「追加する」' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--ink)',
                      color: 'var(--paper-base)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-sketch)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {step}
                  </span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div
              className="p-sub-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '14px',
              }}
            >
              {filtered.map((s) => (
                <SortableCard
                  key={s.id}
                  subscription={s}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
