import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { DriverDashboard } from './pages/DriverDashboard';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { Landing } from './pages/Landing';
import { Cargo } from './pages/Cargo';
import { Corporate } from './pages/Corporate';
import { SongaAI } from './pages/SongaAI';

export type Page = 'landing' | 'passenger' | 'driver' | 'cargo' | 'corporate' | 'ai';

function App() {
  const { profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('landing');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (page === 'cargo') return <Cargo onNavigate={setPage} />;
  if (page === 'corporate') return <Corporate onNavigate={setPage} />;
  if (page === 'ai') return <SongaAI onBack={() => setPage('landing')} />;
  if (page === 'driver') return <DriverDashboard />;
  if (page === 'passenger') return <PassengerDashboard />;

  if (profile?.role === 'driver') return <DriverDashboard />;
  if (profile?.role === 'passenger') return <PassengerDashboard />;

  return <Landing onNavigate={setPage} />;
}

export default App;
