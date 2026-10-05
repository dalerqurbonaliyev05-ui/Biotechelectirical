"""QISM 2 — inline rejim: istalgan chatda @BotUsername yozilganda saqlangan taklifnomalar ro'yxati."""
from __future__ import annotations

import logging
import re

from aiogram import Router
from aiogram.types import (
    ChosenInlineResult, InlineQuery, InlineQueryResultArticle, InlineQueryResultsButton,
    InputTextMessageContent,
)

from config import Settings
from keyboards.invitation import invitation_kb
from services.db import Database, Invitation
from services.i18n import t
from services.render import format_date, render_invitation, snippet, type_label

router = Router(name="inline_mode")
log = logging.getLogger(__name__)

PAGE_SIZE = 50  # Telegram bitta javobda ko'pi bilan 50 ta natija qabul qiladi
ID_QUERY = re.compile(r"#?(\d+)")


def _matches(inv: Invitation, needle: str) -> bool:
    haystack = " ".join((type_label(inv.lang, inv.type), inv.eyebrow, inv.message, inv.question)).casefold()
    return needle.casefold() in haystack


def _article(inv: Invitation, settings: Settings) -> InlineQueryResultArticle:
    return InlineQueryResultArticle(
        id=str(inv.id),
        title=f"{type_label(inv.lang, inv.type)} · {format_date(inv.created_at, settings.tz)}",
        description=snippet(inv.message, 100),
        input_message_content=InputTextMessageContent(message_text=render_invitation(inv), parse_mode="HTML"),
        reply_markup=invitation_kb(inv),
    )


@router.inline_query()
async def on_inline_query(query: InlineQuery, db: Database, lang: str, settings: Settings) -> None:
    text = query.query.strip()
    offset = int(query.offset) if query.offset.isdigit() else 0
    next_offset = ""

    id_match = ID_QUERY.fullmatch(text)
    if id_match:
        # "↗️ Chatga yuborish" tugmasi "#12" ko'rinishida so'rov yuboradi
        inv = await db.get_invitation(int(id_match.group(1)))
        invitations = [inv] if inv and inv.creator_tg_id == query.from_user.id else []
    elif text:
        invitations = [i for i in await db.list_invitations(query.from_user.id, limit=500) if _matches(i, text)]
        invitations = invitations[offset:offset + PAGE_SIZE]
    else:
        invitations = await db.list_invitations(query.from_user.id, limit=PAGE_SIZE + 1, offset=offset)
        if len(invitations) > PAGE_SIZE:
            invitations = invitations[:PAGE_SIZE]
            next_offset = str(offset + PAGE_SIZE)

    await query.answer(
        results=[_article(inv, settings) for inv in invitations],
        cache_time=0,          # yangi saqlangan taklifnoma darhol ko'rinsin
        is_personal=True,      # har kim faqat o'z taklifnomalarini ko'radi
        next_offset=next_offset,
        button=InlineQueryResultsButton(text=t(lang, "inline.create"), start_parameter="new"),
    )


@router.chosen_inline_result()
async def on_chosen(result: ChosenInlineResult, db: Database) -> None:
    """BotFather'da /setinlinefeedback yoqilgan bo'lsa keladi — "yuborilgan" hisoblagichi uchun."""
    if result.result_id.isdigit():
        await db.increment_sent(int(result.result_id))
