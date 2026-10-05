"""/mine — foydalanuvchi taklifnomalari, javoblar va o'chirish."""
from __future__ import annotations

from services.render import esc

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from config import Settings
from keyboards.callbacks import MineCB
from keyboards.invitation import invitation_kb
from keyboards.mine import back_to_card_kb, card_kb, delete_confirm_kb
from services.db import Database
from services.i18n import t
from services.render import format_dt, render_invitation, response_line, snippet, type_label

router = Router(name="mine")

MAX_RESPONSE_LINES = 30


async def build_card(db: Database, settings: Settings, user_id: int, lang: str, page: int
                     ) -> tuple[str, InlineKeyboardMarkup | None]:
    total = await db.count_invitations(user_id)
    if total == 0:
        return t(lang, "mine.empty"), None
    page = max(0, min(page, total - 1))
    inv = (await db.list_invitations(user_id, limit=1, offset=page))[0]
    responses = await db.count_responses(inv.id)

    lines = [
        t(lang, "mine.header", pos=page + 1, total=total),
        "",
        f"<b>{type_label(lang, inv.type)}</b> · #{inv.id}",
        t(lang, "mine.created", date=format_dt(inv.created_at, settings.tz)),
    ]
    if inv.eyebrow:
        lines.append(f"<i>{esc(inv.eyebrow)}</i>")
    lines.append(esc(snippet(inv.message, 160)))
    lines.append(f"❓ {esc(inv.question)}")
    lines.append("")
    if inv.let_guest_pick:
        lines.append(t(lang, "mine.mode_pick"))
    else:
        lines.append(" · ".join(
            v for v in (
                t(lang, "inv.place", value=esc(inv.fixed_place)) if inv.fixed_place else "",
                t(lang, "inv.time", value=esc(inv.fixed_time)) if inv.fixed_time else "",
            ) if v
        ))
    if inv.allow_no:
        lines.append(t(lang, "mine.mode_no_allowed"))
    lines.append(t(lang, "mine.stats", sent=inv.sent_count, responses=responses))
    return "\n".join(lines), card_kb(lang, inv.id, page, total)


async def _edit(cq: CallbackQuery, text: str, markup: InlineKeyboardMarkup | None) -> None:
    try:
        await cq.message.edit_text(text, reply_markup=markup)
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            raise


@router.message(Command("mine"))
async def cmd_mine(message: Message, db: Database, settings: Settings, lang: str) -> None:
    text, markup = await build_card(db, settings, message.from_user.id, lang, 0)
    await message.answer(text, reply_markup=markup)


@router.callback_query(MineCB.filter(F.a == "page"))
async def on_page(cq: CallbackQuery, callback_data: MineCB, db: Database, settings: Settings, lang: str) -> None:
    await cq.answer()
    text, markup = await build_card(db, settings, cq.from_user.id, lang, callback_data.p)
    await _edit(cq, text, markup)


@router.callback_query(MineCB.filter(F.a == "list"))
async def on_list(cq: CallbackQuery, db: Database, settings: Settings, lang: str) -> None:
    """Saqlash xabaridagi "📋 Taklifnomalarim" — o'sha xabarni buzmay, yangi ro'yxat yuboradi."""
    await cq.answer()
    text, markup = await build_card(db, settings, cq.from_user.id, lang, 0)
    await cq.message.answer(text, reply_markup=markup)


@router.callback_query(MineCB.filter(F.a == "resp"))
async def on_responses(cq: CallbackQuery, callback_data: MineCB, db: Database, settings: Settings,
                       lang: str) -> None:
    inv = await db.get_invitation(callback_data.id)
    if inv is None or inv.creator_tg_id != cq.from_user.id:
        await cq.answer(t(lang, "toast.deleted"), show_alert=True)
        return
    await cq.answer()
    responses = await db.list_responses(inv.id)
    lines = [t(lang, "mine.responses_title", id=inv.id), ""]
    if not responses:
        lines.append(t(lang, "mine.no_responses"))
    else:
        for n, resp in enumerate(responses[:MAX_RESPONSE_LINES], start=1):
            lines.append(f"{n}. {response_line(resp, lang, settings.tz)}")
        if len(responses) > MAX_RESPONSE_LINES:
            lines.append(t(lang, "mine.more", n=len(responses) - MAX_RESPONSE_LINES))
    await _edit(cq, "\n".join(lines), back_to_card_kb(lang, callback_data.p))


@router.callback_query(MineCB.filter(F.a == "del"))
async def on_delete(cq: CallbackQuery, callback_data: MineCB, lang: str) -> None:
    await cq.answer()
    await _edit(cq, t(lang, "mine.delete_confirm", id=callback_data.id),
                delete_confirm_kb(lang, callback_data.id, callback_data.p))


@router.callback_query(MineCB.filter(F.a == "delok"))
async def on_delete_confirmed(cq: CallbackQuery, callback_data: MineCB, db: Database, settings: Settings,
                              lang: str) -> None:
    await db.delete_invitation(callback_data.id, cq.from_user.id)
    await cq.answer(t(lang, "mine.deleted"))
    text, markup = await build_card(db, settings, cq.from_user.id, lang, callback_data.p)
    await _edit(cq, text, markup)


@router.callback_query(MineCB.filter(F.a == "test"))
async def on_test(cq: CallbackQuery, callback_data: MineCB, db: Database, lang: str) -> None:
    """Saqlangan taklifnomani shu shaxsiy chatga jonli tugmalar bilan yuboradi (sinov uchun)."""
    inv = await db.get_invitation(callback_data.id)
    if inv is None or inv.creator_tg_id != cq.from_user.id:
        await cq.answer(t(lang, "toast.deleted"), show_alert=True)
        return
    await cq.answer()
    await cq.message.answer(render_invitation(inv), reply_markup=invitation_kb(inv))
