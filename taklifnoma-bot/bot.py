"""TaklifnomaBot — kirish nuqtasi.

Ishga tushirish:  python bot.py
"""
from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand

from config import Settings, load_settings
from handlers import callbacks, common, create_flow, inline_mode, mine
from services.db import Database
from services.i18n import LANGS, t
from services.middlewares import LangMiddleware


def build_dispatcher(db: Database, settings: Settings) -> Dispatcher:
    # db va settings har bir handlerga argument sifatida uzatiladi
    dp = Dispatcher(storage=MemoryStorage(), db=db, settings=settings)

    lang_mw = LangMiddleware()
    dp.message.outer_middleware(lang_mw)
    dp.callback_query.outer_middleware(lang_mw)
    dp.inline_query.outer_middleware(lang_mw)

    # Tartib muhim: /mine va /help yaratish bosqichidagi matn handlerlaridan oldin,
    # fallback esa eng oxirida turishi kerak.
    dp.include_routers(
        callbacks.router,
        inline_mode.router,
        mine.router,
        common.router,
        create_flow.router,
        common.fallback_router,
    )
    return dp


async def set_commands(bot: Bot) -> None:
    for lang in LANGS:
        commands = [
            BotCommand(command=name, description=t(lang, f"commands.{name}"))
            for name in ("start", "new", "mine", "help")
        ]
        # Standart (til ko'rsatilmagan) foydalanuvchilar uchun — o'zbekcha
        await bot.set_my_commands(commands, language_code=None if lang == "uz" else lang)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    settings = load_settings()

    db = Database(settings.db_path)
    await db.connect()

    bot = Bot(token=settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = build_dispatcher(db, settings)
    try:
        me = await bot.me()
        logging.info("@%s ishga tushdi (inline rejim: %s)", me.username, me.supports_inline_queries)
        if not me.supports_inline_queries:
            logging.warning("Inline rejim o'chiq! BotFather'da /setinline buyrug'i bilan yoqing (README).")
        await set_commands(bot)
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await db.close()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
