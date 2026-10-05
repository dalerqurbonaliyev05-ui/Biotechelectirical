"""Taklifnoma xabarlarini HTML ko'rinishida yig'ish (faqat Telegram formatlashi va emoji)."""
from __future__ import annotations

import html
from datetime import datetime
from zoneinfo import ZoneInfo

from services.db import Invitation, Response, ST_DONE
from services.i18n import t, tl

TYPE_EMOJI = {
    "wedding": "💍",
    "birthday": "🎂",
    "date": "💞",
    "event": "🎉",
    "general": "💌",
}
TYPES = list(TYPE_EMOJI)

PLACE_EMOJI = {
    "cafe": "☕",
    "restaurant": "🍽",
    "cinema": "🎬",
    "bowling": "🎳",
    "lunch": "🥗",
    "walk": "🌳",
    "icecream": "🍦",
    "concert": "🎵",
}
PLACES = list(PLACE_EMOJI)

DIVIDER = "┈┈┈┈┈┈┈┈┈┈┈┈"


def esc(text: str) -> str:
    """Telegram HTML uchun: faqat &, <, > (o'zbekcha apostroflar o'zgarmasin)."""
    return html.escape(text, quote=False)



def type_label(lang: str, type_key: str) -> str:
    return f"{TYPE_EMOJI.get(type_key, '💌')} {t(lang, f'types.{type_key}')}"


def place_label(lang: str, place_key: str) -> str:
    return f"{PLACE_EMOJI.get(place_key, '📍')} {t(lang, f'places.{place_key}')}"


def format_dt(iso: str, tz: ZoneInfo, with_year: bool = True) -> str:
    dt = datetime.fromisoformat(iso).astimezone(tz)
    return dt.strftime("%d.%m.%Y %H:%M" if with_year else "%d.%m %H:%M")


def format_date(iso: str, tz: ZoneInfo) -> str:
    return datetime.fromisoformat(iso).astimezone(tz).strftime("%d.%m.%Y")


def snippet(text: str, limit: int = 80) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _header(inv: Invitation) -> str:
    emoji = TYPE_EMOJI.get(inv.type, "💌")
    if inv.eyebrow:
        return f"{emoji} <i>{esc(inv.eyebrow)}</i>"
    return emoji


def render_invitation(inv: Invitation) -> str:
    """Chatga joylanadigan asosiy taklifnoma matni."""
    lang = inv.lang
    parts = [_header(inv), DIVIDER, esc(inv.message)]
    if inv.let_guest_pick:
        parts.append(t(lang, "inv.guest_pick_note"))
    else:
        details = []
        if inv.fixed_place:
            details.append(t(lang, "inv.place", value=esc(inv.fixed_place)))
        if inv.fixed_time:
            details.append(t(lang, "inv.time", value=esc(inv.fixed_time)))
        if details:
            parts.append("\n".join(details))
    parts.append(f"<b>❓ {esc(inv.question)}</b>")
    # Sarlavha va ajratuvchi orasida bo'sh qator kerak emas
    return parts[0] + "\n" + "\n\n".join(parts[1:])


def render_no(inv: Invitation, no_count: int) -> str:
    """n-chi "Yo'q"dan keyingi hazil ibora + savol qayta so'raladi."""
    phrases = tl(inv.lang, "inv.no_phrases")
    phrase = phrases[min(no_count, len(phrases)) - 1]
    return f"{_header(inv)}\n\n{esc(phrase)}\n\n<b>❓ {esc(inv.question)}</b>"


def render_auto_yes(inv: Invitation) -> str:
    """10-chi "Yo'q"dan keyin: "mayli, baribir Ha ekan" + joy tanlash."""
    return f"{_header(inv)}\n\n{t(inv.lang, 'inv.auto_yes')}"


def render_accepted(inv: Invitation, name: str, place: str, time: str, forced: bool) -> str:
    accepted = t(inv.lang, "inv.accepted", name=esc(name), place=esc(place), time=esc(time))
    body = f"{t(inv.lang, 'inv.auto_yes')}\n\n{accepted}" if forced else accepted
    return f"{_header(inv)}\n\n{body}"


def invitation_ref(inv: Invitation, lang: str) -> str:
    return t(lang, "notify.ref", snippet=esc(snippet(inv.eyebrow or inv.message, 60)), id=inv.id)


def response_line(resp: Response, lang: str, tz: ZoneInfo) -> str:
    name = esc(resp.responder_name)
    when = format_dt(resp.responded_at, tz, with_year=False)
    if resp.status == ST_DONE and resp.answer == "yes":
        state = t(lang, "mine.resp_forced" if resp.forced_yes else "mine.resp_yes")
        details = ", ".join(esc(v) for v in (resp.chosen_place, resp.chosen_time) if v)
        if details:
            state += f" — {details}"
    elif resp.answer == "no":
        state = t(lang, "mine.resp_no_progress", n=resp.no_count)
    else:
        state = t(lang, "mine.resp_picking")
    return f"👤 <b>{name}</b> · {state} · <i>{when}</i>"
