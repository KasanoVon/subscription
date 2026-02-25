import { useState } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SubscriptionList } from './components/SubscriptionList';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AuthPage } from './components/AuthPage';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { Subscription } from './types';
import './styles/pencil.css';

function AppContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const { authState } = useAuth();

  // セッション復元中（usersが空でsessionキーがある場合）はローディング表示
  const hasSession = Boolean(localStorage.getItem('subnote_session'));
  if (authState.users.length === 0 && authState.currentUser === null && hasSession) {
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
        ✏️ 読み込み中...
      </div>
    );
  }

  if (!authState.currentUser) {
    return <AuthPage />;
  }

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
    <AppProvider userId={authState.currentUser.id}>
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

        {modalOpen && <SubscriptionModal editing={editing} onClose={closeModal} />}
      </div>
    </AppProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
