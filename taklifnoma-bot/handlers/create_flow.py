"""QISM 1 — taklifnoma yaratish (shaxsiy chatda, FSM)."""
from __future__ import annotations

from services.render import esc

from aiogram import Bot, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

from keyboards import create as kb
from keyboards.callbacks import CreateCB, LangCB
from keyboards.invitation import invitation_kb
from services.db import Database, Invitation
from services.i18n import LANGS, t, tl
from services.render import PLACES, TYPES, render_invitation, snippet

router = Router(name="create_flow")
router.message.filter(F.chat.type == "private")
router.callback_query.filter(F.message.chat.type == "private")

# Matn uzunligi cheklovlari
MAX_EYEBROW = 100
MAX_MESSAGE = 1500
MAX_QUESTION = 200
MAX_FIXED = 150
MAX_TIME_OPTION = 40
MAX_TIME_OPTIONS = 8


class Create(StatesGroup):
    type = State()
    eyebrow = State()
    message = State()
    question = State()
    allow_no = State()
    guest_pick = State()
    places = State()
    times = State()
    fixed_place = State()
    fixed_time = State()
    confirm = State()


# Matn qabul qiladigan bosqichlar: state -> (data kaliti, maksimal uzunlik, prompt kaliti)
TEXT_STEPS = {
    Create.eyebrow.state: ("eyebrow", MAX_EYEBROW, "create.ask_eyebrow"),
    Create.message.state: ("message", MAX_MESSAGE, "create.ask_message"),
    Create.question.state: ("question", MAX_QUESTION, "create.ask_question"),
    Create.fixed_place.state: ("fixed_place", MAX_FIXED, "create.ask_fixed_place"),
    Create.fixed_time.state: ("fixed_time", MAX_FIXED, "create.ask_fixed_time"),
}


def next_step(state: str, data: dict) -> str:
    order = {
        Create.type.state: Create.eyebrow.state,
        Create.eyebrow.state: Create.message.state,
        Create.message.state: Create.question.state,
        Create.question.state: Create.allow_no.state,
        Create.allow_no.state: Create.guest_pick.state,
        Create.guest_pick.state: Create.places.state if data.get("let_guest_pick") else Create.fixed_place.state,
        Create.places.state: Create.times.state,
        Create.times.state: Create.confirm.state,
        Create.fixed_place.state: Create.fixed_time.state,
        Create.fixed_time.state: Create.confirm.state,
    }
    return order[state]


def prev_step(state: str, data: dict) -> str | None:
    order = {
        Create.type.state: None,  # tilni tanlashga qaytadi
        Create.eyebrow.state: Create.type.state,
        Create.message.state: Create.eyebrow.state,
        Create.question.state: Create.message.state,
        Create.allow_no.state: Create.question.state,
        Create.guest_pick.state: Create.allow_no.state,
        Create.places.state: Create.guest_pick.state,
        Create.times.state: Create.places.state,
        Create.fixed_place.state: Create.guest_pick.state,
        Create.fixed_time.state: Create.fixed_place.state,
        Create.confirm.state: Create.times.state if data.get("let_guest_pick") else Create.fixed_time.state,
    }
    return order.get(state)


def draft_invitation(data: dict, lang: str) -> Invitation:
    """FSM ma'lumotlaridan saqlanmagan (namuna) taklifnoma obyekti."""
    pick = bool(data.get("let_guest_pick"))
    return Invitation(
        id=0,
        creator_tg_id=0,
        type=data["type"],
        eyebrow=data.get("eyebrow", ""),
        message=data["message"],
        question=data["question"],
        allow_no=bool(data.get("allow_no")),
        let_guest_pick=pick,
        place_options=list(data.get("place_options") or []) if pick else [],
        time_options=list(data.get("time_options") or []) if pick else [],
        fixed_place=None if pick else data.get("fixed_place"),
        fixed_time=None if pick else data.get("fixed_time"),
        lang=lang,
        sent_count=0,
        created_at="",
    )


async def _show(target: Message, text: str, markup: InlineKeyboardMarkup, edit: bool) -> None:
    """Bosqich savolini ko'rsatadi: tugma bosilganda — o'sha xabarni tahrirlaydi, aks holda yangisini yuboradi."""
    if edit:
        try:
            await target.edit_text(text, reply_markup=markup)
            return
        except TelegramBadRequest:
            pass
    await target.answer(text, reply_markup=markup)


async def show_step(step: str, target: Message, state: FSMContext, lang: str, edit: bool) -> None:
    await state.set_state(step)
    data = await state.get_data()

    if step == Create.type.state:
        await _show(target, t(lang, "create.choose_type"), kb.types_kb(lang), edit)

    elif step in TEXT_STEPS:
        key, _, prompt = TEXT_STEPS[step]
        current = data.get(key)
        text = t(lang, prompt)
        if current:
            text += t(lang, "create.current", value=esc(snippet(current, 120)))
        if step == Create.question.state:
            markup = kb.suggestions_kb(lang, data["type"], keep=bool(current))
        else:
            markup = kb.nav_kb(lang, keep=bool(current))
        await _show(target, text, markup, edit)

    elif step == Create.allow_no.state:
        await _show(target, t(lang, "create.ask_allow_no"), kb.yes_no_kb(lang, "allow", data.get("allow_no")), edit)

    elif step == Create.guest_pick.state:
        await _show(target, t(lang, "create.ask_guest_pick"),
                    kb.yes_no_kb(lang, "pick", data.get("let_guest_pick")), edit)

    elif step == Create.places.state:
        await _show(target, t(lang, "create.ask_places"), kb.places_kb(lang, data.get("place_options", [])), edit)

    elif step == Create.times.state:
        current = data.get("time_options")
        text = t(lang, "create.ask_times")
        if current:
            text += t(lang, "create.current", value=esc(" · ".join(current)))
        await _show(target, text, kb.nav_kb(lang, keep=bool(current)), edit)

    elif step == Create.confirm.state:
        # Namuna: aynan chatga qanday ketsa, shunday ko'rinishda (tugmalar faqat toast ko'rsatadi)
        draft = draft_invitation(data, lang)
        if edit:
            try:
                await target.edit_text(t(lang, "create.preview_title"))
            except TelegramBadRequest:
                await target.answer(t(lang, "create.preview_title"))
        else:
            await target.answer(t(lang, "create.preview_title"))
        await target.answer(render_invitation(draft), reply_markup=invitation_kb(draft, preview=True))
        await target.answer(t(lang, "create.confirm"), reply_markup=kb.confirm_kb(lang))


async def advance(current: str, target: Message, state: FSMContext, lang: str, edit: bool) -> None:
    await show_step(next_step(current, await state.get_data()), target, state, lang, edit)


async def start_creation(target: Message, state: FSMContext, lang: str, edit: bool = False) -> None:
    await state.clear()
    await show_step(Create.type.state, target, state, lang, edit)


# ---------- /start, til tanlash, /new ----------

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    """/start (shu jumladan inline rejimdagi "➕ Yangi taklifnoma" deep-link'i): til -> taklifnoma turi."""
    await state.clear()
    await message.answer(t("uz", "choose_lang"), reply_markup=kb.lang_kb())


@router.callback_query(LangCB.filter(F.code.in_(LANGS)))
async def on_lang(cq: CallbackQuery, callback_data: LangCB, state: FSMContext, db: Database) -> None:
    lang = callback_data.code
    await db.set_user_lang(cq.from_user.id, lang)
    await cq.answer(t(lang, "lang_set"))
    await cq.message.edit_text(t(lang, "welcome", name=esc(cq.from_user.first_name)))
    await start_creation(cq.message, state, lang)


@router.message(Command("new"))
async def cmd_new(message: Message, state: FSMContext, lang: str) -> None:
    await start_creation(message, state, lang)


@router.callback_query(CreateCB.filter(F.a == "new"))
async def on_new(cq: CallbackQuery, state: FSMContext, lang: str) -> None:
    await cq.answer()
    await start_creation(cq.message, state, lang)


# ---------- umumiy navigatsiya ----------

@router.callback_query(CreateCB.filter(F.a == "cancel"))
async def on_cancel(cq: CallbackQuery, state: FSMContext, lang: str) -> None:
    await state.clear()
    await cq.answer()
    await cq.message.edit_text(t(lang, "create.cancelled"))


@router.callback_query(CreateCB.filter(F.a == "back"))
async def on_back(cq: CallbackQuery, state: FSMContext, lang: str) -> None:
    await cq.answer()
    current = await state.get_state()
    if current is None:
        await cq.message.edit_text(t(lang, "create.expired"))
        return
    previous = prev_step(current, await state.get_data())
    if previous is None:
        await state.clear()
        await cq.message.edit_text(t(lang, "choose_lang"), reply_markup=kb.lang_kb())
        return
    await show_step(previous, cq.message, state, lang, edit=True)


@router.callback_query(CreateCB.filter(F.a == "keep"))
async def on_keep(cq: CallbackQuery, state: FSMContext, lang: str) -> None:
    await cq.answer()
    current = await state.get_state()
    if current is None:
        await cq.message.edit_text(t(lang, "create.expired"))
        return
    await advance(current, cq.message, state, lang, edit=True)


# ---------- tugmali bosqichlar ----------

@router.callback_query(Create.type, CreateCB.filter(F.a == "type"))
async def on_type(cq: CallbackQuery, callback_data: CreateCB, state: FSMContext, lang: str) -> None:
    if callback_data.v not in TYPES:
        await cq.answer()
        return
    await cq.answer()
    await state.update_data(type=callback_data.v)
    await advance(Create.type.state, cq.message, state, lang, edit=True)


@router.callback_query(Create.question, CreateCB.filter(F.a == "sug"))
async def on_suggestion(cq: CallbackQuery, callback_data: CreateCB, state: FSMContext, lang: str) -> None:
    data = await state.get_data()
    suggestions = tl(lang, f"question_suggestions.{data['type']}")
    try:
        question = suggestions[int(callback_data.v)]
    except (ValueError, IndexError):
        await cq.answer()
        return
    await cq.answer()
    await state.update_data(question=question)
    await advance(Create.question.state, cq.message, state, lang, edit=True)


@router.callback_query(Create.allow_no, CreateCB.filter(F.a == "allow"))
async def on_allow_no(cq: CallbackQuery, callback_data: CreateCB, state: FSMContext, lang: str) -> None:
    await cq.answer()
    await state.update_data(allow_no=callback_data.v == "1")
    await advance(Create.allow_no.state, cq.message, state, lang, edit=True)


@router.callback_query(Create.guest_pick, CreateCB.filter(F.a == "pick"))
async def on_guest_pick(cq: CallbackQuery, callback_data: CreateCB, state: FSMContext, lang: str) -> None:
    await cq.answer()
    await state.update_data(let_guest_pick=callback_data.v == "1")
    await advance(Create.guest_pick.state, cq.message, state, lang, edit=True)


@router.callback_query(Create.places, CreateCB.filter(F.a == "pl"))
async def on_place_toggle(cq: CallbackQuery, callback_data: CreateCB, state: FSMContext, lang: str) -> None:
    if callback_data.v not in PLACES:
        await cq.answer()
        return
    selected = list((await state.get_data()).get("place_options", []))
    if callback_data.v in selected:
        selected.remove(callback_data.v)
    else:
        selected.append(callback_data.v)
    # Tanlash tartibidan qat'i nazar, ro'yxat doim bir xil tartibda turadi
    selected = [p for p in PLACES if p in selected]
    await state.update_data(place_options=selected)
    await cq.answer()
    await cq.message.edit_reply_markup(reply_markup=kb.places_kb(lang, selected))


@router.callback_query(Create.places, CreateCB.filter(F.a == "pl_done"))
async def on_places_done(cq: CallbackQuery, state: FSMContext, lang: str) -> None:
    if not (await state.get_data()).get("place_options"):
        await cq.answer(t(lang, "create.err_no_places"), show_alert=True)
        return
    await cq.answer()
    await advance(Create.places.state, cq.message, state, lang, edit=True)


# ---------- matnli bosqichlar ----------

@router.message(Create.times)
async def on_times(message: Message, state: FSMContext, lang: str) -> None:
    if not message.text:
        await message.answer(t(lang, "create.err_text"))
        return
    options = [line.strip() for line in message.text.splitlines() if line.strip()]
    if not 1 <= len(options) <= MAX_TIME_OPTIONS:
        await message.answer(t(lang, "create.err_times_count", max=MAX_TIME_OPTIONS))
        return
    if any(len(o) > MAX_TIME_OPTION for o in options):
        await message.answer(t(lang, "create.err_time_long", max=MAX_TIME_OPTION))
        return
    await state.update_data(time_options=options)
    await advance(Create.times.state, message, state, lang, edit=False)


@router.message(Create.eyebrow)
@router.message(Create.message)
@router.message(Create.question)
@router.message(Create.fixed_place)
@router.message(Create.fixed_time)
async def on_text_step(message: Message, state: FSMContext, lang: str) -> None:
    current = await state.get_state()
    key, max_len, _ = TEXT_STEPS[current]
    text = (message.text or "").strip()
    if not text:
        await message.answer(t(lang, "create.err_text"))
        return
    if len(text) > max_len:
        await message.answer(t(lang, "create.err_too_long", max=max_len))
        return
    await state.update_data(**{key: text})
    await advance(current, message, state, lang, edit=False)


# ---------- saqlash ----------

@router.callback_query(Create.confirm, CreateCB.filter(F.a == "save"))
async def on_save(cq: CallbackQuery, state: FSMContext, lang: str, db: Database, bot: Bot) -> None:
    data = await state.get_data()
    draft = draft_invitation(data, lang)
    invitation_id = await db.create_invitation(cq.from_user.id, {
        "type": draft.type,
        "eyebrow": draft.eyebrow,
        "message": draft.message,
        "question": draft.question,
        "allow_no": draft.allow_no,
        "let_guest_pick": draft.let_guest_pick,
        "place_options": draft.place_options,
        "time_options": draft.time_options,
        "fixed_place": draft.fixed_place,
        "fixed_time": draft.fixed_time,
        "lang": lang,
    })
    await state.clear()
    await cq.answer("💾")
    me = await bot.me()
    await cq.message.edit_text(t(lang, "create.saved", bot=me.username), reply_markup=kb.saved_kb(lang, invitation_id))


# Eskirgan (state yo'q) yaratish tugmalari
@router.callback_query(CreateCB.filter())
async def on_stale_create_button(cq: CallbackQuery, lang: str) -> None:
    await cq.answer(t(lang, "create.expired"), show_alert=True)
