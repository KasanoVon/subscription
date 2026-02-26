import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import type { Subscription, AppState, Currency } from '../types';
import { CATEGORY_COLORS } from '../types';
import { DEFAULT_EXCHANGE_RATE as RATE } from '../utils/currency';

type Action =
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  | { type: 'SET_DISPLAY_CURRENCY'; payload: Currency }
  | { type: 'SET_EXCHANGE_RATE'; payload: number }
  | { type: 'LOAD_STATE'; payload: AppState };

const emptyState: AppState = {
  subscriptions: [],
  displayCurrency: 'JPY',
  exchangeRate: RATE,
};

const CATEGORY_MIGRATION_MAP: Record<string, string> = {
  Entertainment: 'エンタメ',
  Music: '音楽',
  Productivity: '仕事・生産性',
  'Cloud Storage': 'クラウド・ストレージ',
  'Developer Tools': '開発ツール',
  Gaming: 'ゲーム',
  'News and Learning': 'ニュース・学習',
  Utilities: 'ユーティリティ',
  Other: 'その他',
};

function normalizeCategory(category: string): string {
  return CATEGORY_MIGRATION_MAP[category] ?? category;
}

function normalizeState(parsed: AppState): AppState {
  return {
    ...parsed,
    subscriptions: parsed.subscriptions.map((s) => {
      const category = normalizeCategory(s.category);
      return {
        ...s,
        category,
        color: CATEGORY_COLORS[category] ?? s.color,
      };
    }),
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_SUBSCRIPTION':
      return { ...state, subscriptions: [...state.subscriptions, action.payload] };
    case 'UPDATE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case 'DELETE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.filter((s) => s.id !== action.payload),
      };
    case 'SET_DISPLAY_CURRENCY':
      return { ...state, displayCurrency: action.payload };
    case 'SET_EXCHANGE_RATE':
      return { ...state, exchangeRate: action.payload };
    case 'LOAD_STATE':
      return action.payload;
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

function storageKey(userId: string) {
  return `subnote_state_${userId}`;
}

interface AppProviderProps {
  userId: string;
  authToken: string;
  children: React.ReactNode;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function AppProvider({ userId, authToken, children }: AppProviderProps) {
  const [state, dispatch] = useReducer(reducer, emptyState);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function loadState() {
      const saved = localStorage.getItem(storageKey(userId));
      const fallbackState: AppState = saved
        ? (() => {
            try {
              return normalizeState(JSON.parse(saved) as AppState);
            } catch {
              return { ...emptyState, subscriptions: [] };
            }
          })()
        : { ...emptyState, subscriptions: [] };

      try {
        const res = await fetch(`${API_BASE}/api/state`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!res.ok) {
          if (active) {
            dispatch({ type: 'LOAD_STATE', payload: fallbackState });
            setLoaded(true);
          }
          return;
        }

        const data = (await res.json()) as { state: AppState | null };
        const nextState = data.state ? normalizeState(data.state) : fallbackState;
        if (active) {
          dispatch({ type: 'LOAD_STATE', payload: nextState });
          setLoaded(true);
        }
      } catch {
        if (active) {
          dispatch({ type: 'LOAD_STATE', payload: fallbackState });
          setLoaded(true);
        }
      }
    }

    setLoaded(false);
    void loadState();
    return () => {
      active = false;
    };
  }, [userId, authToken]);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(storageKey(userId), JSON.stringify(state));

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void fetch(`${API_BASE}/api/state`, {
        method: 'PUT',
        headers: authHeaders(authToken),
        body: JSON.stringify({ state }),
      });
    }, 500);
  }, [state, userId, authToken, loaded]);

  // 為替レートを起動時に自動取得（open.er-api.com: 無料・認証不要）
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) return;
        const data = await res.json() as { rates?: Record<string, number> };
        const rate = data?.rates?.JPY;
        if (typeof rate === 'number' && rate > 0) {
          dispatch({ type: 'SET_EXCHANGE_RATE', payload: rate });
        }
      } catch {
        // 取得失敗時はデフォルト値を維持
      }
    }
    void fetchRate();
  }, []);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
