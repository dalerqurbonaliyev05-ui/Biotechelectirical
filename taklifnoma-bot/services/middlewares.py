from __future__ import annotations

from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User

from services.db import Database
from services.i18n import guess_lang


class LangMiddleware(BaseMiddleware):
    """Har bir handlerga `lang` — foydalanuvchining tanlagan (yoki Telegram'dagi) tili."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        user: User | None = data.get("event_from_user")
        db: Database = data["db"]
        lang = None
        if user is not None:
            lang = await db.get_user_lang(user.id) or guess_lang(user.language_code)
        data["lang"] = lang or guess_lang(None)
        return await handler(event, data)
