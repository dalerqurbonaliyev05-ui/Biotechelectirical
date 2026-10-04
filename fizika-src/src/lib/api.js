import { localApi } from './local.js';
import { remoteApi } from './remote.js';

const cfg = window.FIZIKA_CONFIG || {};
const forceDemo = /[?&]demo(=1)?\b/.test(location.search) || cfg.demo;
export const api = !forceDemo && cfg.supabaseUrl && cfg.supabaseKey ? remoteApi : localApi;
export const isDemo = api.mode === 'demo';
export const asset = p => (p ? (cfg.base || '') + p : null);
