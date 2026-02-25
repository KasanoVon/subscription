import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { Subscription, AppState, Currency } from '../types';
import { DEFAULT_SUBSCRIPTIONS } from '../types';
import { DEFAULT_EXCHANGE_RATE as RATE } from '../utils/currency';

type Action =
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  | { type: 'SET_DISPLAY_CURRENCY'; payload: Currency }
  | { type: 'SET_EXCHANGE_RATE'; payload: number }
  | { type: 'LOAD_STATE'; payload: AppState };

const initialState: AppState = {
  subscriptions: DEFAULT_SUBSCRIPTIONS,
  displayCurrency: 'JPY',
  exchangeRate: RATE,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: [...state.subscriptions, action.payload],
      };
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

const STORAGE_KEY = 'subnote_state';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // ローカルストレージから復元
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AppState;
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch {
        // ignore
      }
    }
  }, []);

  // ローカルストレージへ保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
