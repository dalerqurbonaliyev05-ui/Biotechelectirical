-- ════════════════════════════════════════════════════════════════
-- 0014 — Haqiqiy Supabase advisorlari natijasida tuzatishlar
-- ════════════════════════════════════════════════════════════════
-- 1) Trigger funksiyalarida search_path qat'iy (advisor: function_search_path_mutable)
alter function public.touch_updated_at() set search_path = public;
alter function public.guard_question_in_use() set search_path = public;
alter function public.guard_key_in_use() set search_path = public;

-- 2) RLS yordamchi funksiyalari (SECURITY DEFINER) anonim (kirmagan) foydalanuvchiga ochiq bo'lmasin.
--    Siyosatlar faqat `authenticated` uchun yozilgan, shuning uchun authenticated'ga EXECUTE QOLADI (RLS shularni chaqiradi);
--    anon va PUBLIC'dan olinadi. Bu funksiyalar faqat chaqiruvchining o'zi haqida javob beradi.
revoke execute on function
  public.app_role(), public.is_admin(), public.is_teacher(), public.my_group_id(),
  public.teaches_group(uuid), public.teaches_subject(uuid), public.teaches_subject_group(uuid, uuid),
  public.owns_assessment(uuid), public.teaches_assessment(uuid), public.teaches_attempt(uuid),
  public.question_visible(uuid), public.question_owned(uuid), public.student_can_see_results(uuid),
  public.lecture_visible(uuid), public.lecture_owned(uuid), public.session_owned(uuid), public.session_visible(uuid)
from public, anon;
grant execute on function
  public.app_role(), public.is_admin(), public.is_teacher(), public.my_group_id(),
  public.teaches_group(uuid), public.teaches_subject(uuid), public.teaches_subject_group(uuid, uuid),
  public.owns_assessment(uuid), public.teaches_assessment(uuid), public.teaches_attempt(uuid),
  public.question_visible(uuid), public.question_owned(uuid), public.student_can_see_results(uuid),
  public.lecture_visible(uuid), public.lecture_owned(uuid), public.session_owned(uuid), public.session_visible(uuid)
to authenticated, service_role;

-- 3) Storage: `lectures` bucket slayd miniaturalarini (JPEG) ham qabul qilsin (5-bosqich). Oldin faqat PDF edi —
--    haqiqiy Storage mime-turini tekshiradi, shuning uchun miniatura yuklash rad etilardi.
update storage.buckets set allowed_mime_types = array['application/pdf', 'image/jpeg'] where id = 'lectures';
