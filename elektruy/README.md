# ElektrUy — DIY wiring guide for one small room

ElektrUy helps a homeowner plan and do the wiring of **one small room** safely. The user photographs the room, marks sockets, switches and lamps, and gets a cable route, wiring diagrams, a 3D view and a material list with prices. Step-by-step lessons come with a voice guide. Anything risky (panel work, grounding, 3-phase, wet rooms, aluminium wiring, high-power appliances) is refused and the user is sent to a licensed electrician.

| Part | Path | Stack |
| --- | --- | --- |
| Android app | `app/` | Flutter 3.47, Riverpod, go_router, drift, gen-l10n (uz / ru / en) |
| Admin panel | `admin/` | React 19, Vite, TypeScript, Tailwind 4, shadcn-style components, deployed on Vercel |
| Backend | `supabase/` | Existing Supabase project `mushuk-it-top-app` (`mjtdilcbwbqpibrooamz`): `ew_` tables, RLS, Storage, Edge Functions |
| Content | `content/` | Lessons, materials, calc config and legal texts in 3 languages (single source of truth) |
| Docs | `docs/` | [DECISIONS](docs/DECISIONS.md) · [TESTING](docs/TESTING.md) · [GOOGLE_OAUTH](docs/GOOGLE_OAUTH.md) |

> Safety: ElektrUy is an educational planning tool. It is not an electrical inspection, and AI results are never presented as one. A persistent disclaimer is shown on every result screen.

## What the app does

- **Onboarding:** language choice (device language by default, Uzbek as fallback), 3 intro slides, then acceptance of the disclaimer and privacy policy. Users must accept again whenever a new version is published.
- **Sign-in:** Google sign-in only (Supabase Auth, ID token + nonce). "Continue offline" unlocks lessons and calculators without an account.
- **Room project wizard:**
  - 1–6 photos.
  - Markers on the photos: input, socket, switch (single, double or pass-through), lamp, junction box.
  - Room size, entered one of three ways: manually, as an AI estimate from the photos (Claude via an Edge Function, must be confirmed by the user), or with ARCore measuring.
  - Questions about the room and installation, including scope checks.
- **Result:** six tabs.
  - 2D plan with draggable devices.
  - 3D view (Three.js, offline).
  - Cable route.
  - Wiring diagrams.
  - Editable bill of materials with regional prices.
  - Recommended lessons and work steps.
  - Export everything as a PDF.
- **Out-of-scope guard:** any blocking answer opens the "call a licensed electrician" screen instead of instructions.
- **Lessons:**
  - Ten built-in lessons in 3 languages.
  - A mandatory safety checklist before every lesson and job, which is logged.
  - Step checkboxes, a progress bar and a quiz.
  - Hands-free voice guide: steps are read aloud (TTS), and you can say *keyingi / далее / next*, *oldingi / назад / back* or *takrorla / повтор / repeat*.
- **Check my work:** 1–4 photos are reviewed by Claude. The result is advisory only, always shows a disclaimer, and the user can flag it as wrong.
- **Electricians:** a marketplace of admin-approved electricians, with call and Telegram links, reviews and reports.
- **Offline:** lessons, calculators, the 3D viewer and the user's projects are stored on the phone and sync when online.
- **Settings:** language, theme, units, region (for prices), currency, voice guide, offline content, legal texts. "Delete my data" removes every ElektrUy row and photo for the account.

## Repository layout

```
elektruy/
  app/            Flutter app (lib/core = pure logic, lib/ui = screens, l10n_src = translations)
  admin/          Admin panel (Vite)
  content/        lessons.json, materials.json, config.json, legal.json
  scripts/        build-content.mjs (validates content, generates app assets + seed SQL), make-illustrations.py
  supabase/
    migrations/   ew_ schema, security, RPCs, storage, seed
    functions/    estimate-room, check-work, delete-account (+ _shared)
    tests/        rls_smoke.sql
  docs/
.github/workflows/elektruy-app.yml     analyze, test, debug APK (artifact + prerelease)
.github/workflows/elektruy-admin.yml   lint, typecheck, build
```

## Setup

### 1. Supabase (already applied to `mjtdilcbwbqpibrooamz`)

Everything lives in `public.ew_*` tables, the `ew_private` schema and the `ew-*` buckets. No existing table, policy or function was changed (see [DECISIONS](docs/DECISIONS.md)).

To apply the schema to another project:

```bash
supabase link --project-ref <ref>
supabase db push                       # applies supabase/migrations in order
supabase functions deploy estimate-room check-work delete-account
```

**Required secret** (the Claude API key lives only here, never in the app or the admin bundle):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional: override the model (default claude-opus-5-5)
supabase secrets set EW_CLAUDE_MODEL=claude-opus-5-5
```

Until `ANTHROPIC_API_KEY` is set, the AI estimate and Check my work return HTTP 503 with the localized "The AI service did not respond. Please try again later." message (the function log says the secret is missing). Everything else works.

**First admin:** insert a verified Google email into `public.ew_admins` with the SQL editor (`insert into public.ew_admins (email) values ('you@example.com');`). After that, manage admins in the panel's **Admins** page.

### 2. Google sign-in

Follow [docs/GOOGLE_OAUTH.md](docs/GOOGLE_OAUTH.md). In short:

1. Create a **Web** OAuth client and an **Android** OAuth client (package `uz.elektruy.app` + SHA-1 of your signing key).
2. Enable the Google provider in Supabase and add the web client ID under *Authorized Client IDs*.
3. Build the app with `--dart-define=GOOGLE_WEB_CLIENT_ID=<web client id>`, or set the repository variable `ELEKTRUY_GOOGLE_WEB_CLIENT_ID` for CI builds.

### 3. Android app

```bash
cd app
flutter pub get
flutter test
flutter run --dart-define=GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
flutter build apk --release --dart-define=GOOGLE_WEB_CLIENT_ID=...
```

- The Supabase URL and anon key are public client values; defaults are in `lib/core/env.dart`. You can override them with `--dart-define=SUPABASE_URL=...` and `--dart-define=SUPABASE_ANON_KEY=...`.
- **Debug APK without a local SDK:** every push that touches `elektruy/app` runs the *ElektrUy app* workflow. The APK is attached as the `elektruy-debug-apk` artifact and published as a prerelease named `elektruy-debug-<sha>`.
- **Release signing:**
  - Locally: create `app/android/key.properties` (git-ignored) with `storeFile`, `storePassword`, `keyAlias` and `keyPassword`.
  - In CI: set the `ELEKTRUY_KEYSTORE_PATH`, `ELEKTRUY_KEYSTORE_PASSWORD`, `ELEKTRUY_KEY_ALIAS` and `ELEKTRUY_KEY_PASSWORD` env vars.
  - Without either, release builds use the debug key.
- **Stable debug key in CI** (so the Android OAuth client's SHA-1 never changes): store a keystore as the base64 secret `ELEKTRUY_DEBUG_KEYSTORE_B64`. The workflow prints the SHA-1 into `debug-signing.txt` inside the artifact.
- **Content changes:** edit `content/*.json` and run `node scripts/build-content.mjs`. This regenerates the app assets and the seed migration; CI fails if they are stale.
- **Translations:** edit `app/l10n_src/strings.mjs`, then run `node l10n_src/build.mjs && flutter gen-l10n`. Every key must exist in uz, ru and en.

### Public download page (energyvibe.uz/elektr-uy/)

The website section lives in the repository root: `elektr-uy/` (landing page with the download button and install guide) and `elektr-uy/yoriqnoma/` (usage guide). The source folder `elektruy/` itself is excluded from the static site via `.vercelignore`.

- **Release APKs** come from `.github/workflows/elektruy-release.yml`. On every push to `main` that changes the app, it:
  - builds a signed release APK (arm and arm64),
  - publishes it as the GitHub Release `elektruy-v1.0.N` (asset `elektruy.apk`),
  - commits `elektr-uy/apk-info.js`, which the page reads for the link, version, size and SHA-256.

  Pull requests only build it, without publishing.
- **Signing key:** it must never change, or users cannot install updates over the old app.
  - Store it as the repository secrets `ELEKTRUY_RELEASE_KEYSTORE_B64` and `ELEKTRUY_RELEASE_KEYSTORE_PASSWORD`.
  - Without them, the first run on `main` generates a key and keeps it in the Actions cache. A weekly scheduled run touches the cache so it is not evicted.
  - The run summary shows the SHA-1 to register on the Android OAuth client.
- **Screenshots** on the page are rendered from the real app. Run `flutter test tool/screenshots/screens_test.dart --update-goldens` in `app/`, then convert `tool/screenshots/out/*.png` to WebP into `elektr-uy/img/`.

### 4. Admin panel

```bash
cd admin
npm ci
npm run dev        # http://localhost:5173
npm run lint && npm run typecheck && npm run build
```

**Deploy on Vercel** (one-time, in the Vercel dashboard):

1. *Add New → Project* → import `dalerqurbonaliyev05-ui/Biotechelectirical`.
2. Name it `elektruy-admin` and set **Root Directory** to `elektruy/admin`. The framework (Vite) and the settings in `admin/vercel.json` are picked up automatically.
3. Optional env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the defaults point to the project above).
4. Deploy. `vercel.json` skips builds when nothing under `elektruy/admin` changed.
5. In Supabase → Authentication → URL Configuration, add the Vercel URL to **Redirect URLs**. This is needed for Google sign-in and email links in the panel.

Access is enforced by the database, not by the UI. Every admin read and write goes through RLS policies that check `ew_private.is_admin()`, which looks for a verified email or user ID in `ew_admins`.

The admin panel covers:

- Dashboard
- Lessons CRUD with a step and quiz editor and picture upload
- Materials and regional prices
- Versioned calc config with restore
- Electrician approval
- Review moderation
- Users (ban, delete data)
- Reports and AI checks, both with CSV export
- Versioned legal texts (publishing forces users to accept again)
- Audit log
- Admins

## Environment variables

See [`.env.example`](.env.example). Nothing secret is needed by the app or the admin. The only secret is `ANTHROPIC_API_KEY`, and it is stored in Supabase.
