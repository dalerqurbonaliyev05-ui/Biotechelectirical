"""Chatdagi taklifnoma xabari ostidagi tugmalar."""
from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from keyboards.callbacks import InvCB
from services.db import Invitation
from services.i18n import t, tl
from services.render import place_label


def _btn(text: str, cb: InvCB) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, callback_data=cb.pack())


def _grid(buttons: list[InlineKeyboardButton], per_row: int) -> list[list[InlineKeyboardButton]]:
    return [buttons[i:i + per_row] for i in range(0, len(buttons), per_row)]


def invitation_kb(inv: Invitation, no_count: int = 0, preview: bool = False) -> InlineKeyboardMarkup:
    """"Ha 💖" / "Yo'q" tugmalari. allow_no=false bo'lsa — faqat "Ha".

    no_count > 0 bo'lsa, "Yo'q" tugmasi matni no_button_labels'dan olinadi.
    preview=True — yaratish oxiridagi namuna uchun (tugmalar faqat toast ko'rsatadi).
    """
    lang = inv.lang
    inv_id = 0 if preview else inv.id

    def cb(action: str) -> InvCB:
        return InvCB(id=inv_id, a="x" if preview else action)

    row = [_btn(t(lang, "btn.accept"), cb("y"))]
    if inv.allow_no:
        if no_count <= 0:
            no_label = t(lang, "btn.decline")
        else:
            labels = tl(lang, "inv.no_button_labels")
            no_label = labels[min(no_count, len(labels)) - 1]
        row.append(_btn(no_label, cb("n")))
    return InlineKeyboardMarkup(inline_keyboard=[row])


def guest_places_kb(inv: Invitation) -> InlineKeyboardMarkup:
    buttons = [
        _btn(place_label(inv.lang, key), InvCB(id=inv.id, a="p", i=idx))
        for idx, key in enumerate(inv.place_options)
    ]
    return InlineKeyboardMarkup(inline_keyboard=_grid(buttons, 2))


def guest_times_kb(inv: Invitation) -> InlineKeyboardMarkup:
    buttons = [
        _btn(f"🕐 {value}", InvCB(id=inv.id, a="t", i=idx))
        for idx, value in enumerate(inv.time_options)
    ]
    per_row = 2 if all(len(v) <= 16 for v in inv.time_options) else 1
    return InlineKeyboardMarkup(inline_keyboard=_grid(buttons, per_row))
