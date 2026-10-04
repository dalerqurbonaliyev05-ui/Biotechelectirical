/* Uy taomlari yuklab olish sahifasi: navigatsiya, progress, reveal, APK ma'lumotlari. */
(function () {
    'use strict';
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. APK ma'lumotlari (config.js) ---------- */
    const cfg = window.UYOVQAT;
    if (cfg) {
        document.querySelectorAll('.uy-app[data-app]').forEach(card => {
            const app = cfg.APPS[card.dataset.app];
            if (!app) return;
            const a = card.querySelector('[data-dl]');
            if (a) a.setAttribute('href', app.file);
            const v = card.querySelector('[data-v]'); if (v) v.textContent = cfg.VERSION;
            const s = card.querySelector('[data-size]'); if (s) s.textContent = (app.bytes / 1048576).toFixed(1).replace('.', ',');
            const h = card.querySelector('[data-hash]'); if (h) h.textContent = app.sha256;
        });
    }
    // iPhone: tushuntirish ko'rsatiladi (ilovalar faqat Android uchun)
    if (document.documentElement.getAttribute('data-platform') === 'ios') {
        const note = document.getElementById('ios-note'); if (note) note.hidden = false;
    }
    const year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();

    /* ---------- 2. Navigatsiya, progress chizig'i ---------- */
    const navbar = document.getElementById('navbar');
    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');
    const progressTop = document.getElementById('progress-top');

    function closeMenu() { navMenu.classList.remove('open'); hamburger.setAttribute('aria-expanded', 'false'); }
    hamburger.addEventListener('click', () => {
        const open = navMenu.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', String(open));
    });
    navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('click', e => { if (!navbar.contains(e.target)) closeMenu(); });

    let ticking = false;
    function onScroll() {
        ticking = false;
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        navbar.classList.toggle('scrolled', y > 30);
        progressTop.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    /* ---------- 3. Reveal ---------- */
    const revealEls = [...document.querySelectorAll('.reveal')];
    if ('IntersectionObserver' in window && !reducedMotion) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(el => {
            const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
            el.style.transitionDelay = (siblings.indexOf(el) % 4) * 90 + 'ms';
            io.observe(el);
        });
    } else {
        revealEls.forEach(el => el.classList.add('in'));
    }
})();
