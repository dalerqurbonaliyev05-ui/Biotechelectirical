import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthGate, BottomTabs, onTableChange, supabase, useAuth } from '@uyovqat/shared';
import Orders from './pages/Orders';
import Foods from './pages/Foods';
import FoodForm from './pages/FoodForm';
import Earnings from './pages/Earnings';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthGate emoji="👩‍🍳" title="Oshxonam" lead="Uyda tayyorlagan taomlaringizni soting: buyurtmalarni qabul qiling, daromad va bonusingizni kuzating." withShop>
      <Shell />
    </AuthGate>
  );
}

function Shell() {
  const loc = useLocation();
  const { session } = useAuth();
  const [fresh, setFresh] = useState(0);
  const hideTabs = loc.pathname.startsWith('/foods/');

  // Yangi (qabul qilinmagan) buyurtmalar soni: tab belgisi uchun, realtime.
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new');
      setFresh(count ?? 0);
    };
    void load();
    return onTableChange('orders', () => void load(), `seller_id=eq.${session.user.id}`);
  }, [session]);

  return (
    <div className="u-app">
      <Routes location={loc}>
        <Route path="/" element={<Orders />} />
        <Route path="/foods" element={<Foods />} />
        <Route path="/foods/:id" element={<FoodForm />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideTabs && <BottomTabs tabs={[
        { to: '/', label: 'Buyurtmalar', icon: 'receipt', badge: fresh },
        { to: '/foods', label: 'Taomlar', icon: 'chef', end: false },
        { to: '/earnings', label: 'Daromad', icon: 'wallet' },
        { to: '/profile', label: 'Profil', icon: 'user' },
      ]} />}
    </div>
  );
}
