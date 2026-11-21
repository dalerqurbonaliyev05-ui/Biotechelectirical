// Laboratoriya sahifalari uchun umumiy: menyu (gamburger) va til almashtirgich.
import { i18nBoshlash } from './i18n.js';

export function sahifaBoshlash() {
  const menu = document.getElementById('nav-menu');
  const btn = document.getElementById('hamburger');
  const yop = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.setAttribute('aria-expanded', String(menu.classList.toggle('open')));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.nav-pill')) yop(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') yop(); });
  i18nBoshlash();
}
