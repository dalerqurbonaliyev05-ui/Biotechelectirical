/* Fizika sahifalari: menyu, APK ma'lumoti, yo'riqnoma mundarijasi */
(function () {
    'use strict';
    var d = document;

    var y = d.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());

    // navbar: aylantirilganda soya, mobil menyu
    var nav = d.getElementById('navbar');
    var menu = d.getElementById('nav-menu');
    var burger = d.getElementById('hamburger');
    function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 10); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (menu && burger) {
        var close = function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
        burger.addEventListener('click', function () {
            var open = menu.classList.toggle('open');
            burger.setAttribute('aria-expanded', String(open));
        });
        menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
        d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }

    // APK ma'lumoti (apk-info.js ni GitHub Actions yangilaydi)
    var apk = window.FIZIKA_APK || {};
    var ready = apk.BYTES > 0;
    function mb(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
    d.querySelectorAll('[data-apk-link]').forEach(function (a) {
        if (ready) {
            a.href = apk.FILE;
            a.setAttribute('download', 'fizika.apk');
        } else {
            a.href = '#download';
            a.setAttribute('aria-disabled', 'true');
            var t = a.querySelector('[data-apk-label]');
            if (t) t.textContent = 'APK tayyorlanmoqda';
        }
    });
    d.querySelectorAll('[data-apk]').forEach(function (el) {
        var k = el.getAttribute('data-apk');
        if (!ready) { el.textContent = k === 'meta' ? 'APK yig‘ilmoqda — bir necha daqiqadan so‘ng sahifani yangilang.' : '—'; return; }
        if (k === 'version') el.textContent = apk.VERSION;
        else if (k === 'size') el.textContent = mb(apk.BYTES);
        else if (k === 'sha') el.textContent = apk.SHA256;
        else if (k === 'date') el.textContent = apk.DATE || '—';
        else if (k === 'meta') el.textContent = 'Versiya ' + apk.VERSION + ', ' + mb(apk.BYTES) + ', Android 5.1 va undan yuqori.';
    });

    // yo'riqnoma: joriy bo'limni mundarijada belgilash
    var toc = d.querySelectorAll('.fz-toc a[href^="#"]');
    if (toc.length && 'IntersectionObserver' in window) {
        var map = {};
        toc.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (!e.isIntersecting) return;
                toc.forEach(function (a) { a.removeAttribute('aria-current'); });
                var a = map[e.target.id];
                if (a) a.setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-30% 0px -60% 0px' });
        Object.keys(map).forEach(function (id) { var s = d.getElementById(id); if (s) io.observe(s); });
    }
})();
