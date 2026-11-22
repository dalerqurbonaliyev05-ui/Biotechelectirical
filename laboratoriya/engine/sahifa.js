// Laboratoriya sahifalari uchun umumiy: menyu (gamburger, bo‘lsa) va til almashtirgich.
import { i18nBoshlash } from './i18n.js';

export function sahifaBoshlash() {
  const menu = document.getElementById('nav-menu');
  const btn = document.getElementById('hamburger');
  if (menu && btn) {
    const yop = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.setAttribute('aria-expanded', String(menu.classList.toggle('open')));
    });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', yop));
    document.addEventListener('click', (e) => { if (!e.target.closest('.sh-bar')) yop(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') yop(); });
  }
  i18nBoshlash();
}
