"""Markazlashgan tarjimalar: barcha matnlar locales/*.json fayllaridan olinadi."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

LOCALES_DIR = Path(__file__).resolve().parent.parent / "locales"
LANGS = ("uz", "ru", "en")
DEFAULT_LANG = "uz"

_data: dict[str, dict[str, Any]] = {}


def _load() -> None:
    for code in LANGS:
        with open(LOCALES_DIR / f"{code}.json", encoding="utf-8") as f:
            _data[code] = json.load(f)


_load()


def normalize(lang: str | None) -> str:
    return lang if lang in LANGS else DEFAULT_LANG


def guess_lang(language_code: str | None) -> str:
    """Telegram'dagi language_code ('ru', 'en-US', ...) dan bizning tilni topadi."""
    code = (language_code or "")[:2].lower()
    return code if code in LANGS else DEFAULT_LANG


def _lookup(lang: str, key: str) -> Any:
    node: Any = _data[lang]
    for part in key.split("."):
        node = node[part]
    return node


def get(lang: str | None, key: str) -> Any:
    try:
        return _lookup(normalize(lang), key)
    except KeyError:
        return _lookup(DEFAULT_LANG, key)


def t(lang: str | None, key: str, **kwargs: Any) -> str:
    value = get(lang, key)
    return value.format(**kwargs) if kwargs else value


def tl(lang: str | None, key: str) -> list[str]:
    return list(get(lang, key))
