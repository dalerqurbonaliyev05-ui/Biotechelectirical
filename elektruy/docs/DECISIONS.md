# Decisions and known limitations

## Shared Supabase project

ElektrUy lives inside the existing project **mushuk-it-top-app** (`mjtdilcbwbqpibrooamz`), which other apps (mushuk-it, fizika, …) also use.

- **Isolation:**
  - Tables are `public.ew_*`, helpers are in the `ew_private` schema, and buckets are named `ew-*`.
  - Migrations only *create*. No existing table, policy, function or row was altered or dropped.
  - Advisor findings that belong to the other apps were left untouched on purpose.
- **Why `public.ew_*` and not a separate schema:** the Supabase Data API exposes `public` by default. A custom schema would mean changing the project's exposed-schema settings, which would affect the other apps.
- **Shared sign-up trigger:** the project already has a `handle_new_user` trigger on `auth.users`, which inserts into the mushuk-it `profiles` table. Every ElektrUy sign-up therefore also creates a mushuk-it profile row. This is harmless, and changing it would mean altering another app's function, which we must not do. ElektrUy's own profile lives in `ew_profiles` and is created by `ew_ensure_profile()`.
- **Delete account keeps `auth.users`:**
  - The `delete-account` function removes every `ew_*` row and every object under the user's folders in `ew-project-photos` and `ew-work-checks`.
  - The Google login itself is kept, because the same account may be used by the other apps.
  - The user is signed out, and nothing from ElektrUy remains.
- **Admins** are listed in `ew_admins`, by verified email or user ID. They are checked server-side by `ew_private.is_admin()` in every RLS policy and Edge Function. The admin UI gate is only a convenience. The first admin was inserted with SQL and is not committed to the repo.
- **Guard triggers** stop normal users from changing protected columns: electrician `status` and `rating`, review `hidden`, `is_banned`, and work-check results. They check `current_user in (authenticated, anon)`, so the service role used by Edge Functions is unaffected.

## AI (Claude via Supabase Edge Functions)

- The Anthropic API key exists only as the Supabase secret `ANTHROPIC_API_KEY`. The app and the admin panel never see it.
- The model is `claude-opus-5-5`, with the server-side fallback beta and structured JSON output (`output_config.format`). It can be overridden with `EW_CLAUDE_MODEL`.
- Refusals return HTTP 422 and truncation is handled. Errors are localized (uz, ru, en).
- Per-user quotas (per hour and per day) come from `ew_app_config.ai_limits`, and each feature can be disabled with `feature_flags`. Every call is logged in `ew_ai_calls`, including tokens, duration and errors.
- **Room size from photos is an estimate.**
  - The response includes a confidence level and the reference objects used.
  - The values are clamped to sane ranges.
  - The UI forces the user to check and confirm them with a tape measure before they are used.
- **Check my work is not an inspection.**
  - The prompt is conservative: unclear photos give `unclear`, and any critical finding forces "do not switch on, call an electrician".
  - The response always carries a disclaimer.
  - Users can flag a result as wrong. Only then can admins see those photos (Storage RLS), to keep photos private.

## Electrical rules (calculation module)

- All rules are conservative and configurable in `ew_app_config.calc`:
  - 220 V, copper cable.
  - Lighting: 1.5 mm² on a 10 A breaker. Sockets: 2.5 mm² on a 16 A breaker.
  - At most 6 sockets per group, voltage drop under 3–5 %.
  - Dedicated lines from 2 kW. Anything over 3.5 kW is out of scope for DIY.
  - Rooms over 30 m² trigger a warning.
- The app never tells the user to work in the distribution panel. New circuits are marked "electrician connects in the panel".
- **Out-of-scope rules block the instructions** and show the electrician screen: panel work, grounding, 3-phase supply, wet rooms, aluminium wiring, damaged wiring, boilers and high-power appliances. Lessons stay readable.
- **Routing:** only vertical and horizontal runs, horizontal 15 cm below the ceiling, verticals 15 cm from corners, joints only in boxes. Ceiling lamps are fed from the nearest wall.
- **Positions from photos are approximate.** A marker's horizontal position on a photo maps onto the wall assigned to that photo. Users fix positions by dragging devices on the 2D plan, and placements are saved per project.

## Platform choices

- **Android only.** The web is used only for the admin panel. The Flutter project has no iOS folder.
- **AR measuring uses ARCore only** (AR Optional, `com.google.ar:core`). Phones without ARCore support see "enter the size manually". If ARCore is supported but not installed, the AR screen offers to install it from Play.
  - Measurement is a straight-line distance between two tapped points on detected surfaces (planes, feature points or depth points).
  - Accuracy is typically ±1–3 cm and depends on lighting and texture.
- **Voice guide:**
  - Uzbek TTS voices are not installed on many phones. The app tries `uz-UZ`, then falls back to the system voice and tells the user how to install one.
  - Speech recognition uses on-device recognition when available and otherwise falls back to the online recognizer.
  - Command matching is keyword-based in all three languages and unit-tested.
  - Listening pauses while the app speaks, so it does not hear itself.
- **3D viewer:** Three.js and OrbitControls are bundled by esbuild into one offline HTML asset (`assets/viewer3d/index.html`) and loaded in a WebView. Navigation away from the bundled file is blocked.
- **Offline-first:**
  - Content (lessons, materials, prices, config, legal) ships in the APK and is replaced by the server version after a sync.
  - Projects, progress, consents, safety-gate acknowledgements and reports are stored in drift (SQLite) and an outbox, and pushed when online.
  - On a sync conflict, the last writer wins, using `updated_at`.
- **Sign-out clears local data.** On shared phones, nothing from the account stays on the device. The app syncs first and warns if changes could not be uploaded.
- **Android backups are disabled** (`allowBackup=false` plus data extraction rules), so private photos and tokens are not copied to the cloud.
- **Google sign-in nonce:** a random raw nonce is created per `AuthService` instance. Its SHA-256 goes to Google, and the raw value goes to Supabase. `GoogleSignIn.instance.initialize` may be called only once per process, so the nonce is fixed for the process lifetime. That is acceptable: the ID token is single-use and short-lived.

## Content and prices

- `content/*.json` is the single source of truth for the bundled app content and the database seed (`scripts/build-content.mjs`). After launch, admins edit content in the panel, and the database version wins on the phones.
- **Material prices (UZS) and the USD rate are placeholders.** They are realistic, but not market quotes. Admins must update prices per region in the panel. Users can override any line in their own project.
- The 20 lesson illustrations are simple generated SVGs. Admins can upload real photos per step, which users can download for offline use.

## Build environment

- The development container could not reach `dl.google.com`, so there was no Android SDK, Gradle or Maven Google. The Kotlin/ARCore code is compiled only in GitHub Actions. The **ElektrUy app** workflow builds the debug APK on every relevant push and publishes it as an artifact and a prerelease.
- The Vercel connector had no access to the team scope, so the admin panel's first deployment is a manual dashboard import (see README).
- `supabase.co` was not reachable directly from the container. Edge Functions were checked from the database with `pg_net`: all three boot and return a localized 401 without a JWT. Calls that reach Claude need `ANTHROPIC_API_KEY`.
