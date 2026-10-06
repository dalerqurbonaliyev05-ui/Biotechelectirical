# Testing

## Automated

| What | Command | Where it runs |
| --- | --- | --- |
| Content validation and generated files up to date | `node scripts/build-content.mjs --check` | CI (ElektrUy app) |
| Translations complete in uz / ru / en | `cd app && node l10n_src/build.mjs` (fails on a missing key or placeholder) | CI |
| Static analysis | `cd app && flutter analyze` | CI |
| Unit and widget tests (74) | `cd app && flutter test` | CI |
| Debug APK (also compiles the Kotlin ARCore code) | `flutter build apk --debug` | CI → artifact `elektruy-debug-apk` and prerelease |
| Admin lint, typecheck, build | `cd admin && npm run lint && npm run typecheck && npm run build` | CI (ElektrUy admin) |
| RLS smoke test (13 checks) | run `supabase/tests/rls_smoke.sql` in the SQL editor | manual; it rolls back |
| Supabase advisors | Dashboard → Advisors (security and performance) | manual |

### What the Flutter tests cover

- **`test/calc/`**, the pure-Dart calculation module:
  - Electrical: load current, cos φ, voltage drop, breaker and cross-section choice, the 3.6 kW → 20 A / 4 mm² case.
  - Geometry: wall coordinates, photo-to-wall mapping, Manhattan routes, the 15 cm ceiling band and corner offset.
  - Planner: circuits and grouping (max 6 sockets), dedicated lines, auto-added switch and assumed input, double and pass-through switches, cable upsizing for long runs, warnings.
  - Scope guard: every blocking rule.
  - Materials: hidden, drywall and open wiring, existing junction box, quantity edits.
  - Diagrams: one per switch and per socket circuit.
- **`test/widget/wizard_test.dart`:**
  - The photos step blocks "Next" without a photo.
  - The questions step builds a plan and opens the result.
  - Answering "panel work" sends the user to the electrician screen.
- **`test/services/voice_command_test.dart`:** next, back and repeat in Uzbek, Russian and English, with unrelated speech ignored.

## Manual test plan (Android phone)

Install the debug APK from the latest `elektruy-debug-<sha>` prerelease. Repeat the key flows in **uz**, **ru** and **en**.

### First run and legal

1. On a fresh install, the language screen preselects the device language (Uzbek if the device language is not uz, ru or en).
2. Onboarding shows 3 slides, then the disclaimer and privacy checkboxes. You cannot continue until both are ticked.
3. In the admin panel, publish a new disclaimer version. Pull to refresh on Home, or restart the app: the re-consent screen must appear, and the app cannot be used until you accept.

### Sign-in

4. **Continue with Google** works (see GOOGLE_OAUTH.md). Cancelling the dialog shows no error.
5. **Continue offline**: lessons, the materials calculator and projects work. The marketplace and AI show "Sign in to use this feature".

### Room project

6. Take 1–6 photos and assign walls A–D. Photos must not keep GPS EXIF: check that the uploaded file has no location.
7. Add markers of every type, drag them, and set "same point as on another photo".
8. **Size:** enter it manually. Check that values out of range are rejected.
9. **AI estimate** (online): a loading state, then the estimate with a confidence level, then you must confirm the values. With bad photos the result is "unusable" and you are asked to measure by hand.
10. **AR** on an ARCore phone: measure the length. On a phone without ARCore, the AR button is hidden and a hint is shown.
11. **Questions:**
    - Add a 2.5 kW appliance and check that it gets a dedicated line.
    - Add a 4 kW appliance and check that the out-of-scope screen opens.
    - Tick "panel work" and check that the out-of-scope screen opens.
12. **Result:**
    - 2D plan: long-press and drag a socket. The route updates and the position is remembered after reopening.
    - 3D: rotate, zoom, reset, toggle cables. It must work in **airplane mode**.
    - Route, diagram and materials tabs. Edit a quantity and a price; the total updates.
    - Export the PDF and open it. Cyrillic and Uzbek letters must be readable.
    - Steps: the safety gate appears, then the project is "in progress"; then mark it done.
13. The disclaimer banner is visible on the result screen.

### Lessons and voice

14. Opening a lesson always shows the safety checklist first. Declining closes the lesson.
15. Steps can be ticked, and progress survives an app restart and syncs to a second phone with the same account.
16. **Voice guide:**
    - The step is read aloud.
    - Saying "keyingi" / "далее" / "next" moves forward, "oldingi" / "назад" / "back" goes back, and "takrorla" / "повтор" / "repeat" repeats.
    - The app must not react to its own voice.
17. **Quiz:** under 60 % offers a retry. Passing marks the lesson completed.
18. Use *Report a mistake* to send a report, then check that it appears in admin → Reports.

### Check my work

19. Send 1–4 photos.
    - The result shows ok / warnings / critical / unclear, with issues and lesson links.
    - Critical results show the red "Do not switch on" banner.
    - The disclaimer is always shown.
20. Use **The AI is wrong**. The result appears in admin → AI checks → Flagged, and the admin can see those photos (only for flagged results).
21. Go over the quota (`ai_limits`, e.g. 10 per hour) and check that you get a localized limit message.

### Marketplace

22. Apply as an electrician. The status is "pending" and the profile is hidden from the list.
23. Approve it in admin. It is now visible and you can call it or open Telegram. Editing the profile in the app sends it back to pending.
24. Write and edit a review: the rating updates. Hiding the review in admin removes it from the rating.

### Settings and privacy

25. Switch language, theme, units, region and currency. Prices and texts update.
26. Offline content: "Update now", download lesson pictures, clear downloaded content (the built-in content stays).
27. **Sign out:** local projects are removed from the phone. Signing in again restores them from the server.
28. **Delete my data:**
    - Typing DELETE is required.
    - Afterwards, admin → Users shows 0 projects and checks for that user.
    - The Storage folders `ew-project-photos/<uid>` and `ew-work-checks/<uid>` are empty.
29. **Banned user** (admin → Users → Ban): AI calls and writes are refused. Lessons are still readable.

### Admin panel

30. A non-admin Google account sees "not an admin". The data API also refuses its writes; you can check this in the browser console with `supabase.from('ew_lessons').insert(...)`.
31. Lesson editor: add a step with an uploaded picture and a quiz question, save, publish, then sync the app and check the lesson.
32. Calc config: break the JSON and check that the save is blocked. Change the voltage-drop limit and check that it is saved as a new version. Restore an old version.
33. Users, reports, AI checks and the audit log: CSV export opens correctly in Excel (UTF-8 BOM).
34. The audit log shows every change made in steps 31–33.

## Accessibility and devices

- Test on a small Android 7 phone (minSdk 24) and a large Android 14+ phone.
- Large system font (1.3×): buttons are at least 48 dp, and the main actions are at the bottom of the screen.
- Dark mode on all screens.
- TalkBack: the main buttons have labels.
