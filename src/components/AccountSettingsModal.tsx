import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface AccountSettingsModalProps {
  onClose: () => void;
}

export function AccountSettingsModal({ onClose }: AccountSettingsModalProps) {
  const { setupRecoveryCode } = useAuth();
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSetupCode() {
    setError('');
    setLoading(true);
    try {
      const result = await setupRecoveryCode();
      if (result.status === 'ok') {
        setRecoveryCode(result.recoveryCode);
        setCopied(false);
      } else {
        setError('コードの生成に失敗しました。しばらく経ってから再度お試しください');
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
      className="p-modal-overlay"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="p-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        style={{ maxWidth: '420px' }}
      >
        {/* Header */}
        <div className="p-modal__header">
          <h2 id="settings-modal-title" className="p-heading p-heading--md">
            ⚙ アカウント設定
          </h2>
          <button className="p-btn p-btn--ghost p-btn--icon" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>

        <div style={{ padding: '0 0 8px' }}>
          {/* リカバリーコードセクション */}
          <div
            style={{
              borderBottom: '1px dashed var(--pencil-line)',
              paddingBottom: '20px',
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-sketch)',
                fontWeight: 700,
                fontSize: '1rem',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔑 リカバリーコード
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-light)', marginBottom: '12px', lineHeight: 1.5 }}>
              パスワードを忘れた際にアカウントを復旧するためのコードです。
              コードは1回しか表示されないため、必ず安全な場所に保存してください。
            </p>

            {!recoveryCode ? (
              <>
                {error && (
                  <div
                    style={{
                      background: 'var(--red-bg)',
                      border: '1.5px solid var(--red)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      color: 'var(--red)',
                      fontSize: '0.85rem',
                      marginBottom: '12px',
                    }}
                  >
                    ⚠ {error}
                  </div>
                )}
                <button
                  type="button"
                  className="p-btn p-btn--ghost"
                  onClick={handleSetupCode}
                  disabled={loading}
                  style={{ fontSize: '0.9rem' }}
                >
                  {loading ? '生成中...' : '🔄 コードを生成 / 再生成'}
                </button>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-faint)', marginTop: '8px' }}>
                  ※ 再生成すると以前のコードは無効になります
                </p>
              </>
            ) : (
              <>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--red)',
                    fontWeight: 600,
                    marginBottom: '10px',
                  }}
                >
                  ⚠ このコードは二度と表示されません。今すぐ保存してください。
                </p>
                <div
                  style={{
                    background: 'var(--paper-warm)',
                    border: '2px solid var(--ink)',
                    borderRadius: 'var(--radius)',
                    padding: '14px',
                    textAlign: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <code
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '1rem',
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
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem' }}
                >
                  {copied ? '✓ コピーしました' : '📋 コードをコピー'}
                </button>
              </>
            )}
          </div>

          {/* 閉じるボタン */}
          <div style={{ textAlign: 'right' }}>
            <button type="button" className="p-btn p-btn--ghost" onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
