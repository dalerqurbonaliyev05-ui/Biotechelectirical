import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { api } from './lib/api.js';
import { Icon, Logo, Spinner, ToastProvider } from './components/ui.jsx';
import { Login, Onboarding } from './screens/Auth.jsx';
import Home from './screens/Home.jsx';
import { Tests, Milliy } from './screens/Tests.jsx';
import TestRunner from './screens/TestRunner.jsx';
import Leaderboard from './screens/Leaderboard.jsx';
import Profile from './screens/Profile.jsx';
import Games, { GameHost } from './screens/Games.jsx';
import Formulas from './screens/Formulas.jsx';

const TABS = [['home', 'Bosh sahifa', Icon.home], ['tests', 'Testlar', Icon.tests], ['games', 'Laboratoriya', Icon.games], ['rank', 'Reyting', Icon.rank], ['profile', 'Profil', Icon.user]];

function useTheme() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('fizika-theme') || ''; } catch { return ''; } });
  useEffect(() => {
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme || sys;
    try { localStorage.setItem('fizika-theme', theme); } catch { /* */ }
  }, [theme]);
  const eff = theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  return [eff, setTheme];
}

function App() {
  const [phase, setPhase] = useState('loading'); // loading | login | onboard | app
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [ann, setAnn] = useState([]);
  const [route, setRoute] = useState({ name: 'home', params: {} });
  const [stack, setStack] = useState([]);
  const [editing, setEditing] = useState(false);
  const [theme, setTheme] = useTheme();

  const refresh = useCallback(async () => { const p = await api.me(); setMe(p); return p; }, []);
  const boot = useCallback(async (s) => {
    setSession(s);
    if (!s) { setPhase('login'); return; }
    try {
      const p = await api.me();
      setMe(p);
      if (!p) { setPhase('onboard'); return; }
      setPhase('app');
      api.catalog().then(setCatalog).catch(() => {});
      api.announcements().then(setAnn).catch(() => {});
    } catch (e) {
      console.error(e);
      const m = String(e?.message || e);
      if (/fizika_me|Could not find the function|schema cache|does not exist/i.test(m)) setPhase('setup'); else setPhase('login');
    }
  }, []);

  useEffect(() => {
    api.init().then(boot).catch(() => setPhase('login'));
    return api.onAuth(s => { if (s) boot(s); });
  }, [boot]);

  // brauzerning "orqaga" tugmasi bilan ishlash
  useEffect(() => {
    const onPop = () => setStack(st => { if (!st.length) return st; const prev = st[st.length - 1]; setRoute(prev); return st.slice(0, -1); });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback((name, params = {}) => {
    const tab = TABS.some(t => t[0] === name) && name !== 'profile' ? name : null;
    if (tab) { setStack([]); setRoute({ name, params }); window.scrollTo(0, 0); return; }
    setStack(st => [...st, route]); history.pushState({}, ''); setRoute({ name, params }); window.scrollTo(0, 0);
  }, [route]);
  const back = useCallback(() => { history.back(); }, []);

  if (phase === 'loading') return <div className="login"><div style={{ textAlign: 'center' }}><Logo size={56} /><Spinner /></div></div>;
  if (phase === 'login') return <Login onSignedIn={boot} />;
  if (phase === 'setup') return (
    <div className="login"><div className="box sheet stack">
      <h2>Ma’lumotlar bazasi hali sozlanmagan</h2>
      <p className="muted">Admin Supabase loyihasida <b>supabase/fizika_setup.sql</b> faylini SQL Editor orqali ishga tushirishi, so‘ng admin paneldagi «Bazani yuklash» tugmasini bosishi kerak.</p>
      <a className="btn ghost" href="?demo=1">Hozircha demo rejimda ko‘rish</a>
    </div></div>
  );
  if (phase === 'onboard' || editing) return (
    <Onboarding session={session} profile={editing ? me : null} onCancel={editing ? () => setEditing(false) : null}
      onSaved={async () => { setEditing(false); await boot(session || (await api.session())); }} />
  );

  const r = route.name;
  if (r === 'run') return (
    <TestRunner spec={route.params} onExit={() => { refresh(); setStack([]); setRoute({ name: 'home', params: {} }); }} onDone={refresh} />
  );

  let screen;
  if (r === 'home') screen = <Home me={me} catalog={catalog} go={go} announcements={ann} />;
  else if (r === 'tests') screen = <Tests me={me} catalog={catalog} go={go} />;
  else if (r === 'milliy') screen = <Milliy me={me} catalog={catalog} go={go} back={back} />;
  else if (r === 'games') screen = <Games me={me} go={go} />;
  else if (r === 'game') screen = <GameHost id={route.params.id} me={me} back={back} onPlayed={refresh} />;
  else if (r === 'formulas') screen = <Formulas me={me} catalog={catalog} back={back} />;
  else if (r === 'rank') screen = <Leaderboard me={me} />;
  else if (r === 'profile') screen = <Profile me={me} refresh={refresh} initialTab={route.params.tab} theme={theme} setTheme={setTheme}
    onEdit={() => setEditing(true)} onSignOut={async () => { await api.signOut(); setMe(null); setPhase('login'); }} />;

  const activeTab = TABS.find(t => t[0] === r)?.[0] || ({ milliy: 'tests', game: 'games', formulas: 'games' }[r]) || 'home';
  return (
    <div className="app">
      <nav className="nav" aria-label="Asosiy menyu">
        <span className="brand"><Logo /> Fizika</span>
        {TABS.map(([id, label, I]) => (
          <button key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => { setStack([]); setRoute({ name: id, params: {} }); window.scrollTo(0, 0); }}>
            <I /><span>{label}</span>
          </button>
        ))}
      </nav>
      <main>{screen}</main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<ToastProvider><App /></ToastProvider>);

if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.FIZIKA_CONFIG?.noSW) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
