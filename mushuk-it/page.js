/* Mushuk va Itlarni Top yuklab olish sahifasi: til almashtirish (uz/ru/en), APK ma'lumotlari, navigatsiya, progress, reveal. */
(function () {
    'use strict';
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- 1. APK ma'lumotlari (config.js) ---------- */
    const cfg = window.MUSHUKIT;
    if (cfg) {
        document.querySelectorAll('[data-dl]').forEach(a => a.setAttribute('href', cfg.FILE));
        document.querySelectorAll('[data-v]').forEach(v => { v.textContent = cfg.VERSION; });
        document.querySelectorAll('[data-size]').forEach(s => { s.textContent = (cfg.BYTES / 1048576).toFixed(1); });
        document.querySelectorAll('[data-hash]').forEach(h => { h.textContent = cfg.SHA256; });
    }
    if (document.documentElement.getAttribute('data-platform') === 'ios') {
        const note = document.getElementById('ios-note'); if (note) note.hidden = false;
    }
    const year = document.getElementById('year'); if (year) year.textContent = new Date().getFullYear();

    /* ---------- 2. Til (saytdagi bilan bir xil kalit: energyvibe-lang) ---------- */
    const LANG_KEY = 'energyvibe-lang';
    const DICT = window.MU_I18N || {};
    function setLang(lang) {
        if (!DICT[lang]) lang = 'uz';
        const d = DICT[lang];
        document.documentElement.lang = lang;
        if (d['meta.title']) document.title = d['meta.title'];
        const meta = document.querySelector('meta[name="description"]');
        if (meta && d['meta.desc']) meta.setAttribute('content', d['meta.desc']);
        document.querySelectorAll('[data-i18n]').forEach(el => { const v = d[el.dataset.i18n]; if (v != null) el.textContent = v; });
        // data-i18n-h: ishonchli statik lug'at (lang.js) dan, <b>, <code>, <span> teglari bilan
        document.querySelectorAll('[data-i18n-h]').forEach(el => { const v = d[el.dataset.i18nH]; if (v != null) el.innerHTML = v; });
        document.querySelectorAll('img[data-shot]').forEach(img => { img.setAttribute('src', '/mushuk-it/img/' + lang + '-' + img.dataset.shot + '.webp'); });
        document.querySelectorAll('.lang-btn').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang)));
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* xotira yopiq bo'lishi mumkin */ }
    }
    document.querySelectorAll('.lang-btn').forEach(btn => btn.addEventListener('click', () => setLang(btn.dataset.lang)));
    let saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* e'tiborsiz */ }
    const nav = (navigator.language || 'uz').slice(0, 2).toLowerCase();
    setLang(saved && DICT[saved] ? saved : (nav === 'ru' ? 'ru' : nav === 'en' ? 'en' : 'uz'));

    /* ---------- 3. Navigatsiya, progress chizig'i ---------- */
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

    /* ---------- 4. Reveal ---------- */
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
