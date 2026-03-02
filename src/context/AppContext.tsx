import React, { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react';
import type { Subscription, AppState, Currency } from '../types';
import { CATEGORY_COLORS } from '../types';
import { DEFAULT_EXCHANGE_RATE as RATE } from '../utils/currency';
import { isOverdue, nextBillingDate as calcNextBillingDate } from '../utils/date';

type Action =
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  | { type: 'REORDER_SUBSCRIPTIONS'; payload: Subscription[] }
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

function advanceOverdueDates(state: AppState): AppState {
  return {
    ...state,
    subscriptions: state.subscriptions.map((s) => {
      if (s.status !== 'active') return s;
      let date = s.nextBillingDate;
      while (isOverdue(date)) {
        date = calcNextBillingDate(date, s.billingCycle, s.customCycleDays);
      }
      return date !== s.nextBillingDate ? { ...s, nextBillingDate: date } : s;
    }),
  };
}

function normalizeState(parsed: AppState): AppState {
  const normalized = {
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
  return advanceOverdueDates(normalized);
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
    case 'REORDER_SUBSCRIPTIONS':
      return { ...state, subscriptions: action.payload };
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
  // LocalStorageのキャッシュで初期state を生成（即座に表示するため）
  const [state, dispatch] = useReducer(reducer, userId, (uid) => {
    const saved = localStorage.getItem(storageKey(uid));
    if (!saved) return emptyState;
    try {
      return normalizeState(JSON.parse(saved) as AppState);
    } catch {
      return emptyState;
    }
  });
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchLiveRate(): Promise<number | null> {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) return null;
        const data = await res.json() as { rates?: Record<string, number> };
        const rate = data?.rates?.JPY;
        return typeof rate === 'number' && rate > 0 ? rate : null;
      } catch {
        return null;
      }
    }

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

      // state取得と為替レート取得を並列実行
      const [stateRes, liveRate] = await Promise.allSettled([
        fetch(`${API_BASE}/api/state`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetchLiveRate(),
      ]);

      let nextState = fallbackState;

      if (stateRes.status === 'fulfilled' && stateRes.value.ok) {
        try {
          const data = (await stateRes.value.json()) as { state: AppState | null };
          if (data.state) nextState = normalizeState(data.state);
        } catch {
          // fallbackState を使用
        }
      }

      // ライブレートが取得できていればstateに反映（LOAD_STATE後に上書きされるのを防ぐ）
      if (liveRate.status === 'fulfilled' && liveRate.value !== null) {
        nextState = { ...nextState, exchangeRate: liveRate.value };
      }

      if (active) {
        dispatch({ type: 'LOAD_STATE', payload: nextState });
        setLoaded(true);
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

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
