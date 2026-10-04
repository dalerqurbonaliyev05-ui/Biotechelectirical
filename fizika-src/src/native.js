// Faqat Android ilova (NATIVE=1 build) uchun: Capacitor plaginlarini ilovaga beradi.
// app.js dan oldin yuklanadi (index.html da), shuning uchun remote.js ularni tayyor holda topadi.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

if (Capacitor.isNativePlatform()) {
  window.FizikaNative = { App, Browser, platform: Capacitor.getPlatform() };
  document.documentElement.classList.add('native');
}
