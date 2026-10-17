// localStorage bilan ishlash (har doim try/catch bilan)
const SAVE_KEY = 'muhandis-oyini:save:v1';
const SET_KEY = 'muhandis-oyini:settings:v1';

export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function writeSave(game) {
  try {
    localStorage.setItem(SAVE_KEY, game.serialize());
    return true;
  } catch {
    return false;
  }
}
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* e'tiborsiz */
  }
}
export const DEFAULT_SETTINGS = { sound: false, textSize: 'normal', difficulty: 'normal', mode: 'day', tutorialDone: false };
export function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SET_KEY) || '{}')) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
export function writeSettings(s) {
  try {
    localStorage.setItem(SET_KEY, JSON.stringify(s));
  } catch {
    /* e'tiborsiz */
  }
}
