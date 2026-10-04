import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, BottomTabs } from '@uyovqat/shared';
import { CourierProvider } from './courier';
import MapPage from './pages/MapPage';
import History from './pages/History';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthGate emoji="🛵" title="Kuryer" lead="Eng yaqin buyurtma sizga avtomatik biriktiriladi. Bo'sh holatga o'ting va yo'lga chiqing.">
      <CourierProvider>
        <div className="u-app">
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BottomTabs tabs={[
            { to: '/', label: 'Xarita', icon: 'nav' },
            { to: '/history', label: 'Tarix', icon: 'receipt' },
            { to: '/profile', label: 'Profil', icon: 'user' },
          ]} />
        </div>
      </CourierProvider>
    </AuthGate>
  );
}
