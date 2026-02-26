import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import type { Currency } from '../types';

interface HeaderProps {
  onAddClick: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  const { state, dispatch } = useApp();
  const { authState, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const push = usePushNotifications(authState.token ?? '');

  function setCurrency(c: Currency) {
    dispatch({ type: 'SET_DISPLAY_CURRENCY', payload: c });
  }

  const username = authState.currentUser?.username ?? '';

  return (
    <header
      style={{
        background: 'var(--paper-base)',
        borderBottom: '1.5px solid var(--ink)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 0px rgba(44, 43, 38, 0.1)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.6rem' }}>✏️</span>
        <h1 className="p-heading p-heading--lg" style={{ lineHeight: 1 }}>
          SubNote
        </h1>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Currency Toggle */}
        <div className="p-currency-toggle">
          <button
            className={`p-currency-toggle__btn${state.displayCurrency === 'JPY' ? ' p-currency-toggle__btn--active' : ''}`}
            onClick={() => setCurrency('JPY')}
          >
            ¥ JPY
          </button>
          <button
            className={`p-currency-toggle__btn${state.displayCurrency === 'USD' ? ' p-currency-toggle__btn--active' : ''}`}
            onClick={() => setCurrency('USD')}
          >
            $ USD
          </button>
        </div>

        {/* Notification Bell */}
        {push.supported && (
          <button
            className="p-btn p-btn--ghost p-btn--icon"
            onClick={() => {
              if (push.permission === 'denied') {
                alert('通知がブロックされています。\nブラウザのアドレスバー左の🔒アイコン → サイトの設定 → 通知を「許可」に変更してください。');
              } else if (push.subscribed) {
                push.unsubscribe();
              } else {
                push.subscribe();
              }
            }}
            disabled={push.loading}
            title={
              push.permission === 'denied'
                ? '通知がブロックされています（ブラウザ設定で許可してください）'
                : push.subscribed
                ? '通知をオフにする'
                : '更新3日前・前日に通知を受け取る'
            }
            aria-label="通知設定"
            style={{
              fontSize: '1.2rem',
              opacity: push.loading ? 0.5 : push.permission === 'denied' ? 0.4 : 1,
            }}
          >
            {push.subscribed ? '🔔' : '🔕'}
          </button>
        )}

        {/* Add Button */}
        <button className="p-btn p-btn--primary" onClick={onAddClick}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>＋</span>
          追加
        </button>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            className="p-btn p-btn--ghost"
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1.5px solid var(--pencil-line)',
            }}
            aria-label="ユーザーメニュー"
          >
            <span
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--ink)',
                color: 'var(--paper-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sketch)',
                fontWeight: 700,
                fontSize: '0.9rem',
                flexShrink: 0,
              }}
            >
              {username.charAt(0).toUpperCase()}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-sketch)',
                fontSize: '0.95rem',
                maxWidth: '100px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {username}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--ink-light)' }}>▾</span>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 6px)',
                  background: 'var(--paper-base)',
                  border: '1.5px solid var(--ink)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  minWidth: '160px',
                  zIndex: 100,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px dashed var(--pencil-line)',
                    fontSize: '0.85rem',
                    color: 'var(--ink-light)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-sketch)', fontWeight: 700, color: 'var(--ink)', display: 'block' }}>
                    {username}
                  </span>
                  としてログイン中
                </div>
                <button
                  className="p-btn p-btn--ghost"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    borderRadius: '0',
                    padding: '10px 14px',
                    color: 'var(--red)',
                    fontSize: '0.95rem',
                    boxShadow: 'none',
                  }}
                >
                  ↩ ログアウト
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
