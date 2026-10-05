"""callback_data fabrikalari (Telegram limiti: 64 bayt)."""
from __future__ import annotations

from aiogram.filters.callback_data import CallbackData


class LangCB(CallbackData, prefix="lang"):
    code: str


class CreateCB(CallbackData, prefix="cr"):
    """Taklifnoma yaratish bosqichlaridagi tugmalar."""
    a: str          # action: type, back, cancel, keep, sug, allow, pick, pl, pl_done, save
    v: str = ""     # qiymat (tur kaliti, indeks, 1/0, joy kaliti...)


class InvCB(CallbackData, prefix="iv"):
    """Chatga yuborilgan taklifnoma tugmalari: invitation_id + action."""
    id: int
    a: str          # y = Ha, n = Yo'q, p = joy tanlash, t = vaqt tanlash, x = namuna (preview)
    i: int = 0      # joy/vaqt indeksi


class MineCB(CallbackData, prefix="mn"):
    a: str          # page, list, resp, del, delok, test
    id: int = 0
    p: int = 0      # /mine sahifasi
