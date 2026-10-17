import { createJSONStorage, type StateStorage } from "zustand/middleware";

// localStorage ba'zan mavjud emas (SSR, maxfiy oyna, bloklangan sayt ma'lumotlari) —
// shuning uchun har bir murojaat try/catch bilan o'raladi va xatoda jim o'tib ketiladi.
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* saqlab bo'lmadi — o'yin baribir ishlaydi */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* e'tiborsiz */
    }
  },
};

export const STORAGE_PREFIX = "podstansiya-sim:v1:";
export const persistStorage = createJSONStorage(() => safeLocalStorage);
