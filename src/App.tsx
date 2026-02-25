import { useState } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { SubscriptionList } from './components/SubscriptionList';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AppProvider } from './context/AppContext';
import type { Subscription } from './types';
import './styles/pencil.css';

function AppContent() {
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
    <div style={{ minHeight: '100vh' }}>
      {/* SVG filter for pencil sketch effect */}
      <svg className="pencil-filters">
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

      {modalOpen && (
        <SubscriptionModal editing={editing} onClose={closeModal} />
      )}
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
