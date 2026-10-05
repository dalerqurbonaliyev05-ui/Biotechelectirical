from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from keyboards.callbacks import MineCB
from services.i18n import t


def _btn(text: str, cb: MineCB) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, callback_data=cb.pack())


def card_kb(lang: str, invitation_id: int, page: int, total: int) -> InlineKeyboardMarkup:
    rows = [
        [
            _btn(t(lang, "btn.responses"), MineCB(a="resp", id=invitation_id, p=page)),
            _btn(t(lang, "btn.delete"), MineCB(a="del", id=invitation_id, p=page)),
        ],
        [InlineKeyboardButton(text=t(lang, "btn.share"), switch_inline_query=f"#{invitation_id}")],
    ]
    if total > 1:
        rows.append([
            _btn("◀️", MineCB(a="page", p=(page - 1) % total)),
            _btn(f"{page + 1}/{total}", MineCB(a="page", p=page)),
            _btn("▶️", MineCB(a="page", p=(page + 1) % total)),
        ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def back_to_card_kb(lang: str, page: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[_btn(t(lang, "btn.back_to_card"), MineCB(a="page", p=page))]])


def delete_confirm_kb(lang: str, invitation_id: int, page: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        _btn(t(lang, "btn.confirm_delete"), MineCB(a="delok", id=invitation_id, p=page)),
        _btn(t(lang, "btn.back_to_card"), MineCB(a="page", p=page)),
    ]])
