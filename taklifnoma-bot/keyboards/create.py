from __future__ import annotations

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from keyboards.callbacks import CreateCB, LangCB, MineCB
from services.i18n import LANGS, t, tl
from services.render import PLACES, TYPES, place_label, type_label


def _btn(text: str, cb: CreateCB) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, callback_data=cb.pack())


def lang_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=t(code, "lang_name"), callback_data=LangCB(code=code).pack())
        for code in LANGS
    ]])


def nav_rows(lang: str, keep: bool = False) -> list[list[InlineKeyboardButton]]:
    rows = []
    if keep:
        rows.append([_btn(t(lang, "btn.keep"), CreateCB(a="keep"))])
    rows.append([
        _btn(t(lang, "btn.back"), CreateCB(a="back")),
        _btn(t(lang, "btn.cancel"), CreateCB(a="cancel")),
    ])
    return rows


def nav_kb(lang: str, keep: bool = False) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=nav_rows(lang, keep))


def types_kb(lang: str) -> InlineKeyboardMarkup:
    buttons = [_btn(type_label(lang, key), CreateCB(a="type", v=key)) for key in TYPES]
    rows = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
    rows.append([
        _btn(t(lang, "btn.back"), CreateCB(a="back")),
        _btn(t(lang, "btn.cancel"), CreateCB(a="cancel")),
    ])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def suggestions_kb(lang: str, inv_type: str, keep: bool) -> InlineKeyboardMarkup:
    rows = [
        [_btn(text, CreateCB(a="sug", v=str(i)))]
        for i, text in enumerate(tl(lang, f"question_suggestions.{inv_type}"))
    ]
    return InlineKeyboardMarkup(inline_keyboard=rows + nav_rows(lang, keep))


def yes_no_kb(lang: str, action: str, current: bool | None = None) -> InlineKeyboardMarkup:
    yes, no = t(lang, "btn.yes"), t(lang, "btn.no")
    if current is True:
        yes = f"• {yes} •"
    elif current is False:
        no = f"• {no} •"
    rows = [[_btn(yes, CreateCB(a=action, v="1")), _btn(no, CreateCB(a=action, v="0"))]]
    return InlineKeyboardMarkup(inline_keyboard=rows + nav_rows(lang))


def places_kb(lang: str, selected: list[str]) -> InlineKeyboardMarkup:
    buttons = [
        _btn(("✅ " if key in selected else "▫️ ") + place_label(lang, key), CreateCB(a="pl", v=key))
        for key in PLACES
    ]
    rows = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
    rows.append([_btn(t(lang, "btn.continue"), CreateCB(a="pl_done"))])
    return InlineKeyboardMarkup(inline_keyboard=rows + nav_rows(lang))


def confirm_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[_btn(t(lang, "btn.save"), CreateCB(a="save"))]] + nav_rows(lang))


def saved_kb(lang: str, invitation_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=t(lang, "btn.share"), switch_inline_query=f"#{invitation_id}")],
        [InlineKeyboardButton(text=t(lang, "btn.test"),
                              callback_data=MineCB(a="test", id=invitation_id).pack())],
        [
            _btn(t(lang, "btn.new"), CreateCB(a="new")),
            InlineKeyboardButton(text=t(lang, "btn.mine"), callback_data=MineCB(a="list").pack()),
        ],
    ])
