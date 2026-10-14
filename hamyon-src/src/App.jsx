import React, { useEffect, useReducer, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { reducer } from './reducer.js';
import { load, save } from './store.js';
import { dkey } from './calc.js';
import { reschedule } from './notify.js';
import { BottomNav } from './ui.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import Add from './screens/Add.jsx';
import Stats from './screens/Stats.jsx';
import Goals from './screens/Goals.jsx';
import Profile from './screens/Profile.jsx';

// Sana o'zgarsa yoki ilova qayta ochilsa, "hozir"ni yangilab turadi
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [tab, setTab] = useState('home');
  const [adding, setAdding] = useState(false);
  const now = useNow();
  const day = dkey(now);

  useEffect(() => save(state), [state]);

  // Har o'zgarishda (va yangi kunda) eslatmalar qayta rejalanadi
  useEffect(() => {
    const t = setTimeout(() => reschedule(state, new Date()), 700);
    return () => clearTimeout(t);
  }, [state, day]);

  // Android "orqaga" tugmasi: avval oynani yopadi, bosh sahifaga qaytadi, keyin chiqadi
  const nav = useRef({});
  nav.current = { adding, tab, setAdding, setTab };
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let handle;
    CapApp.addListener('backButton', () => {
      const n = nav.current;
      if (n.adding) n.setAdding(false);
      else if (n.tab !== 'home') n.setTab('home');
      else CapApp.exitApp();
    }).then((h) => (handle = h));
    return () => handle && handle.remove();
  }, []);

  if (!state.profile.onboarded) return <Onboarding dispatch={dispatch} />;

  return (
    <div className="app">
      {adding ? (
        <Add state={state} dispatch={dispatch} today={day} onClose={() => setAdding(false)} />
      ) : (
        <>
          {tab === 'home' && (
            <Home state={state} dispatch={dispatch} now={now} onAdd={() => setAdding(true)} goProfile={() => setTab('profile')} />
          )}
          {tab === 'stats' && <Stats state={state} now={now} />}
          {tab === 'goals' && <Goals state={state} dispatch={dispatch} now={now} />}
          {tab === 'profile' && <Profile state={state} dispatch={dispatch} />}
          <BottomNav tab={tab} setTab={setTab} />
        </>
      )}
    </div>
  );
}
