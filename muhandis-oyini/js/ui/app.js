// Ilova qobig'i: yuqori panel, topshiriq chizig'i, ekran almashtirish, modal oynalar, saqlash, real vaqt soati.
import { h, clear, icon } from './dom.js';
import { fmtClock, fmtNum, fmtSom, makeT } from '../util.js';
import { Game } from '../game/game.js';
import { readSave, writeSave, clearSave, readSettings, writeSettings } from '../game/storage.js';
import { setSound, beep } from './audio.js';
import * as Screens from './screens.js';
import * as Dialogs from './dialogs.js';

export class App {
  constructor(root, data) {
    this.root = root;
    this.data = data;
    this.t = data.t;
    this.cfg = data.config;
    this.settings = readSettings();
    this.game = null;
    this.screen = { name: 'menu', params: {} };
    this.modals = [];
    this.renderQueued = false;
    this.saveTimer = null;
    this.walking = false;
    setSound(this.settings.sound);
    this.applyTextSize();
    this.buildFrame();
    this.bindKeys();
    this.timer = setInterval(() => this.idle(), 1000);
    this.show('menu');
  }

  // ---------- Qobiq ----------

  buildFrame() {
    const t = this.t;
    this.elTop = h('header.topbar');
    this.elStrip = h('div.taskstrip');
    this.elMain = h('main#main', { tabindex: '-1' });
    this.elDrawer = h('aside.drawer', { 'aria-label': t('top.tasks') });
    this.elToasts = h('div.toasts', { 'aria-live': 'polite' });
    this.elModals = h('div.modals');
    clear(this.root);
    this.root.append(this.elTop, this.elStrip, this.elMain, this.elDrawer, this.elToasts, this.elModals);
  }

  applyTextSize() {
    const sizes = { small: '15px', normal: '17px', large: '20px' };
    document.documentElement.style.fontSize = sizes[this.settings.textSize] || sizes.normal;
  }

  saveSettings() {
    writeSettings(this.settings);
    setSound(this.settings.sound);
    this.applyTextSize();
  }

  // ---------- O'yin hayoti ----------

  attach(game) {
    this.game = game;
    game.on('change', () => {
      this.scheduleRender();
      this.scheduleSave();
    });
    game.on('clock', () => this.updateChrome());
    game.on('message', ({ kind, text }) => {
      if (kind === 'alarm' || kind === 'warn') {
        this.toast(text, kind === 'alarm' ? 'bad' : 'warn');
        beep(kind === 'alarm' ? 'alarm' : 'error');
      }
    });
    game.on('accident', ({ text }) => Dialogs.openAccident(this, text));
    game.on('emergency', ({ id }) => {
      beep('alarm');
      this.toast(this.t('em.incoming'), 'bad');
      this.updateChrome();
      void id;
    });
    game.on('over', () => Dialogs.openShiftOver(this));
    game.on('burn', () => this.scheduleRender());
  }

  newGame(opts) {
    clearSave();
    const game = Game.create(this.data, opts);
    game.state.shiftNo = opts.mode === 'practice' ? null : (this.settings.shiftsDone || 0) + 1;
    this.attach(game);
    this.settings.difficulty = opts.difficulty;
    this.settings.mode = opts.mode;
    this.saveSettings();
    writeSave(game);
    this.show('briefing');
  }

  continueGame() {
    const saved = readSave();
    if (!saved) return false;
    try {
      const game = Game.restore(this.data, saved);
      this.attach(game);
      this.show(game.state.finished ? 'menu' : 'map');
      if (game.state.over && !game.state.finished) Dialogs.openShiftOver(this);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  hasSave() {
    const s = readSave();
    return !!s && !s.finished;
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      if (this.game && !this.game.state.finished) writeSave(this.game);
    }, 400);
  }

  idle() {
    const g = this.game;
    if (!g || g.state.over || g.state.finished) return;
    if (document.hidden) return;
    if (this.modals.length) return;
    if (!['map', 'location', 'equipment', 'energy'].includes(this.screen.name)) return;
    g.idleTick(1);
  }

  // ---------- Navigatsiya ----------

  show(name, params = {}) {
    this.screen = { name, params };
    this.render();
    this.elMain.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  scheduleRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      this.render();
    });
  }

  render() {
    const { name, params } = this.screen;
    const fn = Screens[name + 'Screen'];
    const scroll = window.scrollY;
    clear(this.elMain);
    this.elMain.className = 'screen screen-' + name;
    this.elMain.append(fn(this, params));
    this.updateChrome();
    this.renderDrawer();
    if (this.lastScreen === name) window.scrollTo(0, scroll);
    this.lastScreen = name;
  }

  inGame() {
    return !!this.game && ['map', 'location', 'equipment', 'energy', 'briefing'].includes(this.screen.name);
  }

  // ---------- Yuqori panel ----------

  updateChrome() {
    const g = this.game;
    const t = this.t;
    clear(this.elTop);
    clear(this.elStrip);
    this.elTop.hidden = !this.inGame();
    this.elStrip.hidden = !this.inGame();
    if (!this.inGame()) {
      document.body.classList.remove('ingame');
      return;
    }
    document.body.classList.add('ingame');
    const s = g.state;
    const clk = fmtClock(s.t, this.cfg.clock.startHour);
    const tot = g.totals();
    const live = g.liveScore();
    const costK = (K) => (K > this.cfg.limits.trMaxK ? 'bad' : K > this.cfg.limits.trOkK ? 'warn' : 'ok');
    const cosK = tot.cos >= this.cfg.limits.cosphiTarget ? 'ok' : tot.cos >= 0.85 ? 'warn' : 'bad';
    const kpi = (label, value, cls = '', title = '', ic = null) => h('div.kpi', { class: cls, title }, ic ? h('span.kpi-i', icon(ic)) : null, h('span.kpi-t', h('span.kpi-l', label), h('span.kpi-v', value)));
    const emActive = g.activeEmergencies();
    this.elTop.append(
      h('button.iconbtn', { onclick: () => Dialogs.openMenu(this), title: t('top.menu'), 'aria-label': t('top.menu') }, icon('menu')),
      h('div.brand', h('span.brand-i', icon('bolt')), h('span.brand-t', t('app.title'))),
      h('div.clock', { title: t('top.clock') }, icon('clock'), h('span', t('top.day', { n: clk.day }) + ' · ' + clk.text), s.over ? h('span.pill.bad', t('top.over')) : null),
      h('div.kpis',
        kpi(t('top.score'), live == null ? '—' : fmtNum(live, 0), '', t('top.scoreHint'), 'star'),
        kpi(t('top.load'), fmtNum(tot.P, 0) + ' kW', '', '', 'bolt'),
        kpi('cosφ', fmtNum(tot.cos, 2), cosK, t('top.cosHint'), 'gauge'),
        kpi('TM-1', 'K ' + fmtNum(tot.tm1.K, 2), costK(tot.tm1.K), t('top.kHint'), 'transformer'),
        kpi('TM-2', 'K ' + fmtNum(tot.tm2.K, 2), costK(tot.tm2.K), t('top.kHint'), 'transformer'),
        kpi(t('top.loss'), fmtSom(tot.loss), tot.loss > 2e7 ? 'warn' : '', t('top.lossHint'), 'coin')
      ),
      h('div.topbtns',
        emActive.length ? h('button.btn.bad.pulse', { onclick: () => Dialogs.openEmergency(this, emActive[0].id) }, icon('radio'), t('em.answer')) : null,
        h('button.iconbtn', { onclick: () => this.toggleDrawer(), title: t('top.tasks'), 'aria-label': t('top.tasks') }, icon('tasks'), g.openTasks().length ? h('span.badge', g.openTasks().length) : null),
        h('button.iconbtn', { onclick: () => Dialogs.openHelp(this), title: t('top.help'), 'aria-label': t('top.help') }, icon('help'))
      )
    );
    // topshiriq chizig'i
    const cur = s.current && s.tasks[s.current];
    const tut = g.tutorialInfo();
    if (tut) {
      this.elStrip.append(h('div.tutorial', h('strong', t('tut.title', { i: tut.index + 1, n: tut.total })), ' ', tut.text,
        tut.id === 'log' ? h('button.btn.small', { onclick: () => g.tutorialAdvance('log') }, t('tut.understood')) : null));
    }
    if (cur) {
      const def = g.taskDef(cur.id);
      const budget = g.budgetOf(cur.id);
      const pct = Math.min(100, (cur.minutes / budget) * 100);
      this.elStrip.append(
        h('div.curtask',
          h('div.curtask-t', h('span.code', cur.id), ' ', def.title),
          def.tutorial ? null : h('div.curtask-m', h('div.bar', h('i', { style: { width: pct + '%' }, class: pct > 100 ? 'bad' : pct > 75 ? 'warn' : '' })), h('span', t('top.taskTime', { m: Math.round(cur.minutes), b: Math.round(budget) }))),
          h('div.curtask-b',
            h('button.btn.small', { onclick: () => Dialogs.openBriefing(this, cur.id) }, t('task.details')),
            g.diff.hintsAllowed && !def.tutorial ? h('button.btn.small', { onclick: () => Dialogs.openHint(this, cur.id) }, icon('hint'), t('task.hint')) : null
          )
        )
      );
    } else if (!tut) {
      this.elStrip.append(h('div.curtask.none', t('task.none'), ' ', h('button.btn.small', { onclick: () => this.toggleDrawer(true) }, t('task.choose'))));
    }
  }

  // ---------- Topshiriqlar paneli ----------

  toggleDrawer(force) {
    const open = force != null ? force : !this.elDrawer.classList.contains('open');
    this.elDrawer.classList.toggle('open', open);
    document.body.classList.toggle('drawer-open', open);
    this.renderDrawer();
  }

  renderDrawer() {
    clear(this.elDrawer);
    if (!this.game || !this.inGame()) {
      this.elDrawer.classList.remove('open');
      return;
    }
    const g = this.game;
    const t = this.t;
    const s = g.state;
    const list = h('div.tasklist');
    for (const id of s.order) {
      const tk = s.tasks[id];
      const def = g.taskDef(id);
      const st = tk.status;
      const w = g.taskWeight(id);
      list.append(
        h('div.taskrow', { class: `${st} ${s.current === id ? 'current' : ''}` },
          h('div.taskrow-h', h('span.code', id), h('span.taskrow-t', def.title)),
          h('div.taskrow-m',
            h('span.pill', { class: st === 'done' ? 'ok' : st === 'failed' ? 'bad' : st === 'new' ? '' : 'warn' }, t('task.status.' + st)),
            def.tutorial ? null : h('span.pill', { title: t('task.priorityHint') }, t('task.priority') + ': ' + (w >= 6 ? t('task.p.high') : w >= 3 ? t('task.p.mid') : t('task.p.low'))),
            tk.score && !def.tutorial ? h('span.pill', fmtNum(tk.score.total, 0) + ' ' + t('top.pts')) : null,
            tk.burned ? h('span.pill.bad', t('task.burned')) : null
          ),
          ['done', 'failed'].includes(st) ? null : h('div.taskrow-b',
            h('button.btn.small', { onclick: () => { g.selectTask(id); this.toggleDrawer(false); } }, s.current === id ? t('task.current') : t('task.select')),
            h('button.btn.small.ghost', { onclick: () => Dialogs.openBriefing(this, id) }, t('task.details'))
          )
        )
      );
    }
    const logWrap = h('div.radiolog');
    for (const e of s.log.slice(-30).reverse()) {
      const c = fmtClock(e.t, this.cfg.clock.startHour);
      logWrap.append(h('div.logrow', { class: e.kind }, h('span.logt', c.text), h('span', e.text)));
    }
    this.elDrawer.append(
      h('div.drawer-h', h('strong', t('top.tasks')), h('button.iconbtn', { onclick: () => this.toggleDrawer(false), 'aria-label': t('common.close') }, icon('cross'))),
      list,
      h('div.drawer-h2', icon('radio'), t('top.radio')),
      logWrap
    );
  }

  // ---------- Modal va xabarlar ----------

  openModal(content, { title = '', wide = false, dismissible = true, className = '', onClose = null } = {}) {
    const overlay = h('div.overlay');
    const card = h('div.modal', { class: `${wide ? 'wide' : ''} ${className}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const handle = {
      el: card,
      body: null,
      close: () => {
        overlay.remove();
        this.modals = this.modals.filter((m) => m !== handle);
        document.body.classList.toggle('modal-open', this.modals.length > 0);
        onClose?.();
      },
      dismissible
    };
    const head = title ? h('div.modal-h', h('h2', title), dismissible ? h('button.iconbtn', { onclick: handle.close, 'aria-label': this.t('common.close') }, icon('cross')) : null) : null;
    const body = h('div.modal-b');
    handle.body = body;
    handle.setContent = (node) => {
      clear(body);
      body.append(node);
    };
    body.append(content);
    card.append(...(head ? [head] : []), body);
    overlay.append(card);
    if (dismissible) overlay.addEventListener('mousedown', (ev) => ev.target === overlay && handle.close());
    this.elModals.append(overlay);
    this.modals.push(handle);
    document.body.classList.add('modal-open');
    card.setAttribute('tabindex', '-1');
    card.focus({ preventScroll: true });
    return handle;
  }

  closeTopModal() {
    const m = this.modals[this.modals.length - 1];
    if (m && m.dismissible) m.close();
  }

  closeAllModals() {
    for (const m of [...this.modals]) m.close();
  }

  toast(text, kind = 'info', ms = 5000) {
    const el = h('div.toast', { class: kind, role: 'status' }, text);
    while (this.elToasts.children.length >= 3) this.elToasts.firstChild.remove();
    this.elToasts.append(el);
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 400);
  }

  // ---------- Harakat (xarita) ----------

  /** Xaritada belgilangan joyga yurish va kirish */
  async walkTo(locId) {
    const g = this.game;
    if (this.walking) return;
    if (g.state.over) {
      Dialogs.openShiftOver(this);
      return;
    }
    if (g.state.player.loc === locId) {
      this.show('location', { loc: locId });
      return;
    }
    this.walking = true;
    const el = this.elMain.querySelector('.player');
    const target = g.locs[locId];
    if (el) el.style.transform = `translate(${target.x}px, ${target.y + target.h / 2 + 20}px)`;
    beep('click');
    await new Promise((r) => setTimeout(r, el ? 650 : 0));
    this.walking = false;
    g.goTo(locId);
    this.show('location', { loc: locId });
  }

  bindKeys() {
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (this.modals.length) this.closeTopModal();
        else if (this.elDrawer.classList.contains('open')) this.toggleDrawer(false);
        return;
      }
      if (this.modals.length || !this.game) return;
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.key.toLowerCase() === 'm' && this.inGame()) this.show('map');
      if (ev.key.toLowerCase() === 't' && this.inGame()) this.toggleDrawer();
      if (this.screen.name === 'map') Screens.mapKey(this, ev);
    });
  }
}
