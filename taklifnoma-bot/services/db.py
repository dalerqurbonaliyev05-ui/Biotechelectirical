"""SQLite (aiosqlite) qatlami: users, invitations, responses jadvallari."""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    tg_id       INTEGER PRIMARY KEY,
    lang        TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_tg_id   INTEGER NOT NULL,
    type            TEXT    NOT NULL,
    eyebrow         TEXT    NOT NULL DEFAULT '',
    message         TEXT    NOT NULL,
    question        TEXT    NOT NULL,
    allow_no        INTEGER NOT NULL DEFAULT 1,
    let_guest_pick  INTEGER NOT NULL DEFAULT 0,
    place_options   TEXT    NOT NULL DEFAULT '[]',
    time_options    TEXT    NOT NULL DEFAULT '[]',
    fixed_place     TEXT,
    fixed_time      TEXT,
    lang            TEXT    NOT NULL DEFAULT 'uz',
    sent_count      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invitations_creator ON invitations (creator_tg_id, id);

-- Bitta yuborilgan xabar = bitta responses qatori.
-- msg_key: inline xabar uchun "i:<inline_message_id>", oddiy xabar uchun
-- "m:<chat_id>:<message_id>". UNIQUE — shu xabarga ikkinchi javob yozilmaydi.
CREATE TABLE IF NOT EXISTS responses (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    invitation_id       INTEGER NOT NULL REFERENCES invitations (id) ON DELETE CASCADE,
    chat_id             INTEGER,
    message_id          INTEGER,
    inline_message_id   TEXT,
    msg_key             TEXT    NOT NULL UNIQUE,
    responder_tg_id     INTEGER NOT NULL,
    responder_name      TEXT    NOT NULL,
    answer              TEXT    NOT NULL CHECK (answer IN ('yes', 'no')),
    status              TEXT    NOT NULL DEFAULT 'done',   -- no | place | time | done
    no_count            INTEGER NOT NULL DEFAULT 0,
    chosen_place        TEXT,
    chosen_time         TEXT,
    responded_at        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_responses_invitation ON responses (invitation_id);
"""

# Eski bazalar uchun yengil migratsiya: ustun yo'q bo'lsa qo'shiladi.
MIGRATIONS = {
    "responses": {
        "no_count": "INTEGER NOT NULL DEFAULT 0",
        "status": "TEXT NOT NULL DEFAULT 'done'",
        "inline_message_id": "TEXT",
    },
    "invitations": {
        "sent_count": "INTEGER NOT NULL DEFAULT 0",
    },
}

# Javob holatlari
ST_NO = "no"        # "Yo'q" o'yini davom etmoqda
ST_PLACE = "place"  # "Ha" — joy tanlanmoqda
ST_TIME = "time"    # joy tanlandi — vaqt tanlanmoqda
ST_DONE = "done"    # yakunlandi

NO_LIMIT = 10  # shuncha "Yo'q"dan keyin avtomatik "Ha"


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class Invitation:
    id: int
    creator_tg_id: int
    type: str
    eyebrow: str
    message: str
    question: str
    allow_no: bool
    let_guest_pick: bool
    place_options: list[str]
    time_options: list[str]
    fixed_place: str | None
    fixed_time: str | None
    lang: str
    sent_count: int
    created_at: str

    @classmethod
    def from_row(cls, row: aiosqlite.Row) -> "Invitation":
        return cls(
            id=row["id"],
            creator_tg_id=row["creator_tg_id"],
            type=row["type"],
            eyebrow=row["eyebrow"],
            message=row["message"],
            question=row["question"],
            allow_no=bool(row["allow_no"]),
            let_guest_pick=bool(row["let_guest_pick"]),
            place_options=json.loads(row["place_options"] or "[]"),
            time_options=json.loads(row["time_options"] or "[]"),
            fixed_place=row["fixed_place"],
            fixed_time=row["fixed_time"],
            lang=row["lang"],
            sent_count=row["sent_count"],
            created_at=row["created_at"],
        )


@dataclass
class Response:
    id: int
    invitation_id: int
    chat_id: int | None
    message_id: int | None
    inline_message_id: str | None
    msg_key: str
    responder_tg_id: int
    responder_name: str
    answer: str
    status: str
    no_count: int
    chosen_place: str | None
    chosen_time: str | None
    responded_at: str

    @classmethod
    def from_row(cls, row: aiosqlite.Row) -> "Response":
        return cls(**{k: row[k] for k in row.keys()})

    @property
    def forced_yes(self) -> bool:
        return self.answer == "yes" and self.no_count >= NO_LIMIT


class Database:
    def __init__(self, path: str) -> None:
        self.path = path
        self._conn: aiosqlite.Connection | None = None

    @property
    def conn(self) -> aiosqlite.Connection:
        if self._conn is None:
            raise RuntimeError("Database.connect() chaqirilmagan")
        return self._conn

    async def connect(self) -> None:
        self._conn = await aiosqlite.connect(self.path)
        self._conn.row_factory = aiosqlite.Row
        await self._conn.execute("PRAGMA foreign_keys = ON")
        await self._conn.execute("PRAGMA journal_mode = WAL")
        await self._conn.executescript(SCHEMA)
        await self._migrate()
        await self._conn.commit()

    async def close(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    async def _migrate(self) -> None:
        for table, columns in MIGRATIONS.items():
            async with self.conn.execute(f"PRAGMA table_info({table})") as cur:
                existing = {row["name"] for row in await cur.fetchall()}
            for name, ddl in columns.items():
                if name not in existing:
                    await self.conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")

    # ---------- users ----------

    async def get_user_lang(self, tg_id: int) -> str | None:
        async with self.conn.execute("SELECT lang FROM users WHERE tg_id = ?", (tg_id,)) as cur:
            row = await cur.fetchone()
        return row["lang"] if row else None

    async def set_user_lang(self, tg_id: int, lang: str) -> None:
        await self.conn.execute(
            "INSERT INTO users (tg_id, lang, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT (tg_id) DO UPDATE SET lang = excluded.lang, updated_at = excluded.updated_at",
            (tg_id, lang, utcnow()),
        )
        await self.conn.commit()

    # ---------- invitations ----------

    async def create_invitation(self, creator_tg_id: int, data: dict[str, Any]) -> int:
        cur = await self.conn.execute(
            "INSERT INTO invitations (creator_tg_id, type, eyebrow, message, question, allow_no, "
            "let_guest_pick, place_options, time_options, fixed_place, fixed_time, lang, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                creator_tg_id,
                data["type"],
                data.get("eyebrow", ""),
                data["message"],
                data["question"],
                int(bool(data["allow_no"])),
                int(bool(data["let_guest_pick"])),
                json.dumps(data.get("place_options") or [], ensure_ascii=False),
                json.dumps(data.get("time_options") or [], ensure_ascii=False),
                data.get("fixed_place"),
                data.get("fixed_time"),
                data["lang"],
                utcnow(),
            ),
        )
        await self.conn.commit()
        return cur.lastrowid

    async def get_invitation(self, invitation_id: int) -> Invitation | None:
        async with self.conn.execute("SELECT * FROM invitations WHERE id = ?", (invitation_id,)) as cur:
            row = await cur.fetchone()
        return Invitation.from_row(row) if row else None

    async def list_invitations(self, creator_tg_id: int, limit: int = 50, offset: int = 0) -> list[Invitation]:
        async with self.conn.execute(
            "SELECT * FROM invitations WHERE creator_tg_id = ? ORDER BY id DESC LIMIT ? OFFSET ?",
            (creator_tg_id, limit, offset),
        ) as cur:
            rows = await cur.fetchall()
        return [Invitation.from_row(r) for r in rows]

    async def count_invitations(self, creator_tg_id: int) -> int:
        async with self.conn.execute(
            "SELECT COUNT(*) FROM invitations WHERE creator_tg_id = ?", (creator_tg_id,)
        ) as cur:
            return (await cur.fetchone())[0]

    async def delete_invitation(self, invitation_id: int, creator_tg_id: int) -> bool:
        cur = await self.conn.execute(
            "DELETE FROM invitations WHERE id = ? AND creator_tg_id = ?", (invitation_id, creator_tg_id)
        )
        await self.conn.commit()
        return cur.rowcount > 0

    async def increment_sent(self, invitation_id: int) -> None:
        await self.conn.execute(
            "UPDATE invitations SET sent_count = sent_count + 1 WHERE id = ?", (invitation_id,)
        )
        await self.conn.commit()

    # ---------- responses ----------

    async def get_response(self, msg_key: str) -> Response | None:
        async with self.conn.execute("SELECT * FROM responses WHERE msg_key = ?", (msg_key,)) as cur:
            row = await cur.fetchone()
        return Response.from_row(row) if row else None

    async def create_response(
        self,
        *,
        invitation_id: int,
        msg_key: str,
        chat_id: int | None,
        message_id: int | None,
        inline_message_id: str | None,
        responder_tg_id: int,
        responder_name: str,
        answer: str,
        status: str,
    ) -> Response:
        await self.conn.execute(
            "INSERT INTO responses (invitation_id, chat_id, message_id, inline_message_id, msg_key, "
            "responder_tg_id, responder_name, answer, status, responded_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (invitation_id, chat_id, message_id, inline_message_id, msg_key,
             responder_tg_id, responder_name, answer, status, utcnow()),
        )
        await self.conn.commit()
        resp = await self.get_response(msg_key)
        assert resp is not None
        return resp

    async def update_response(self, response_id: int, **fields: Any) -> None:
        allowed = {"answer", "status", "no_count", "chosen_place", "chosen_time", "responder_name"}
        unknown = set(fields) - allowed
        if unknown:
            raise ValueError(f"Noma'lum ustunlar: {unknown}")
        fields["responded_at"] = utcnow()
        assignments = ", ".join(f"{k} = ?" for k in fields)
        await self.conn.execute(
            f"UPDATE responses SET {assignments} WHERE id = ?", (*fields.values(), response_id)
        )
        await self.conn.commit()

    async def list_responses(self, invitation_id: int) -> list[Response]:
        async with self.conn.execute(
            "SELECT * FROM responses WHERE invitation_id = ? ORDER BY responded_at DESC, id DESC",
            (invitation_id,),
        ) as cur:
            rows = await cur.fetchall()
        return [Response.from_row(r) for r in rows]

    async def count_responses(self, invitation_id: int) -> int:
        async with self.conn.execute(
            "SELECT COUNT(*) FROM responses WHERE invitation_id = ?", (invitation_id,)
        ) as cur:
            return (await cur.fetchone())[0]
