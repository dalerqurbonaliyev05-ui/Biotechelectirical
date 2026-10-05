from __future__ import annotations

import json

from aiogram.methods import (
    AnswerCallbackQuery, AnswerInlineQuery, EditMessageReplyMarkup, EditMessageText, SendMessage,
    SetMessageReaction,
)

from keyboards.callbacks import CreateCB, InvCB, LangCB, MineCB
from services import i18n
from services.i18n import LANGS, tl

OWNER = 111
GUEST = 222
OTHER = 333


def buttons(markup) -> list[str]:
    return [b.text for row in markup.inline_keyboard for b in row] if markup else []


async def make_inv(h, **overrides) -> int:
    data = {
        "type": "date", "eyebrow": "Maxsus kun", "message": "Sizni <taklif> qilaman", "question": "Kelasizmi?",
        "allow_no": True, "let_guest_pick": True, "place_options": ["cafe", "cinema"],
        "time_options": ["Shanba, 18:00", "Yakshanba, 12:00"], "lang": "uz",
    }
    data.update(overrides)
    return await h.db.create_invitation(OWNER, data)


# ---------- locales ----------

def test_locales_have_same_keys():
    def keys(node, prefix=""):
        out = set()
        for k, v in node.items():
            path = f"{prefix}{k}"
            out |= keys(v, path + ".") if isinstance(v, dict) else {path}
        return out

    base = keys(i18n._data["uz"])
    for lang in LANGS:
        data = i18n._data[lang]
        assert keys(data) == base, lang
        assert len(tl(lang, "inv.no_phrases")) == 9
        assert len(tl(lang, "inv.no_button_labels")) == 9
        for type_key, items in data["question_suggestions"].items():
            assert len(items) == 3, (lang, type_key)


def test_callback_data_fits_telegram_limit():
    for cb in (InvCB(id=10**9, a="t", i=7), CreateCB(a="pl_done", v="icecream"),
               MineCB(a="delok", id=10**9, p=10**4), LangCB(code="uz")):
        assert len(cb.pack().encode()) <= 64


# ---------- QISM 1: yaratish ----------

async def test_full_creation_flow_guest_pick(h):
    u = h.user(OWNER, "Dilnoza")
    await h.text(u, "/start")
    assert h.session.last(SendMessage).reply_markup  # til tugmalari
    await h.private_cb(u, LangCB(code="uz").pack())
    assert await h.db.get_user_lang(OWNER) == "uz"
    await h.private_cb(u, CreateCB(a="type", v="date").pack())
    assert "sarlavha" in h.session.last(EditMessageText).text

    await h.text(u, "Maxsus kun")
    await h.text(u, "Sizni kechki ovqatga taklif qilaman")
    # 3 ta tayyor savol + orqaga/bekor
    sug = h.session.last(SendMessage).reply_markup
    assert len(buttons(sug)) == 5
    await h.private_cb(u, CreateCB(a="sug", v="0").pack())
    await h.private_cb(u, CreateCB(a="allow", v="1").pack())
    await h.private_cb(u, CreateCB(a="pick", v="1").pack())

    # joy tanlamasdan davom etib bo'lmaydi
    await h.private_cb(u, CreateCB(a="pl_done").pack())
    assert h.session.last(AnswerCallbackQuery).show_alert
    await h.private_cb(u, CreateCB(a="pl", v="cinema").pack())
    await h.private_cb(u, CreateCB(a="pl", v="cafe").pack())
    marks = buttons(h.session.last(EditMessageReplyMarkup).reply_markup)
    assert "✅ ☕ Kafe" in marks and "✅ 🎬 Kino" in marks
    await h.private_cb(u, CreateCB(a="pl_done").pack())

    await h.text(u, "Shanba, 18:00\n\n  Yakshanba, 12:00  ")
    sent = h.session.of(SendMessage)
    preview = sent[-2]
    assert "Maxsus kun" in preview.text and "Men bilan uchrashuvga chiqasizmi?" in preview.text
    assert buttons(preview.reply_markup) == ["Ha 💖", "Yo'q"]
    assert "Saqlash" in buttons(sent[-1].reply_markup)[0]

    await h.private_cb(u, CreateCB(a="save").pack())
    saved = h.session.last(EditMessageText)
    assert "@TaklifnomaBot" in saved.text
    assert saved.reply_markup.inline_keyboard[0][0].switch_inline_query.startswith("#")

    [inv] = await h.db.list_invitations(OWNER)
    assert inv.type == "date" and inv.allow_no and inv.let_guest_pick
    assert inv.place_options == ["cafe", "cinema"]  # doim PLACES tartibida
    assert inv.time_options == ["Shanba, 18:00", "Yakshanba, 12:00"]
    assert inv.fixed_place is None


async def test_creation_fixed_back_and_keep(h):
    u = h.user(OWNER)
    await h.text(u, "/new")
    await h.private_cb(u, CreateCB(a="type", v="wedding").pack())
    await h.text(u, "Siz taklif qilinasiz")
    await h.text(u, "To'yimizga marhamat")
    await h.text(u, "Kelasizmi?")  # o'zi yozgan savol
    await h.private_cb(u, CreateCB(a="allow", v="0").pack())
    await h.private_cb(u, CreateCB(a="pick", v="0").pack())
    await h.text(u, "Navro'z to'yxonasi")
    # Orqaga -> joy so'raladi, hozirgi qiymat va "o'zgartirmaslik" tugmasi bilan
    await h.private_cb(u, CreateCB(a="back").pack())
    edited = h.session.last(EditMessageText)
    assert "Navro'z" in edited.text and any("➡️" in b for b in buttons(edited.reply_markup))
    await h.private_cb(u, CreateCB(a="keep").pack())
    await h.text(u, "x" * 500)  # juda uzun
    assert "⚠️" in h.session.last(SendMessage).text
    await h.text(u, "12-oktabr, 18:00")
    preview = h.session.of(SendMessage)[-2]
    assert "Navro'z to'yxonasi" in preview.text and "12-oktabr, 18:00" in preview.text
    assert buttons(preview.reply_markup) == ["Ha 💖"]  # allow_no = false
    await h.private_cb(u, CreateCB(a="save").pack())
    [inv] = await h.db.list_invitations(OWNER)
    assert not inv.allow_no and not inv.let_guest_pick and inv.fixed_time == "12-oktabr, 18:00"


async def test_cancel_clears_state(h):
    u = h.user(OWNER)
    await h.text(u, "/new")
    await h.private_cb(u, CreateCB(a="cancel").pack())
    assert "Bekor" in h.session.last(EditMessageText).text
    await h.text(u, "salom")  # endi fallback
    assert "/new" in h.session.last(SendMessage).text


# ---------- QISM 2: inline ----------

async def test_inline_query_lists_own_invitations(h):
    inv_id = await make_inv(h)
    await make_inv(h, type="wedding", message="To'y xabari")
    await h.db.create_invitation(OTHER, {"type": "general", "message": "begona", "question": "?",
                                         "allow_no": True, "let_guest_pick": False, "lang": "uz"})
    await h.inline_query(h.user(OWNER))
    ans = h.session.last(AnswerInlineQuery)
    assert len(ans.results) == 2 and ans.is_personal and ans.cache_time == 0
    art = [r for r in ans.results if r.id == str(inv_id)][0]
    assert art.title.startswith("💞 Uchrashuv / randevu · ")
    assert "&lt;taklif&gt;" in art.input_message_content.message_text  # HTML escape
    assert "<b>❓ Kelasizmi?</b>" in art.input_message_content.message_text
    assert json.loads(art.reply_markup.inline_keyboard[0][0].callback_data.split(":")[1]) == inv_id

    await h.inline_query(h.user(OWNER), f"#{inv_id}")
    assert [r.id for r in h.session.last(AnswerInlineQuery).results] == [str(inv_id)]
    await h.inline_query(h.user(OWNER), "to'y")
    assert len(h.session.last(AnswerInlineQuery).results) == 1
    await h.inline_query(h.user(GUEST))  # boshqa odam egasining taklifnomasini ko'rmaydi
    assert h.session.last(AnswerInlineQuery).results == []

    await h.chosen(h.user(OWNER), str(inv_id))
    assert (await h.db.get_invitation(inv_id)).sent_count == 1


# ---------- QISM 3: javob berish ----------

async def test_yes_with_guest_pick_inline(h):
    inv_id = await make_inv(h)
    g = h.user(GUEST, "Aziz")
    h.session.clear()
    await h.inline_cb(g, InvCB(id=inv_id, a="y").pack())
    # Matn o'zgarmaydi — faqat tugmalar joylarga almashadi, inline_message_id orqali
    assert not h.session.of(EditMessageText)
    edit = h.session.last(EditMessageReplyMarkup)
    assert edit.inline_message_id == "INL1" and edit.chat_id is None
    assert buttons(edit.reply_markup) == ["☕ Kafe", "🎬 Kino"]

    await h.inline_cb(g, InvCB(id=inv_id, a="p", i=1).pack())
    assert buttons(h.session.last(EditMessageReplyMarkup).reply_markup) == ["🕐 Shanba, 18:00",
                                                                            "🕐 Yakshanba, 12:00"]
    # boshqa odam bosa olmaydi
    await h.inline_cb(h.user(OTHER, "Begona"), InvCB(id=inv_id, a="t", i=0).pack())
    assert h.session.last(AnswerCallbackQuery).text == "Bu taklifnoma allaqachon javob berilgan"

    await h.inline_cb(g, InvCB(id=inv_id, a="t", i=0).pack())
    final = h.session.last(EditMessageText)
    assert final.inline_message_id == "INL1" and final.reply_markup is None
    assert "✅ <b>Aziz</b> rozi bo'ldi — 🎬 Kino, Shanba, 18:00" in final.text
    owner_msg = h.session.last(SendMessage)
    assert owner_msg.chat_id == OWNER and "🎉 <b>Aziz</b> 'Ha' dedi — 🎬 Kino, Shanba, 18:00" in owner_msg.text
    assert not h.session.of(SetMessageReaction)  # inline xabarga reaksiya qo'yib bo'lmaydi

    # yakunlangandan keyin hech kim (o'zi ham) o'zgartira olmaydi
    n_edits = len(h.session.of(EditMessageText))
    await h.inline_cb(g, InvCB(id=inv_id, a="y").pack())
    assert len(h.session.of(EditMessageText)) == n_edits
    assert h.session.last(AnswerCallbackQuery).text == "Bu taklifnoma allaqachon javob berilgan"

    [resp] = await h.db.list_responses(inv_id)
    assert (resp.answer, resp.status, resp.chosen_place, resp.chosen_time, resp.responder_name) == \
        ("yes", "done", "🎬 Kino", "Shanba, 18:00", "Aziz")
    assert resp.inline_message_id == "INL1" and resp.no_count == 0


async def test_fixed_yes_and_no_disabled(h):
    inv_id = await make_inv(h, allow_no=False, let_guest_pick=False, fixed_place="Kafe Lola",
                            fixed_time="Juma 19:00")
    g = h.user(GUEST, "Zarina")
    await h.inline_cb(g, InvCB(id=inv_id, a="n").pack())  # qo'lda yasalgan "Yo'q"
    assert "Yo'q" in h.session.last(AnswerCallbackQuery).text
    assert not await h.db.list_responses(inv_id)
    await h.inline_cb(g, InvCB(id=inv_id, a="y").pack())
    assert "✅ <b>Zarina</b> rozi bo'ldi — Kafe Lola, Juma 19:00" in h.session.last(EditMessageText).text


async def test_no_button_never_gives_up(h):
    inv_id = await make_inv(h)
    g = h.user(GUEST, "Aziz")
    phrases = tl("uz", "inv.no_phrases")
    labels = tl("uz", "inv.no_button_labels")
    for n in range(1, 10):
        await h.inline_cb(g, InvCB(id=inv_id, a="n").pack())
        edit = h.session.last(EditMessageText)
        assert phrases[n - 1] in edit.text and "Kelasizmi?" in edit.text
        assert buttons(edit.reply_markup) == ["Ha 💖", labels[n - 1]]
        [resp] = await h.db.list_responses(inv_id)
        assert resp.no_count == n and resp.answer == "no"
    # egaga faqat birinchi "Yo'q"da xabar boradi
    owner_msgs = [m for m in h.session.of(SendMessage) if m.chat_id == OWNER]
    assert len(owner_msgs) == 1 and "'Yo'q' dedi" in owner_msgs[0].text
    assert "Baribir Yo'q 😤" == labels[2]

    # 10-marta: avtomatik "Ha" -> joy tanlash
    await h.inline_cb(g, InvCB(id=inv_id, a="n").pack())
    edit = h.session.last(EditMessageText)
    assert "10 marta</b> urinib ko'rdingiz... mayli, baribir Ha ekan 😏" in edit.text
    assert buttons(edit.reply_markup) == ["☕ Kafe", "🎬 Kino"]
    # eski "Yo'q" tugmasi endi ishlamaydi
    await h.inline_cb(g, InvCB(id=inv_id, a="n").pack())
    assert h.session.last(AnswerCallbackQuery).text == "Bu tugma endi faol emas"

    await h.inline_cb(g, InvCB(id=inv_id, a="p", i=0).pack())
    await h.inline_cb(g, InvCB(id=inv_id, a="t", i=1).pack())
    final = h.session.last(EditMessageText)
    assert "baribir Ha ekan" in final.text and "rozi bo'ldi — ☕ Kafe, Yakshanba, 12:00" in final.text
    owner_msgs = [m.text for m in h.session.of(SendMessage) if m.chat_id == OWNER]
    assert "'Ha' dedi — ☕ Kafe, Yakshanba, 12:00" in owner_msgs[-2]
    assert "10 marta 'Yo'q' deb o'ynashdan keyin baribir 'Ha' dedi 😄" in owner_msgs[-1]
    [resp] = await h.db.list_responses(inv_id)
    assert resp.answer == "yes" and resp.no_count == 10 and resp.forced_yes


async def test_yes_after_some_no_restores_text(h):
    inv_id = await make_inv(h)
    g = h.user(GUEST)
    await h.inline_cb(g, InvCB(id=inv_id, a="n").pack())
    await h.inline_cb(g, InvCB(id=inv_id, a="n").pack())
    await h.inline_cb(g, InvCB(id=inv_id, a="y").pack())
    edit = h.session.last(EditMessageText)
    assert "Aniqmi" not in edit.text and "Sizni &lt;taklif&gt; qilaman" in edit.text
    assert buttons(edit.reply_markup) == ["☕ Kafe", "🎬 Kino"]


async def test_forced_yes_fixed_finishes_immediately(h):
    inv_id = await make_inv(h, let_guest_pick=False, fixed_place="Park", fixed_time="Shanba")
    g = h.user(GUEST, "Aziz")
    for _ in range(10):
        await h.inline_cb(g, InvCB(id=inv_id, a="n").pack())
    final = h.session.last(EditMessageText)
    assert "baribir Ha ekan" in final.text and "rozi bo'ldi — Park, Shanba" in final.text
    assert final.reply_markup is None


async def test_owner_cannot_answer_inline_but_can_in_test_copy(h):
    inv_id = await make_inv(h, let_guest_pick=False, fixed_place="Park", fixed_time="Shanba")
    owner = h.user(OWNER, "Dilnoza")
    await h.inline_cb(owner, InvCB(id=inv_id, a="y").pack())
    assert "sizning taklifnomangiz" in h.session.last(AnswerCallbackQuery).text
    assert not await h.db.list_responses(inv_id)

    # 🧪 Sinab ko'rish: bot shaxsiy chatga jonli nusxa yuboradi
    await h.private_cb(owner, MineCB(a="test", id=inv_id).pack())
    copy = h.session.last(SendMessage)
    assert buttons(copy.reply_markup) == ["Ha 💖", "Yo'q"]
    await h.private_cb(owner, InvCB(id=inv_id, a="y").pack(), message_id=1000)
    final = h.session.last(EditMessageText)
    assert final.chat_id == OWNER and final.message_id == 1000 and final.inline_message_id is None
    reaction = h.session.last(SetMessageReaction)  # oddiy xabarda 🎉 reaksiya qo'yiladi
    assert reaction.reaction[0].emoji == "🎉" and reaction.is_big
    [resp] = await h.db.list_responses(inv_id)
    assert (resp.chat_id, resp.message_id) == (OWNER, 1000)


async def test_deleted_invitation_and_preview_buttons(h):
    g = h.user(GUEST)
    await h.inline_cb(g, InvCB(id=12345, a="y").pack())
    assert "o'chirilgan" in h.session.last(AnswerCallbackQuery).text
    await h.private_cb(g, InvCB(id=0, a="x").pack())
    assert "namuna" in h.session.last(AnswerCallbackQuery).text


# ---------- /mine ----------

async def test_mine_responses_and_delete(h):
    inv_id = await make_inv(h)
    g = h.user(GUEST, "Aziz")
    await h.inline_cb(g, InvCB(id=inv_id, a="n").pack(), inline_message_id="A")
    await h.inline_cb(h.user(OTHER, "Vali"), InvCB(id=inv_id, a="y").pack(), inline_message_id="B")
    owner = h.user(OWNER)

    await h.text(owner, "/mine")
    card = h.session.last(SendMessage)
    assert "#%d" % inv_id in card.text and "Javoblar: 2" in card.text
    await h.private_cb(owner, MineCB(a="resp", id=inv_id).pack())
    text = h.session.last(EditMessageText).text
    assert "Aziz" in text and "«Yo'q» × 1" in text and "Vali" in text and "joy/vaqt tanlanmoqda" in text

    # boshqa odam o'chira olmaydi
    await h.private_cb(g, MineCB(a="delok", id=inv_id).pack())
    assert await h.db.get_invitation(inv_id) is not None
    await h.private_cb(owner, MineCB(a="del", id=inv_id).pack())
    await h.private_cb(owner, MineCB(a="delok", id=inv_id).pack())
    assert await h.db.get_invitation(inv_id) is None
    assert await h.db.list_responses(inv_id) == []  # ON DELETE CASCADE
    assert "Hali taklifnomangiz yo'q" in h.session.last(EditMessageText).text


async def test_help_mentions_bot_username(h):
    await h.text(h.user(OWNER, lang="ru"), "/help")
    assert "@TaklifnomaBot" in h.session.last(SendMessage).text
    assert "инструкция" in h.session.last(SendMessage).text


async def test_set_commands_for_all_languages(h):
    from aiogram.methods import SetMyCommands
    from bot import set_commands

    await set_commands(h.bot)
    calls = h.session.of(SetMyCommands)
    assert [c.language_code for c in calls] == [None, "ru", "en"]
    assert [c.command for c in calls[0].commands] == ["start", "new", "mine", "help"]
