import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register' | 'recovery-code' | 'reset';

const errorBoxStyle: React.CSSProperties = {
  background: 'var(--red-bg)',
  border: '1.5px solid var(--red)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 12px',
  color: 'var(--red)',
  fontSize: '0.88rem',
  fontFamily: 'var(--font-sketch)',
  marginBottom: '12px',
};

const linkBtnStyle: React.CSSProperties = {
  padding: '0',
  fontSize: '0.85rem',
  color: 'var(--blue)',
  textDecoration: 'underline',
  boxShadow: 'none',
  minWidth: 0,
};

export function AuthPage() {
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 登録後のリカバリーコード表示用
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copied, setCopied] = useState(false);

  // パスワードリセット用
  const [resetUsername, setResetUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryCode('');
    setCopied(false);
    setResetUsername('');
    setResetCode('');
    setResetNewPassword('');
    setResetSuccess(false);
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
        if (result.status === 'taken') {
          setError('このユーザー名はすでに使用されています');
        } else if (result.status === 'server_error') {
          setError('サーバーエラーが発生しました。しばらく経ってから再度お試しください');
        } else if (result.status === 'ok') {
          // 登録成功 → リカバリーコード表示画面へ
          setRecoveryCode(result.recoveryCode);
          setMode('recovery-code');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!resetUsername.trim()) {
      setError('ユーザー名を入力してください');
      return;
    }
    if (!resetCode.trim()) {
      setError('リカバリーコードを入力してください');
      return;
    }
    if (resetNewPassword.length < 6) {
      setError('新しいパスワードは6文字以上で入力してください');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(resetUsername.trim(), resetCode.trim(), resetNewPassword);
      if (result === 'ok') {
        setResetSuccess(true);
      } else if (result === 'no_recovery_code') {
        setError('リカバリーコードが設定されていません。ログイン後、アカウント設定から生成してください');
      } else {
        setError('ユーザー名またはリカバリーコードが正しくありません');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード API 未対応の場合は手動コピー
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
      <div className="p-card" style={{ width: '100%', maxWidth: '400px' }}>

        {/* Tab Toggle — login/register モードのみ */}
        {(mode === 'login' || mode === 'register') && (
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
        )}

        {/* ログイン / 登録フォーム */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleSubmit} noValidate>
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

            {error && <div style={errorBoxStyle}>⚠ {error}</div>}

            <button
              type="submit"
              className="p-btn p-btn--primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '1.05rem' }}
            >
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
            </button>
          </form>
        )}

        {/* リカバリーコード表示（登録直後・1回のみ） */}
        {mode === 'recovery-code' && (
          <div>
            <h2 className="p-heading p-heading--md" style={{ marginBottom: '8px' }}>
              🔑 リカバリーコード
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-light)', marginBottom: '4px' }}>
              パスワードを忘れた際に使用するコードです。
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--red)', fontWeight: 600, marginBottom: '16px' }}>
              ⚠ このコードは二度と表示されません。必ず安全な場所に保存してください。
            </p>
            <div
              style={{
                background: 'var(--paper-warm)',
                border: '2px solid var(--ink)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              <code
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.05rem',
                  letterSpacing: '0.05em',
                  wordBreak: 'break-all',
                  color: 'var(--ink)',
                }}
              >
                {recoveryCode}
              </code>
            </div>
            <button
              type="button"
              className="p-btn p-btn--ghost"
              onClick={handleCopy}
              style={{ width: '100%', justifyContent: 'center', marginBottom: '12px' }}
            >
              {copied ? '✓ コピーしました' : '📋 コードをコピー'}
            </button>
            <button
              type="button"
              className="p-btn p-btn--primary"
              onClick={() => switchMode('login')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              保存しました → ダッシュボードへ
            </button>
          </div>
        )}

        {/* パスワードリセットフォーム */}
        {mode === 'reset' && !resetSuccess && (
          <form onSubmit={handleResetSubmit} noValidate>
            <h2 className="p-heading p-heading--md" style={{ marginBottom: '16px' }}>
              🔓 パスワードをリセット
            </h2>
            <div className="p-form-group">
              <label className="p-label" htmlFor="reset-username">ユーザー名</label>
              <input
                id="reset-username"
                className="p-input"
                type="text"
                autoComplete="username"
                value={resetUsername}
                onChange={(e) => { setResetUsername(e.target.value); setError(''); }}
                placeholder="例: yamada_taro"
                autoFocus
              />
            </div>
            <div className="p-form-group">
              <label className="p-label" htmlFor="reset-code">リカバリーコード</label>
              <input
                id="reset-code"
                className="p-input"
                type="text"
                autoComplete="off"
                value={resetCode}
                onChange={(e) => { setResetCode(e.target.value); setError(''); }}
                placeholder="登録時に表示された24文字のコード"
              />
            </div>
            <div className="p-form-group">
              <label className="p-label" htmlFor="reset-new-password">新しいパスワード</label>
              <input
                id="reset-new-password"
                className="p-input"
                type="password"
                autoComplete="new-password"
                value={resetNewPassword}
                onChange={(e) => { setResetNewPassword(e.target.value); setError(''); }}
                placeholder="6文字以上"
              />
            </div>
            {error && <div style={errorBoxStyle}>⚠ {error}</div>}
            <button
              type="submit"
              className="p-btn p-btn--primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '1.05rem' }}
            >
              {loading ? '処理中...' : 'パスワードをリセット'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.85rem' }}>
              <button
                type="button"
                className="p-btn p-btn--ghost"
                onClick={() => switchMode('login')}
                style={{ ...linkBtnStyle, color: 'var(--ink-light)' }}
              >
                ← ログインに戻る
              </button>
            </p>
          </form>
        )}

        {/* リセット成功 */}
        {mode === 'reset' && resetSuccess && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✓</div>
            <p className="p-heading p-heading--md" style={{ marginBottom: '8px' }}>
              パスワードを変更しました
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-light)', marginBottom: '20px' }}>
              新しいパスワードでログインしてください
            </p>
            <button
              type="button"
              className="p-btn p-btn--primary"
              onClick={() => switchMode('login')}
              style={{ justifyContent: 'center' }}
            >
              ログインへ
            </button>
          </div>
        )}

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
                style={linkBtnStyle}
              >
                新規登録
              </button>
              <br />
              <button
                className="p-btn p-btn--ghost"
                onClick={() => switchMode('reset')}
                style={{ ...linkBtnStyle, color: 'var(--ink-light)', marginTop: '6px', display: 'inline-block' }}
              >
                パスワードを忘れた方はこちら
              </button>
            </>
          ) : mode === 'register' ? (
            <>
              すでにアカウントをお持ちの方は{' '}
              <button
                className="p-btn p-btn--ghost"
                onClick={() => switchMode('login')}
                style={linkBtnStyle}
              >
                ログイン
              </button>
            </>
          ) : null}
        </p>
      </div>

      <p style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--ink-faint)', textAlign: 'center' }}>
        データはサーバーに安全に保存されます
      </p>
    </div>
  );
}
