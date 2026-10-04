import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AuthGate, BottomTabs, StickyBar, money } from '@uyovqat/shared';
import { useCart } from './cart';
import Home from './pages/Home';
import FoodPage from './pages/FoodPage';
import CartPage from './pages/CartPage';
import Orders from './pages/Orders';
import OrderPage from './pages/OrderPage';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthGate emoji="🍲" title="Uy taomlari" lead="Uyda tayyorlangan mazali taomlar: sho'rva, mastava, manti va boshqalar. Eshigingizgacha yetkazamiz.">
      <Shell />
    </AuthGate>
  );
}

function Shell() {
  const loc = useLocation();
  const nav = useNavigate();
  const cart = useCart();
  const onCart = loc.pathname.startsWith('/cart');
  const onFood = loc.pathname.startsWith('/food/');   // taom sahifasida o'zining "Savatga qo'shish" tugmasi bor
  const showCartBar = cart.count > 0 && !onCart && !onFood;

  return (
    <div className="u-app">
      <Routes location={loc}>
        <Route path="/" element={<Home />} />
        <Route path="/food/:id" element={<FoodPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <StickyBar show={showCartBar} label={`Savat · ${cart.count} ta taom`} sub={money(cart.subtotal)} onClick={() => nav('/cart')} />
      {!onFood && <BottomTabs tabs={[
        { to: '/', label: 'Bosh sahifa', icon: 'home' },
        { to: '/cart', label: 'Savat', icon: 'bag', badge: cart.count },
        { to: '/orders', label: 'Buyurtmalar', icon: 'receipt', end: false },
        { to: '/profile', label: 'Profil', icon: 'user' },
      ]} />}
    </div>
  );
}
