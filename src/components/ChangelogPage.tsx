import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { date: string };
  };
}

interface ParsedCommit {
  sha: string;
  date: string;
  type: string;
  message: string;
}

const GITHUB_REPO = 'KasanoVon/subscription';
const GITHUB_BRANCH = import.meta.env.VITE_CHANGELOG_BRANCH ?? 'claude/subscription-management-app-3gncf';

const TYPE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  feat:     { label: '新機能',       color: '#2d7a4f', bg: '#e6f4ec' },
  fix:      { label: '修正',         color: '#b94040', bg: '#faeaea' },
  perf:     { label: '改善',         color: '#2a5ea8', bg: '#e8eef9' },
  security: { label: 'セキュリティ', color: '#7b3fa0', bg: '#f3e8fa' },
  refactor: { label: 'リファクタ',   color: '#6b6b6b', bg: '#f0f0f0' },
  docs:     { label: 'ドキュメント', color: '#7a6020', bg: '#faf3e0' },
  chore:    { label: 'その他',       color: '#6b6b6b', bg: '#f0f0f0' },
};

function parseCommit(raw: GitHubCommit): ParsedCommit | null {
  const firstLine = raw.commit.message.split('\n')[0];
  const match = firstLine.match(/^(\w+)(?:\([^)]+\))?:\s*(.+)/);
  if (!match) return null;
  const [, type, message] = match;
  if (!TYPE_MAP[type]) return null;
  return { sha: raw.sha.slice(0, 7), date: raw.commit.author.date, type, message };
}

function formatCommitDate(dateStr: string): string {
  return format(parseISO(dateStr), 'yyyy年M月d日', { locale: ja });
}

export function ChangelogPage() {
  const [commits, setCommits] = useState<ParsedCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?sha=${GITHUB_BRANCH}&per_page=50`,
      { headers: { Accept: 'application/vnd.github+json' } }
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<GitHubCommit[]>;
      })
      .then((data) => {
        setCommits(data.flatMap((c) => parseCommit(c) ?? []));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper-base)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: '1.5px solid var(--ink)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--paper-base)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 0px rgba(44, 43, 38, 0.1)',
        }}
      >
        <button
          onClick={() => history.back()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            color: 'var(--ink)',
            padding: '4px 8px',
            fontFamily: 'var(--font-body)',
          }}
        >
          ← 戻る
        </button>
        <h1 className="p-heading p-heading--lg" style={{ lineHeight: 1 }}>
          📝 アップデート履歴
        </h1>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 20px' }}>
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--ink-light)',
              fontFamily: 'var(--font-sketch)',
            }}
          >
            読み込み中...
          </div>
        )}

        {error && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--ink-light)',
              fontFamily: 'var(--font-sketch)',
            }}
          >
            読み込みに失敗しました
          </div>
        )}

        {!loading && !error && commits.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--ink-light)',
              fontFamily: 'var(--font-sketch)',
            }}
          >
            履歴がありません
          </div>
        )}

        {!loading && !error && commits.length > 0 && (
          <div
            style={{
              borderLeft: '2px solid var(--pencil-line)',
              paddingLeft: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0',
            }}
          >
            {commits.map((c, i) => {
              const type = TYPE_MAP[c.type];
              const showDate =
                i === 0 || formatCommitDate(commits[i - 1].date) !== formatCommitDate(c.date);
              return (
                <div key={c.sha}>
                  {/* Date separator */}
                  {showDate && (
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--ink-light)',
                        fontFamily: 'var(--font-sketch)',
                        marginTop: i === 0 ? '0' : '24px',
                        marginBottom: '8px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {formatCommitDate(c.date)}
                    </div>
                  )}

                  {/* Commit row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '10px',
                      padding: '6px 0',
                      borderBottom: '1px dashed var(--paper-darker)',
                    }}
                  >
                    {/* Dot on timeline */}
                    <span
                      style={{
                        position: 'relative',
                        left: '-27px',
                        marginRight: '-14px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: type.color,
                        flexShrink: 0,
                        marginTop: '2px',
                        alignSelf: 'center',
                      }}
                    />

                    {/* Badge */}
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontFamily: 'var(--font-sketch)',
                        fontWeight: 700,
                        color: type.color,
                        background: type.bg,
                        border: `1px solid ${type.color}40`,
                        flexShrink: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {type.label}
                    </span>

                    {/* Message */}
                    <span
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--ink)',
                        lineHeight: 1.5,
                      }}
                    >
                      {c.message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
