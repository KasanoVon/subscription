import { useApp } from '../context/AppContext';
import type { Currency } from '../types';

interface HeaderProps {
  onAddClick: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  const { state, dispatch } = useApp();

  function setCurrency(c: Currency) {
    dispatch({ type: 'SET_DISPLAY_CURRENCY', payload: c });
  }

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
        <h1
          className="p-heading p-heading--lg"
          style={{ lineHeight: 1 }}
        >
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

        {/* Add Button */}
        <button className="p-btn p-btn--primary" onClick={onAddClick}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>＋</span>
          追加
        </button>
      </div>
    </header>
  );
}
