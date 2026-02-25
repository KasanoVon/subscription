import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { User } from '../types';

// Web Crypto API による SHA-256 ハッシュ (ブラウザ標準)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface AuthState {
  currentUser: User | null;
  users: User[];
}

type AuthAction =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER'; payload: User }
  | { type: 'LOAD'; payload: AuthState };

const USERS_KEY = 'subnote_users';
const SESSION_KEY = 'subnote_session';

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'REGISTER':
      return {
        ...state,
        users: [...state.users, action.payload],
        currentUser: action.payload,
      };
    case 'LOAD':
      return action.payload;
    default:
      return state;
  }
}

interface AuthContextValue {
  authState: AuthState;
  login: (username: string, password: string) => Promise<'ok' | 'invalid'>;
  register: (username: string, password: string) => Promise<'ok' | 'taken'>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, dispatch] = useReducer(authReducer, {
    currentUser: null,
    users: [],
  });

  // 起動時にユーザー一覧 + セッションを復元
  useEffect(() => {
    const savedUsers = localStorage.getItem(USERS_KEY);
    const savedSession = localStorage.getItem(SESSION_KEY);
    const users: User[] = savedUsers ? (JSON.parse(savedUsers) as User[]) : [];
    let currentUser: User | null = null;
    if (savedSession) {
      const sessionId = savedSession;
      currentUser = users.find((u) => u.id === sessionId) ?? null;
    }
    dispatch({ type: 'LOAD', payload: { users, currentUser } });
  }, []);

  // ユーザー一覧を永続化
  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(authState.users));
  }, [authState.users]);

  // セッション（ログイン状態）を永続化
  useEffect(() => {
    if (authState.currentUser) {
      localStorage.setItem(SESSION_KEY, authState.currentUser.id);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [authState.currentUser]);

  async function login(username: string, password: string): Promise<'ok' | 'invalid'> {
    const hash = await hashPassword(password);
    const user = authState.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hash
    );
    if (!user) return 'invalid';
    dispatch({ type: 'LOGIN', payload: user });
    return 'ok';
  }

  async function register(username: string, password: string): Promise<'ok' | 'taken'> {
    const exists = authState.users.some(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (exists) return 'taken';
    const hash = await hashPassword(password);
    const newUser: User = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      username,
      passwordHash: hash,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    dispatch({ type: 'REGISTER', payload: newUser });
    return 'ok';
  }

  function logout() {
    dispatch({ type: 'LOGOUT' });
  }

  return (
    <AuthContext.Provider value={{ authState, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
