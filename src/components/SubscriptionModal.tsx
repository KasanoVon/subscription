import React, { useState, useEffect } from 'react';
import type { Subscription, Currency, BillingCycle, SubscriptionStatus } from '../types';
import { CATEGORIES, CATEGORY_COLORS } from '../types';
import { useApp } from '../context/AppContext';
import { todayISOString } from '../utils/date';

interface SubscriptionModalProps {
  editing: Subscription | null;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#D45B5B', '#C47B3A', '#C4A42D', '#8BD45B',
  '#4B9E6F', '#3A9EA5', '#5B8DD4', '#4F74B8',
  '#8B52C4', '#C45B9E', '#8B8B8B', '#2C2B26',
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const DEFAULT_FORM: Omit<Subscription, 'id' | 'createdAt'> = {
  name: '',
  amount: 0,
  currency: 'JPY',
  billingCycle: 'monthly',
  category: 'その他',
  nextBillingDate: todayISOString(),
  status: 'active',
  notes: '',
  url: '',
  color: COLOR_PRESETS[0],
};

export function SubscriptionModal({ editing, onClose }: SubscriptionModalProps) {
  const { dispatch } = useApp();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editing) {
      const { id: _id, createdAt: _c, ...rest } = editing;
      setForm(rest);
    } else {
      setForm(DEFAULT_FORM);
    }
    setErrors({});
  }, [editing]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'サービス名を入力してください';
    if (form.amount <= 0) errs.amount = '0より大きい金額を入力してください';
    if (!form.nextBillingDate) errs.nextBillingDate = '次回請求日を入力してください';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (editing) {
      dispatch({
        type: 'UPDATE_SUBSCRIPTION',
        payload: { ...form, id: editing.id, createdAt: editing.createdAt },
      });
    } else {
      dispatch({
        type: 'ADD_SUBSCRIPTION',
        payload: { ...form, id: genId(), createdAt: todayISOString() },
      });
    }
    onClose();
  }

  return (
    <div className="p-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="p-modal">
        {/* Header */}
        <div className="p-modal__header">
          <h2 className="p-heading p-heading--md">
            {editing ? '✏️ 編集' : '＋ 新規追加'}
          </h2>
          <button className="p-btn p-btn--ghost p-btn--icon" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Service Name */}
          <div className="p-form-group">
            <label className="p-label" htmlFor="name">サービス名 *</label>
            <input
              id="name"
              className="p-input"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="例: Netflix, Spotify..."
              autoFocus
            />
            {errors.name && <ErrorMsg msg={errors.name} />}
          </div>

          {/* Amount + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
            <div className="p-form-group">
              <label className="p-label" htmlFor="amount">金額 *</label>
              <input
                id="amount"
                className="p-input"
                type="number"
                min="0"
                step={form.currency === 'JPY' ? '1' : '0.01'}
                value={form.amount || ''}
                onChange={(e) => set('amount', parseFloat(e.target.value) || 0)}
                placeholder={form.currency === 'JPY' ? '1000' : '9.99'}
              />
              {errors.amount && <ErrorMsg msg={errors.amount} />}
            </div>
            <div className="p-form-group">
              <label className="p-label" htmlFor="currency">通貨</label>
              <select
                id="currency"
                className="p-select"
                value={form.currency}
                onChange={(e) => set('currency', e.target.value as Currency)}
              >
                <option value="JPY">¥ JPY</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
          </div>

          {/* Billing Cycle + Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="p-form-group">
              <label className="p-label" htmlFor="billingCycle">請求サイクル</label>
              <select
                id="billingCycle"
                className="p-select"
                value={form.billingCycle}
                onChange={(e) => set('billingCycle', e.target.value as BillingCycle)}
              >
                <option value="weekly">週払い</option>
                <option value="monthly">月払い</option>
                <option value="yearly">年払い</option>
              </select>
            </div>
            <div className="p-form-group">
              <label className="p-label" htmlFor="category">カテゴリ</label>
              <select
                id="category"
                className="p-select"
                value={form.category}
                onChange={(e) => {
                  set('category', e.target.value);
                  const col = CATEGORY_COLORS[e.target.value];
                  if (col) set('color', col);
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Next Billing Date + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="p-form-group">
              <label className="p-label" htmlFor="nextBillingDate">次回請求日 *</label>
              <input
                id="nextBillingDate"
                className="p-input"
                type="date"
                value={form.nextBillingDate}
                onChange={(e) => set('nextBillingDate', e.target.value)}
              />
              {errors.nextBillingDate && <ErrorMsg msg={errors.nextBillingDate} />}
            </div>
            <div className="p-form-group">
              <label className="p-label" htmlFor="status">ステータス</label>
              <select
                id="status"
                className="p-select"
                value={form.status}
                onChange={(e) => set('status', e.target.value as SubscriptionStatus)}
              >
                <option value="active">アクティブ</option>
                <option value="paused">停止中</option>
                <option value="cancelled">キャンセル済</option>
              </select>
            </div>
          </div>

          {/* Color Picker */}
          <div className="p-form-group">
            <label className="p-label">カラー</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => set('color', color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: color,
                    border: form.color === color
                      ? '3px solid var(--ink)'
                      : '2px solid rgba(44,43,38,0.2)',
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                    transform: form.color === color ? 'scale(1.2)' : 'scale(1)',
                  }}
                  aria-label={`色: ${color}`}
                />
              ))}
            </div>
          </div>

          {/* URL */}
          <div className="p-form-group">
            <label className="p-label" htmlFor="url">URL (任意)</label>
            <input
              id="url"
              className="p-input"
              type="url"
              value={form.url || ''}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Notes */}
          <div className="p-form-group">
            <label className="p-label" htmlFor="notes">メモ (任意)</label>
            <textarea
              id="notes"
              className="p-textarea"
              rows={2}
              value={form.notes || ''}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="プランの詳細などを記入..."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Footer */}
          <div className="p-modal__footer">
            <button type="button" className="p-btn" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="p-btn p-btn--primary">
              {editing ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <span style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '2px' }}>
      {msg}
    </span>
  );
}
