from __future__ import annotations

import os
from dataclasses import dataclass
from zoneinfo import ZoneInfo

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    bot_token: str
    db_path: str
    tz: ZoneInfo
    # true bo'lsa, taklifnoma egasi o'z taklifnomasiga inline xabarda ham javob bera oladi
    # (bitta akkaunt bilan sinash uchun qulay). Bot bilan shaxsiy chatdagi
    # "🧪 Sinab ko'rish" nusxasida bu har doim ruxsat etilgan.
    allow_self_answer: bool


def load_settings() -> Settings:
    load_dotenv()
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        raise SystemExit("BOT_TOKEN topilmadi — .env.example asosida .env fayl yarating.")
    return Settings(
        bot_token=token,
        db_path=os.getenv("DB_PATH", "taklifnoma.db"),
        tz=ZoneInfo(os.getenv("TZ_NAME", "Asia/Tashkent")),
        allow_self_answer=os.getenv("ALLOW_SELF_ANSWER", "false").lower() in ("1", "true", "yes"),
    )
