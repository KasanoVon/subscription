import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SubscriptionList } from './components/SubscriptionList';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AuthPage } from './components/AuthPage';
import { ChangelogPage } from './components/ChangelogPage';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { Subscription } from './types';
import './styles/pencil.css';

function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'var(--font-sketch)',
        fontSize: '1.2rem',
        color: 'var(--ink-light)',
      }}
    >
      Loading...
    </div>
  );
}

function AppDashboard({ userId, authToken }: { userId: string; authToken: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(s: Subscription) {
    setEditing(s);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <AppProvider userId={userId} authToken={authToken}>
      <div style={{ minHeight: '100vh' }}>
        {/* SVG filter for pencil sketch effect */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="pencil-sketch">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.015"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="1.5"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        <Header onAddClick={openAdd} />

        <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <Dashboard />
          <SubscriptionList onEdit={openEdit} />
        </main>

        <footer
          style={{
            borderTop: '1.5px solid var(--paper-darker)',
            marginTop: '24px',
            padding: '20px',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: 'var(--ink-light)',
            fontFamily: 'var(--font-body)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span>
            お問い合わせ：
            <a
              href="https://x.com/KasanoVon"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink)', textDecoration: 'underline' }}
            >
              @KasanoVon
            </a>
            {' '}on X
          </span>

          <button
            onClick={() => {
              const shareData = {
                title: 'SubNote - サブスクリプション管理',
                text: 'サブスクをまとめて管理・通知が届くアプリ',
                url: 'https://subnote.up.railway.app',
              };
              if (navigator.share) {
                navigator.share(shareData).catch(() => {});
              } else {
                const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
                window.open(xUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'none',
              border: '1.5px solid var(--paper-darker)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
              fontSize: '0.8rem',
              color: 'var(--ink)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            シェア
          </button>

          <Link
            to="/changelog"
            style={{ color: 'var(--ink)', textDecoration: 'underline' }}
          >
            アップデート履歴
          </Link>
        </footer>

        {modalOpen && <SubscriptionModal editing={editing} onClose={closeModal} />}
      </div>
    </AppProvider>
  );
}

function AppRoutes() {
  const { authState } = useAuth();

  if (!authState.initialized) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={authState.currentUser && authState.token ? <Navigate to="/app" replace /> : <AuthPage />}
      />
      <Route
        path="/app"
        element={
          authState.currentUser && authState.token ? (
            <AppDashboard userId={authState.currentUser.id} authToken={authState.token} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/changelog" element={<ChangelogPage />} />
      <Route
        path="*"
        element={<Navigate to={authState.currentUser && authState.token ? '/app' : '/login'} replace />}
      />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
