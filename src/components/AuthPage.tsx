import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('パスワードが一致しません');
        return;
      }
      if (username.length < 2 || username.length > 32) {
        setError('ユーザー名は2〜32文字で入力してください');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await login(username.trim(), password);
        if (result === 'invalid') {
          setError('ユーザー名またはパスワードが正しくありません');
        }
      } else {
        const result = await register(username.trim(), password);
        if (result === 'taken') {
          setError('このユーザー名はすでに使用されています');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--paper-warm)',
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(155, 154, 146, 0.08) 27px, rgba(155, 154, 146, 0.08) 28px)',
      }}
    >
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>✏️</div>
        <h1 className="p-heading p-heading--xl" style={{ marginBottom: '4px' }}>
          SubNote
        </h1>
        <p style={{ color: 'var(--ink-light)', fontSize: '0.95rem' }}>
          サブスクリプション管理ノート
        </p>
      </div>

      {/* Card */}
      <div
        className="p-card"
        style={{ width: '100%', maxWidth: '400px' }}
      >
        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1.5px solid var(--pencil-line)',
            marginBottom: '24px',
            marginLeft: '-20px',
            marginRight: '-20px',
            paddingLeft: '20px',
          }}
        >
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              className="p-btn p-btn--ghost"
              onClick={() => switchMode(m)}
              style={{
                borderRadius: '0',
                borderBottom: mode === m ? '2.5px solid var(--ink)' : '2.5px solid transparent',
                color: mode === m ? 'var(--ink)' : 'var(--ink-light)',
                fontWeight: mode === m ? 700 : 400,
                padding: '8px 20px 10px',
                fontSize: '1.05rem',
              }}
            >
              {m === 'login' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="p-form-group">
            <label className="p-label" htmlFor="auth-username">
              ユーザー名
            </label>
            <input
              id="auth-username"
              className="p-input"
              type="text"
              autoComplete={mode === 'login' ? 'username' : 'new-password'}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="例: yamada_taro"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="p-form-group">
            <label className="p-label" htmlFor="auth-password">
              パスワード
            </label>
            <input
              id="auth-password"
              className="p-input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="6文字以上"
            />
          </div>

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div className="p-form-group">
              <label className="p-label" htmlFor="auth-confirm">
                パスワード（確認）
              </label>
              <input
                id="auth-confirm"
                className="p-input"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                placeholder="もう一度入力"
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              style={{
                background: 'var(--red-bg)',
                border: '1.5px solid var(--red)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                color: 'var(--red)',
                fontSize: '0.88rem',
                fontFamily: 'var(--font-sketch)',
                marginBottom: '12px',
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="p-btn p-btn--primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '1.05rem' }}
          >
            {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
          </button>
        </form>

        {/* Switch hint */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '16px',
            fontSize: '0.85rem',
            color: 'var(--ink-light)',
          }}
        >
          {mode === 'login' ? (
            <>
              アカウントをお持ちでない方は{' '}
              <button
                className="p-btn p-btn--ghost"
                onClick={() => switchMode('register')}
                style={{ padding: '0', fontSize: '0.85rem', color: 'var(--blue)', textDecoration: 'underline', boxShadow: 'none', minWidth: 0 }}
              >
                新規登録
              </button>
            </>
          ) : (
            <>
              すでにアカウントをお持ちの方は{' '}
              <button
                className="p-btn p-btn--ghost"
                onClick={() => switchMode('login')}
                style={{ padding: '0', fontSize: '0.85rem', color: 'var(--blue)', textDecoration: 'underline', boxShadow: 'none', minWidth: 0 }}
              >
                ログイン
              </button>
            </>
          )}
        </p>
      </div>

      <p style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--ink-faint)', textAlign: 'center' }}>
        データはこのブラウザのローカルストレージに保存されます
      </p>
    </div>
  );
}
