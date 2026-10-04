import { Config } from '@remotion/cli/config';

// H.264 .mp4 (TikTok / Reels / Shorts uchun mos). CRF past = sifat yuqori (fayl kattaroq).
Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setCrf(18);
Config.setOverwriteOutput(true);
