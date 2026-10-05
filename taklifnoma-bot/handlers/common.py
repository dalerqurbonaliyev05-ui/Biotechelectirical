"""/help va tushunarsiz xabarlar."""
from __future__ import annotations

from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.types import Message

from services.i18n import t

router = Router(name="common")
# Eng oxirida ulanadi — boshqa hech bir handler tutmagan shaxsiy xabarlar uchun
fallback_router = Router(name="fallback")


@router.message(Command("help"))
async def cmd_help(message: Message, bot: Bot, lang: str) -> None:
    me = await bot.me()
    await message.answer(t(lang, "help", bot=me.username))


@fallback_router.message(F.chat.type == "private")
async def fallback(message: Message, lang: str) -> None:
    await message.answer(t(lang, "fallback"))
