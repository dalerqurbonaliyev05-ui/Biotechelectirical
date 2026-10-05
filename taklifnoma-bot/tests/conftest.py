"""Telegram'ga ulanmasdan, haqiqiy Dispatcher orqali update'larni o'tkazadigan test muhiti."""
from __future__ import annotations

import itertools
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import pytest
import pytest_asyncio
from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.base import BaseSession
from aiogram.methods import (
    EditMessageReplyMarkup, EditMessageText, GetMe, SendMessage, TelegramMethod,
)
from aiogram.types import (
    CallbackQuery, Chat, ChosenInlineResult, InlineQuery, Message, Update, User,
)

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from bot import build_dispatcher  # noqa: E402
from config import Settings  # noqa: E402
from services.db import Database  # noqa: E402

BOT_USER = User(id=999, is_bot=True, first_name="Taklifnoma", username="TaklifnomaBot",
                supports_inline_queries=True)
NOW = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)


class FakeSession(BaseSession):
    """Har bir API chaqiruvini yozib boradi va real Telegram'ga o'xshash javob qaytaradi."""

    def __init__(self) -> None:
        super().__init__()
        self.calls: list[TelegramMethod] = []
        self._ids = itertools.count(1000)

    async def make_request(self, bot: Bot, method: TelegramMethod, timeout: int | None = None) -> Any:
        self.calls.append(method)
        if isinstance(method, GetMe):
            return BOT_USER
        if isinstance(method, SendMessage):
            return Message(message_id=next(self._ids), date=NOW,
                           chat=Chat(id=method.chat_id, type="private"), text=method.text,
                           reply_markup=method.reply_markup)
        if isinstance(method, (EditMessageText, EditMessageReplyMarkup)):
            if method.inline_message_id:
                return True
            return Message(message_id=method.message_id, date=NOW,
                           chat=Chat(id=method.chat_id, type="private"),
                           text=getattr(method, "text", None) or "", reply_markup=method.reply_markup)
        return True

    async def close(self) -> None:
        pass

    async def stream_content(self, *args: Any, **kwargs: Any):  # pragma: no cover
        raise NotImplementedError

    # --- yordamchilar ---
    def of(self, cls: type) -> list:
        return [c for c in self.calls if isinstance(c, cls)]

    def last(self, cls: type):
        found = self.of(cls)
        return found[-1] if found else None

    def clear(self) -> None:
        self.calls.clear()


class Harness:
    def __init__(self, bot: Bot, session: FakeSession, dp, db: Database) -> None:
        self.bot, self.session, self.dp, self.db = bot, session, dp, db
        self._update_ids = itertools.count(1)
        self._msg_ids = itertools.count(1)

    @staticmethod
    def user(uid: int, name: str = "Ali", lang: str = "uz") -> User:
        return User(id=uid, is_bot=False, first_name=name, language_code=lang)

    async def feed(self, **kwargs: Any) -> None:
        update = Update(update_id=next(self._update_ids), **kwargs)
        await self.dp.feed_update(self.bot, update)

    async def text(self, user: User, text: str) -> None:
        await self.feed(message=Message(message_id=next(self._msg_ids), date=NOW,
                                        chat=Chat(id=user.id, type="private"), from_user=user, text=text))

    async def private_cb(self, user: User, data: str, message_id: int = 1, text: str = "x") -> None:
        msg = Message(message_id=message_id, date=NOW, chat=Chat(id=user.id, type="private"),
                      from_user=BOT_USER, text=text)
        await self.feed(callback_query=CallbackQuery(id="cq", from_user=user, chat_instance="ci",
                                                     message=msg, data=data))

    async def inline_cb(self, user: User, data: str, inline_message_id: str = "INL1") -> None:
        await self.feed(callback_query=CallbackQuery(id="cq", from_user=user, chat_instance="ci",
                                                     inline_message_id=inline_message_id, data=data))

    async def inline_query(self, user: User, query: str = "", offset: str = "") -> None:
        await self.feed(inline_query=InlineQuery(id="iq", from_user=user, query=query, offset=offset))

    async def chosen(self, user: User, result_id: str) -> None:
        await self.feed(chosen_inline_result=ChosenInlineResult(result_id=result_id, from_user=user,
                                                                query="", inline_message_id="INL1"))


@pytest_asyncio.fixture
async def h(tmp_path):
    db = Database(str(tmp_path / "test.db"))
    await db.connect()
    session = FakeSession()
    bot = Bot(token="123456:TEST", session=session, default=DefaultBotProperties(parse_mode="HTML"))
    settings = Settings(bot_token="x", db_path="", tz=ZoneInfo("Asia/Tashkent"), allow_self_answer=False)
    dp = build_dispatcher(db, settings)
    yield Harness(bot, session, dp, db)
    await db.close()
    # Routerlar modul darajasida — keyingi test yangi Dispatcher'ga ulay olishi uchun ajratamiz
    for router in dp.sub_routers:
        router._parent_router = None


@pytest.fixture
def anyio_backend():
    return "asyncio"
