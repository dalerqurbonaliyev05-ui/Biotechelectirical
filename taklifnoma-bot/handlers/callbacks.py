"""QISM 3 — chatdagi taklifnomaga javob berish (Ha / Yo'q / joy / vaqt).

Javob doim shu chat ichida, xabarni tahrirlash orqali beriladi — yangi xabar yuborilmaydi.
Inline rejim orqali yuborilgan xabarlarda `callback_query.message` bo'lmaydi,
faqat `inline_message_id` keladi — tahrirlash ham shu id orqali qilinadi.
"""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from contextlib import asynccontextmanager
from services.render import esc
from typing import AsyncIterator

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramAPIError, TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, ReactionTypeEmoji

from config import Settings
from keyboards.callbacks import InvCB
from keyboards.invitation import guest_places_kb, guest_times_kb, invitation_kb
from services.db import (
    NO_LIMIT, ST_DONE, ST_NO, ST_PLACE, ST_TIME, Database, Invitation, Response,
)
from services.i18n import guess_lang, t
from services.render import (
    invitation_ref, place_label, render_accepted, render_auto_yes, render_invitation, render_no,
)

router = Router(name="callbacks")
log = logging.getLogger(__name__)


class KeyedLock:
    """Bitta xabarga bir vaqtda kelgan bosishlarni navbatga qo'yadi (ikki marta yozilmasin)."""

    def __init__(self) -> None:
        self._locks: dict[str, asyncio.Lock] = {}
        self._users: defaultdict[str, int] = defaultdict(int)

    @asynccontextmanager
    async def __call__(self, key: str) -> AsyncIterator[None]:
        lock = self._locks.setdefault(key, asyncio.Lock())
        self._users[key] += 1
        try:
            async with lock:
                yield
        finally:
            self._users[key] -= 1
            if self._users[key] == 0:
                del self._users[key]
                self._locks.pop(key, None)


message_lock = KeyedLock()


def message_key(cq: CallbackQuery) -> str | None:
    if cq.inline_message_id:
        return f"i:{cq.inline_message_id}"
    if cq.message is not None:
        return f"m:{cq.message.chat.id}:{cq.message.message_id}"
    return None


class Ctx:
    """Bitta bosish uchun kerakli hamma narsa + xabarni tahrirlash yordamchilari."""

    def __init__(self, cq: CallbackQuery, bot: Bot, db: Database, inv: Invitation) -> None:
        self.cq = cq
        self.bot = bot
        self.db = db
        self.inv = inv
        self.name = cq.from_user.full_name
        self.user_lang = guess_lang(cq.from_user.language_code)

    def _target(self) -> dict:
        # MUHIM: inline xabar bo'lsa — inline_message_id, aks holda chat_id + message_id
        if self.cq.inline_message_id:
            return {"inline_message_id": self.cq.inline_message_id}
        return {"chat_id": self.cq.message.chat.id, "message_id": self.cq.message.message_id}

    async def edit_text(self, text: str, markup: InlineKeyboardMarkup | None = None) -> None:
        """markup=None — tugmalar olib tashlanadi."""
        try:
            await self.bot.edit_message_text(text=text, reply_markup=markup, **self._target())
        except TelegramBadRequest as e:
            if "message is not modified" not in str(e):
                raise

    async def edit_markup(self, markup: InlineKeyboardMarkup | None) -> None:
        try:
            await self.bot.edit_message_reply_markup(reply_markup=markup, **self._target())
        except TelegramBadRequest as e:
            if "message is not modified" not in str(e):
                raise

    async def react(self) -> None:
        """🎉 animatsiyali reaksiya. setMessageReaction faqat chat_id + message_id bilan ishlaydi,
        shuning uchun inline rejim orqali yuborilgan xabarlarda (chat noma'lum) qo'yib bo'lmaydi."""
        if self.cq.message is None:
            return
        try:
            await self.bot.set_message_reaction(
                chat_id=self.cq.message.chat.id,
                message_id=self.cq.message.message_id,
                reaction=[ReactionTypeEmoji(emoji="🎉")],
                is_big=True,
            )
        except TelegramAPIError as e:
            log.info("Reaksiya qo'yilmadi: %s", e)

    async def notify_owner(self, key: str, **kwargs: str) -> None:
        owner_lang = await self.db.get_user_lang(self.inv.creator_tg_id) or self.inv.lang
        text = t(owner_lang, key, name=esc(self.name), **{k: esc(v) for k, v in kwargs.items()})
        text += "\n\n" + invitation_ref(self.inv, owner_lang)
        try:
            await self.bot.send_message(self.inv.creator_tg_id, text)
        except TelegramAPIError as e:
            log.info("Egaga xabar yuborilmadi (%s): %s", self.inv.creator_tg_id, e)


@router.callback_query(InvCB.filter(F.a == "x"))
async def on_preview_button(cq: CallbackQuery, lang: str) -> None:
    await cq.answer(t(lang, "toast.preview"))


@router.callback_query(InvCB.filter())
async def on_invitation_button(
    cq: CallbackQuery, callback_data: InvCB, bot: Bot, db: Database, settings: Settings,
) -> None:
    user_lang = guess_lang(cq.from_user.language_code)
    inv = await db.get_invitation(callback_data.id)
    if inv is None:
        await cq.answer(t(user_lang, "toast.deleted"), show_alert=True)
        return
    key = message_key(cq)
    if key is None:
        await cq.answer()
        return

    # Egasi o'z taklifnomasiga javob bermasin — bot bilan shaxsiy chatdagi "🧪 sinov" nusxasi bundan mustasno
    is_test_copy = cq.message is not None and cq.message.chat.id == inv.creator_tg_id
    if cq.from_user.id == inv.creator_tg_id and not (settings.allow_self_answer or is_test_copy):
        await cq.answer(t(user_lang, "toast.own"), show_alert=True)
        return

    async with message_lock(key):
        resp = await db.get_response(key)
        # Boshqa odam allaqachon javob bergan (yoki javob berayotgan) bo'lsa — xabar o'zgarmaydi
        if resp is not None and (resp.status == ST_DONE or resp.responder_tg_id != cq.from_user.id):
            await cq.answer(t(user_lang, "toast.already_answered"))  # toast, xabar o'zgarmaydi
            return

        ctx = Ctx(cq, bot, db, inv)
        action = callback_data.a
        if action == "n":
            await handle_no(ctx, resp, key)
        elif action == "y":
            await handle_yes(ctx, resp, key)
        elif action == "p":
            await handle_place(ctx, resp, callback_data.i)
        elif action == "t":
            await handle_time(ctx, resp, callback_data.i)
        else:
            await cq.answer()


async def _create(ctx: Ctx, key: str, answer: str, status: str) -> Response:
    cq = ctx.cq
    return await ctx.db.create_response(
        invitation_id=ctx.inv.id,
        msg_key=key,
        chat_id=cq.message.chat.id if cq.message else None,
        message_id=cq.message.message_id if cq.message else None,
        inline_message_id=cq.inline_message_id,
        responder_tg_id=cq.from_user.id,
        responder_name=ctx.name,
        answer=answer,
        status=status,
    )


# ---------- "Yo'q" — taslim bo'lmaydigan tugma ----------

async def handle_no(ctx: Ctx, resp: Response | None, key: str) -> None:
    inv = ctx.inv
    if not inv.allow_no:
        await ctx.cq.answer(t(ctx.user_lang, "toast.no_not_allowed"))
        return
    if resp is not None and resp.status != ST_NO:
        # "Ha" allaqachon bosilgan — eski "Yo'q" tugmasi
        await ctx.cq.answer(t(ctx.user_lang, "toast.stale"))
        return
    if resp is None:
        resp = await _create(ctx, key, answer="no", status=ST_NO)

    no_count = resp.no_count + 1
    if no_count < NO_LIMIT:
        await ctx.db.update_response(resp.id, no_count=no_count, responder_name=ctx.name)
        await ctx.edit_text(render_no(inv, no_count), invitation_kb(inv, no_count=no_count))
        await ctx.cq.answer()
        if no_count == 1:
            await ctx.notify_owner("notify.no")
        return

    # 10-marta: "mayli, baribir Ha ekan" — oddiy "Ha" oqimiga o'tamiz
    await ctx.db.update_response(resp.id, no_count=no_count)
    resp.no_count = no_count
    await go_yes(ctx, resp, forced=True)


# ---------- "Ha" ----------

async def handle_yes(ctx: Ctx, resp: Response | None, key: str) -> None:
    if resp is not None and resp.status != ST_NO:
        # Joy/vaqt tanlash bosqichida eski "Ha" tugmasi
        await ctx.cq.answer(t(ctx.user_lang, "toast.stale"))
        return
    if resp is None:
        resp = await _create(ctx, key, answer="yes", status=ST_PLACE)
    await go_yes(ctx, resp, forced=False)


async def go_yes(ctx: Ctx, resp: Response, forced: bool) -> None:
    inv = ctx.inv
    if inv.let_guest_pick and inv.place_options and inv.time_options:
        await ctx.db.update_response(resp.id, answer="yes", status=ST_PLACE, responder_name=ctx.name)
        if forced:
            await ctx.edit_text(render_auto_yes(inv), guest_places_kb(inv))
        elif resp.no_count > 0:
            # Matn "Yo'q" iborasiga almashgan edi — asl taklifnomani qaytaramiz
            await ctx.edit_text(render_invitation(inv), guest_places_kb(inv))
        else:
            # Xabar matni o'zgarmaydi — faqat tugmalar joy variantlariga almashadi
            await ctx.edit_markup(guest_places_kb(inv))
        await ctx.cq.answer(t(ctx.user_lang, "toast.pick_place"))
        return

    resp.chosen_place = inv.fixed_place or "—"
    resp.chosen_time = inv.fixed_time or "—"
    await finish(ctx, resp, forced)


async def handle_place(ctx: Ctx, resp: Response | None, idx: int) -> None:
    inv = ctx.inv
    if resp is None or resp.status != ST_PLACE or not 0 <= idx < len(inv.place_options):
        await ctx.cq.answer(t(ctx.user_lang, "toast.stale"))
        return
    place = place_label(inv.lang, inv.place_options[idx])
    await ctx.db.update_response(resp.id, chosen_place=place, status=ST_TIME)
    await ctx.edit_markup(guest_times_kb(inv))
    await ctx.cq.answer(t(ctx.user_lang, "toast.pick_time"))


async def handle_time(ctx: Ctx, resp: Response | None, idx: int) -> None:
    inv = ctx.inv
    if resp is None or resp.status != ST_TIME or not 0 <= idx < len(inv.time_options):
        await ctx.cq.answer(t(ctx.user_lang, "toast.stale"))
        return
    resp.chosen_time = inv.time_options[idx]
    await finish(ctx, resp, forced=resp.no_count >= NO_LIMIT)


async def finish(ctx: Ctx, resp: Response, forced: bool) -> None:
    """Yakuniy "✅ [Ism] rozi bo'ldi — joy, vaqt": tugmalar olib tashlanadi, egaga xabar, 🎉 reaksiya."""
    place, time = resp.chosen_place or "—", resp.chosen_time or "—"
    await ctx.db.update_response(
        resp.id, answer="yes", status=ST_DONE, chosen_place=place, chosen_time=time, responder_name=ctx.name,
    )
    await ctx.edit_text(render_accepted(ctx.inv, ctx.name, place, time, forced), None)
    await ctx.cq.answer(t(ctx.user_lang, "toast.yes"))
    await ctx.react()
    await ctx.notify_owner("notify.yes", place=place, time=time)
    if forced:
        await ctx.notify_owner("notify.forced")
