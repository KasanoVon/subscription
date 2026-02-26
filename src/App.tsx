import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SubscriptionList } from './components/SubscriptionList';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AuthPage } from './components/AuthPage';
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
