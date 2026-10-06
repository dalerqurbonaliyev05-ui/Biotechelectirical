/* =========================================================
   EnergyVibe — script.js
   1. i18n (UZ / RU / EN)   2. navigation, progress, voltage rail
   3. reveal on scroll      4. skill gauges
   5. hero (waves, glow, parallax)   6. contact form
   ========================================================= */

/* ---------- 1. Translations ---------- */
const I18N = {
    uz: {
        title: 'EnergyVibe — Daler Qurbonaliyev | Elektr ta’minoti muhandisi',
        meta: 'Elektr ta’minoti muhandisi Daler Qurbonaliyevning shaxsiy sayti: energetika loyihalari, hisob-kitob vositalari va simulyatorlar.',
        skip: 'Asosiy mazmunga o‘tish',
        'nav.about': 'Men haqimda', 'nav.tools': 'Vositalar', 'nav.skills': 'Yo‘nalishlar', 'nav.projects': 'Loyihalar', 'nav.contact': 'Aloqa', 'nav.app': 'Rele Lug‘at', 'nav.food': 'Uy taomlari', 'nav.pets': 'Mushuk va Itlar', 'nav.phys': 'Fizika', 'nav.elektr': 'ElektrUy',
        'hero.eyebrow': 'Elektr ta’minoti muhandisi',
        'hero.hello': 'Salom, men', 'hero.name': 'Daler',
        'hero.lead': 'Texnika va texnologiyada biz bilan yangi loyihalar yarating.',
        'hero.cta1': 'Loyihalarimiz', 'hero.cta2': 'Bog‘lanish', 'hero.cta3': 'Vositalarni ochish',
        'about.title': 'Men haqimda',
        'about.text': 'Elektr ta’minoti yo‘nalishidagi mutaxassis. Muhandislik hisob-kitoblari va loyihalash dasturlari (AutoCAD, Compass-3D, MATLAB, Mathcad) bilan ishlash tajribasiga ega. Energetika ob’ektlarini loyihalash bo‘yicha tugallangan amaliy loyihaga ega bo‘lib, texnik hujjatlar bilan ishlash va tizimlarni optimallashtirish bo‘yicha ko‘nikmalarimni rivojlantirib boryapman.',
        'about.s1': 'Loyihalar', 'about.s2': 'Yil tajriba', 'about.s3': 'Buyurtmachilar',
        'about.cap': 'Bir chiziqli sxema: 10 kV → transformator → 0,4 kV iste’molchilar',
        'tools.title': 'Muhandislik vositalari',
        'tools.lead': 'Sayt ichidagi amaliy dasturlar, simulyatorlar va hisob-kitob vositalari.',
        'tools.open': 'Ochish →',
        'tools.t1.tag': 'Simulyator', 'tools.t1.title': 'Energetika sistemasi', 'tools.t1.desc': 'IES, AES va quyosh EES stansiyalari hamda iste’molchilar demo modeli.',
        'tools.t2.tag': 'Prototip', 'tools.t2.title': 'RES tizimi loyihasi', 'tools.t2.desc': 'RES amaliyot portali prototipi: talaba kabineti va boshqaruv (admin) paneli.',
        'tools.t3.tag': 'Animatsiya', 'tools.t3.title': 'Aholi iste’moli', 'tools.t3.desc': '10 kV liniyadan transformator orqali 0,4 kV aholi tarmog‘igacha taqsimot animatsiyasi.',
        'tools.t4.tag': 'Kurs loyihasi', 'tools.t4.title': 'EET kurs loyihasi', 'tools.t4.desc': 'Elektr tarmoqlari kurs loyihasi va uni tekshiruvchi dastur.',
        'tools.t5.tag': 'Kalkulyator', 'tools.t5.title': 'Iqtisodiy kalkulyator', 'tools.t5.desc': 'Elektr energiyasi sarfi va xarajatini hisoblash kalkulyatori.',
        'tools.t6.tag': 'Grafik', 'tools.t6.title': 'Yuklama grafigi', 'tools.t6.desc': 'Sutkalik elektr yuklamalari grafigi va eng katta/eng kichik yuklama vaqtlari.',
        'skills.title': 'Yo‘nalishlar',
        'skills.c1': 'Elektr tarmoq tizimlari', 'skills.c2': 'Elektr xavfsizligi va ishonchliligi', 'skills.c3': 'Rele himoyasi',
        'skills.s1': 'Elektr montaj', 'skills.s2': 'Himoya vositalari', 'skills.s3': 'Avtomatlarni o‘rnatish', 'skills.s4': 'Avtomatlarni sozlash',
        'projects.title': 'Kelajakdagi loyihalar',
        'projects.p1.title': 'Simsiz elektr energiya uzatish',
        'projects.p1.desc': 'Bu texnologiya asosan elektromagnit induksiya qonuniyatlariga asoslanadi. Energetika tili bilan aytganda, bu “havo orqali ishlaydigan transformator”ga o‘xshaydi.',
        'projects.p2.title': 'Vodorod generatori',
        'projects.p2.desc': 'Quyosh panellari kunduzi ortiqcha tok ishlab chiqarganda, uni akkumulyatorga emas, vodorod generatoriga yo‘naltirish mumkin. Hosil bo‘lgan vodorod tanklarda saqlanadi.',
        'projects.p3.title': 'Aqlli hisoblagich',
        'projects.p3.desc': 'Bu nafaqat iste’mol qilingan elektr energiyasini hisoblovchi, balki ma’lumotlarni masofadan turib real vaqt rejimida energiya ta’minoti korxonasiga uzatuvchi zamonaviy mikroprotsessorli qurilmadir.',
        'projects.tag1': 'Iqtidorli talabalar', 'projects.tag2': 'Zamonaviy laboratoriya', 'projects.tag3': 'Aniq hisob-kitoblar',
        'projects.more': 'Batafsil →',
        'contact.title': 'Bog‘lanish',
        'contact.lead': 'Sizda yangi loyihalar bormi? Biz bilan bog‘laning.',
        'form.name': 'Ismingiz', 'form.message': 'Loyihangiz haqida', 'form.send': 'Xabarni yuborish',
        'form.sending': 'Yuborilmoqda…',
        'form.ok': 'Rahmat! Xabaringiz yuborildi.',
        'form.err': 'Xabar yuborilmadi. Iltimos, qayta urinib ko‘ring yoki email orqali yozing.',
        'footer.tag': 'Real loyihalar, aniq hisob-kitoblar.'
    },
    ru: {
        title: 'EnergyVibe — Далер Курбоналиев | Инженер электроснабжения',
        meta: 'Личный сайт инженера-электроэнергетика Далера Курбоналиева: энергетические проекты, инструменты расчёта и симуляторы.',
        skip: 'Перейти к содержимому',
        'nav.about': 'Обо мне', 'nav.tools': 'Инструменты', 'nav.skills': 'Направления', 'nav.projects': 'Проекты', 'nav.contact': 'Контакты', 'nav.app': 'Rele Lug‘at', 'nav.food': 'Домашняя еда', 'nav.pets': 'Кошки и собаки', 'nav.phys': 'Физика', 'nav.elektr': 'ElektrUy',
        'hero.eyebrow': 'Инженер электроснабжения',
        'hero.hello': 'Привет, я', 'hero.name': 'Далер',
        'hero.lead': 'Создавайте новые проекты в технике и технологиях вместе с нами.',
        'hero.cta1': 'Наши проекты', 'hero.cta2': 'Связаться', 'hero.cta3': 'Открыть инструменты',
        'about.title': 'Обо мне',
        'about.text': 'Специалист в области электроснабжения. Имею опыт работы с инженерными расчётами и программами проектирования (AutoCAD, Compass-3D, MATLAB, Mathcad). Выполнил завершённый практический проект по проектированию энергетических объектов и продолжаю развивать навыки работы с технической документацией и оптимизации систем.',
        'about.s1': 'Проекты', 'about.s2': 'Лет опыта', 'about.s3': 'Заказчики',
        'about.cap': 'Однолинейная схема: 10 кВ → трансформатор → потребители 0,4 кВ',
        'tools.title': 'Инженерные инструменты',
        'tools.lead': 'Практические программы, симуляторы и расчётные инструменты прямо на сайте.',
        'tools.open': 'Открыть →',
        'tools.t1.tag': 'Симулятор', 'tools.t1.title': 'Энергосистема', 'tools.t1.desc': 'Демо-модель станций (ТЭС, АЭС, солнечная ЭС) и потребителей.',
        'tools.t2.tag': 'Прототип', 'tools.t2.title': 'Проект системы РЭС', 'tools.t2.desc': 'Прототип портала практики РЭС: кабинет студента и панель управления (админ).',
        'tools.t3.tag': 'Анимация', 'tools.t3.title': 'Потребление населения', 'tools.t3.desc': 'Анимация распределения: линия 10 кВ → трансформатор → сеть населения 0,4 кВ.',
        'tools.t4.tag': 'Курсовой проект', 'tools.t4.title': 'Курсовой проект ЭТ', 'tools.t4.desc': 'Курсовой проект по электрическим сетям и программа его проверки.',
        'tools.t5.tag': 'Калькулятор', 'tools.t5.title': 'Экономический калькулятор', 'tools.t5.desc': 'Калькулятор расхода электроэнергии и затрат на неё.',
        'tools.t6.tag': 'График', 'tools.t6.title': 'График нагрузки', 'tools.t6.desc': 'Суточный график электрических нагрузок, время максимума и минимума нагрузки.',
        'skills.title': 'Направления',
        'skills.c1': 'Электросетевые системы', 'skills.c2': 'Электробезопасность и надёжность', 'skills.c3': 'Релейная защита',
        'skills.s1': 'Электромонтаж', 'skills.s2': 'Средства защиты', 'skills.s3': 'Установка автоматов', 'skills.s4': 'Настройка автоматов',
        'projects.title': 'Проекты будущего',
        'projects.p1.title': 'Беспроводная передача электроэнергии',
        'projects.p1.desc': 'Технология основана на законах электромагнитной индукции. На языке энергетики это похоже на «трансформатор, работающий через воздух».',
        'projects.p2.title': 'Водородный генератор',
        'projects.p2.desc': 'Когда солнечные панели днём вырабатывают избыточный ток, его можно направить не в аккумулятор, а в водородный генератор. Полученный водород хранится в баллонах.',
        'projects.p3.title': 'Умный счётчик',
        'projects.p3.desc': 'Современное микропроцессорное устройство, которое не только учитывает потреблённую электроэнергию, но и дистанционно передаёт данные энергоснабжающей организации в реальном времени.',
        'projects.tag1': 'Талантливые студенты', 'projects.tag2': 'Современная лаборатория', 'projects.tag3': 'Точные расчёты',
        'projects.more': 'Подробнее →',
        'contact.title': 'Контакты',
        'contact.lead': 'Есть новые проекты? Свяжитесь с нами.',
        'form.name': 'Ваше имя', 'form.message': 'О вашем проекте', 'form.send': 'Отправить сообщение',
        'form.sending': 'Отправка…',
        'form.ok': 'Спасибо! Ваше сообщение отправлено.',
        'form.err': 'Не удалось отправить. Попробуйте ещё раз или напишите на email.',
        'footer.tag': 'Реальные проекты, точные расчёты.'
    },
    en: {
        title: 'EnergyVibe — Daler Qurbonaliyev | Power Supply Engineer',
        meta: 'Personal website of power supply engineer Daler Qurbonaliyev: energy projects, calculation tools and simulators.',
        skip: 'Skip to main content',
        'nav.about': 'About', 'nav.tools': 'Tools', 'nav.skills': 'Expertise', 'nav.projects': 'Projects', 'nav.contact': 'Contact', 'nav.app': 'Rele Lug‘at', 'nav.food': 'Home Food', 'nav.pets': 'Cats & Dogs', 'nav.phys': 'Physics', 'nav.elektr': 'ElektrUy',
        'hero.eyebrow': 'Power supply engineer',
        'hero.hello': 'Hi, I’m', 'hero.name': 'Daler',
        'hero.lead': 'Create new projects in engineering and technology with us.',
        'hero.cta1': 'Our projects', 'hero.cta2': 'Get in touch', 'hero.cta3': 'Open the tools',
        'about.title': 'About me',
        'about.text': 'A specialist in electrical power supply. I have hands-on experience with engineering calculations and design software (AutoCAD, Compass-3D, MATLAB, Mathcad). I have completed a practical project on designing energy facilities and keep developing my skills in technical documentation and system optimisation.',
        'about.s1': 'Projects', 'about.s2': 'Years of experience', 'about.s3': 'Clients',
        'about.cap': 'Single-line diagram: 10 kV → transformer → 0.4 kV consumers',
        'tools.title': 'Engineering tools',
        'tools.lead': 'Practical programs, simulators and calculation tools available on this site.',
        'tools.open': 'Open →',
        'tools.t1.tag': 'Simulator', 'tools.t1.title': 'Power system', 'tools.t1.desc': 'A demo model of power stations (thermal, nuclear, solar) and consumers.',
        'tools.t2.tag': 'Prototype', 'tools.t2.title': 'RES system project', 'tools.t2.desc': 'Prototype of the RES internship portal: student account and admin control panel.',
        'tools.t3.tag': 'Animation', 'tools.t3.title': 'Residential consumption', 'tools.t3.desc': 'Distribution animation: 10 kV line → transformer → 0.4 kV residential network.',
        'tools.t4.tag': 'Course project', 'tools.t4.title': 'EET course project', 'tools.t4.desc': 'Electrical networks course project and its checking tool.',
        'tools.t5.tag': 'Calculator', 'tools.t5.title': 'Economic calculator', 'tools.t5.desc': 'A calculator for electricity consumption and its cost.',
        'tools.t6.tag': 'Chart', 'tools.t6.title': 'Load curve', 'tools.t6.desc': 'Daily electrical load curve with the times of maximum and minimum load.',
        'skills.title': 'Expertise',
        'skills.c1': 'Electrical network systems', 'skills.c2': 'Electrical safety and reliability', 'skills.c3': 'Relay protection',
        'skills.s1': 'Electrical installation', 'skills.s2': 'Protective equipment', 'skills.s3': 'Circuit breaker installation', 'skills.s4': 'Circuit breaker setup',
        'projects.title': 'Future projects',
        'projects.p1.title': 'Wireless power transfer',
        'projects.p1.desc': 'The technology is based on the laws of electromagnetic induction. In power-engineering terms, it is like a “transformer that works through the air”.',
        'projects.p2.title': 'Hydrogen generator',
        'projects.p2.desc': 'When solar panels produce surplus current during the day, it can be sent to a hydrogen generator instead of a battery. The hydrogen produced is stored in tanks.',
        'projects.p3.title': 'Smart meter',
        'projects.p3.desc': 'A modern microprocessor-based device that not only measures the electricity consumed but also transmits data to the utility remotely, in real time.',
        'projects.tag1': 'Talented students', 'projects.tag2': 'Modern laboratory', 'projects.tag3': 'Precise calculations',
        'projects.more': 'Learn more →',
        'contact.title': 'Contact',
        'contact.lead': 'Have a new project? Get in touch with us.',
        'form.name': 'Your name', 'form.message': 'About your project', 'form.send': 'Send message',
        'form.sending': 'Sending…',
        'form.ok': 'Thank you! Your message has been sent.',
        'form.err': 'Could not send the message. Please try again or write by email.',
        'footer.tag': 'Real projects, precise calculations.'
    }
};

const LANG_KEY = 'energyvibe-lang';
let currentLang = 'uz';

function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.uz[key] || key;
}

function setLang(lang) {
    if (!I18N[lang]) lang = 'uz';
    currentLang = lang;
    document.documentElement.lang = lang;
    document.title = t('title');
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta'));

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage may be blocked */ }
}

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

let saved = null;
try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* ignore */ }
setLang(saved && I18N[saved] ? saved : 'uz');

/* ---------- 2. Navigation, progress bar, voltage rail ---------- */
const navbar = document.getElementById('navbar');
const navMenu = document.getElementById('nav-menu');
const hamburger = document.getElementById('hamburger');
const progressTop = document.getElementById('progress-top');
const heroPhoto = document.getElementById('hero-photo');
const rail = document.getElementById('rail');
const railItems = [...rail.querySelectorAll('li')];
const navLinks = [...navMenu.querySelectorAll('a')];
const hero = document.getElementById('home');
const stationIds = railItems.map(li => li.dataset.target);
const stationEls = stationIds.map(id => document.getElementById(id));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function closeMenu() {
    navMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
}
hamburger.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
});
navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
document.addEventListener('click', e => {
    if (!navbar.contains(e.target)) closeMenu();
});
railItems.forEach(li => li.addEventListener('click', () => {
    const el = document.getElementById(li.dataset.target);
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}));

let ticking = false;
function onScroll() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const doc = document.documentElement;

    navbar.classList.toggle('scrolled', y > 30);

    const max = doc.scrollHeight - vh;
    progressTop.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';

    if (!reducedMotion && heroPhoto && y < vh * 1.3) {
        heroPhoto.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
    }

    // active station
    let active = -1;
    stationEls.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= vh * 0.4) active = i;
    });
    navLinks.forEach(a => {
        const idx = stationIds.indexOf(a.getAttribute('href').slice(1));
        a.classList.toggle('active', idx !== -1 && idx === active);
    });
    railItems.forEach((li, i) => {
        li.classList.toggle('on', i === active);
        li.classList.toggle('done', i < active);
    });

    // rail progress: from the first station to the last one
    const start = stationEls[0].offsetTop;
    const end = stationEls[stationEls.length - 1].offsetTop;
    const p = Math.max(0, Math.min(1, (y + vh * 0.4 - start) / (end - start)));
    rail.style.setProperty('--p', p.toFixed(3));
    rail.classList.toggle('show', y > hero.offsetHeight * 0.55);
}
window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* ---------- 3. Reveal on scroll ---------- */
const revealEls = [...document.querySelectorAll('.reveal')];
if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => {
        const siblings = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
        el.style.transitionDelay = (siblings.indexOf(el) % 4) * 90 + 'ms';
        revealObserver.observe(el);
    });
} else {
    revealEls.forEach(el => el.classList.add('in'));
}

/* ---------- 4. Skill gauges ---------- */
function setGauge(g) {
    const v = Math.max(0, Math.min(100, Number(g.dataset.value) || 0));
    const fill = g.querySelector('.g-fill');
    const needle = g.querySelector('.g-needle');
    fill.style.strokeDasharray = v + ' 100';
    needle.style.transform = 'rotate(' + (-90 + v * 1.8) + 'deg)';
}
const gaugeEls = [...document.querySelectorAll('.gauge')];
if ('IntersectionObserver' in window && !reducedMotion) {
    const gaugeObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.gauge').forEach((g, i) => setTimeout(() => setGauge(g), 250 + i * 200));
                gaugeObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.4 });
    document.querySelectorAll('.skill-category').forEach(c => gaugeObserver.observe(c));
} else {
    gaugeEls.forEach(setGauge);
}

/* ---------- 5. Hero: three-phase waves + cursor glow ---------- */
(function heroFx() {
    const canvas = document.getElementById('phase-canvas');
    const glow = document.getElementById('hero-glow');

    if (glow) {
        hero.addEventListener('pointermove', e => {
            const r = hero.getBoundingClientRect();
            glow.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
            glow.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
        }, { passive: true });
    }
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = ['#ffd23f', '#2fd6a3', '#ff4d79'];   // A yellow, B green, C red
    let W = 0, H = 0, dpr = 1, phase = 0, visible = true;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = canvas.clientWidth; H = canvas.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const period = W < 640 ? 300 : 520;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.strokeStyle = colors[k];
            ctx.shadowColor = colors[k];
            ctx.shadowBlur = 12;
            ctx.globalAlpha = 0.92;
            for (let x = -4; x <= W + 4; x += 3) {
                const a = (x / period) * Math.PI * 2 - phase - k * (2 * Math.PI / 3);
                const y = H / 2 - Math.sin(a) * (H * 0.36);
                x === -4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    function loop() {
        if (visible) { phase += 0.035; draw(); }
        requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
    }
    if (!reducedMotion) requestAnimationFrame(loop);
})();

/* ---------- 6. Contact form (real result, not a fake success) ---------- */
const form = document.getElementById('contact-form');
const statusEl = document.getElementById('form-status');
const sendLabel = form.querySelector('.send-label');

form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    sendLabel.textContent = t('form.sending');
    statusEl.className = 'form-status';
    statusEl.textContent = '';

    try {
        const res = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        statusEl.classList.add('ok');
        statusEl.textContent = t('form.ok');
    } catch (err) {
        statusEl.classList.add('err');
        statusEl.textContent = t('form.err');
    } finally {
        btn.disabled = false;
        sendLabel.textContent = t('form.send');
    }
});
