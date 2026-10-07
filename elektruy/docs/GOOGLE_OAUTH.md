# Google sign-in setup

The app uses `google_sign_in` 7 (Android Credential Manager) to get a Google **ID token**, then calls `supabase.auth.signInWithIdToken(provider: google, idToken, nonce)`. The admin panel uses the regular Supabase OAuth redirect.

All steps happen in the **same Google Cloud project**.

## 1. OAuth consent screen

Google Cloud Console → *APIs & Services → OAuth consent screen*:

- User type: External.
- App name "ElektrUy", plus a support email.
- Scopes: `openid`, `email`, `profile`.
- While the app is in *Testing*, add the test users. Publish it when you are ready.

## 2. Web client (required, used by Supabase and the app)

*Credentials → Create credentials → OAuth client ID → Web application*:

- **Authorized redirect URIs:** `https://mjtdilcbwbqpibrooamz.supabase.co/auth/v1/callback`
- **Authorized JavaScript origins:** the admin panel URL (for example `https://elektruy-admin.vercel.app`) and `http://localhost:5173`.

Copy the **client ID** and **client secret**.

## 3. Android client (required for the app)

*Create credentials → OAuth client ID → Android*:

- **Package name:** `uz.elektruy.app`
- **SHA-1 certificate fingerprint:** the key that signs the APK.
  - Debug builds from CI: open `debug-signing.txt` in the `elektruy-debug-apk` artifact. Set the `ELEKTRUY_DEBUG_KEYSTORE_B64` secret so the fingerprint stays the same between runs.
  - Local debug: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`
  - Release: the SHA-1 of your upload key. With Play App Signing, also add the SHA-1 of the app signing key shown in Play Console.

You can create several Android clients, one per SHA-1.

The Android client ID itself is not used in code. Its existence is what makes Google issue tokens for this package and signature.

## 4. Supabase

Dashboard → *Authentication → Sign In / Providers → Google*:

- Enable it.
- Client ID: the **web** client ID. Client secret: the web client secret.
- **Authorized Client IDs:** add the web client ID. Add the Android client ID too if you like; the ID token audience is the web client, because the app passes it as `serverClientId`.
- Leave "Skip nonce check" **off**. The app sends `sha256(rawNonce)` to Google and the raw nonce to Supabase.

Dashboard → *Authentication → URL Configuration*:

- **Redirect URLs:** add the admin panel URL(s), e.g. `https://elektruy-admin.vercel.app/**` and `http://localhost:5173/**`.

The project is shared with other apps, so keep their existing entries.

## 5. Build the app with the web client ID

The project's web client ID (`750388048949-4ki7eeq6j59nbhn6dqliij86g9g1jnmo.apps.googleusercontent.com`, shared with the other apps in this Supabase project) is compiled in as the default in `lib/core/env.dart`. Override it only for another Google Cloud project:

```bash
flutter run --dart-define=GOOGLE_WEB_CLIENT_ID=1234-abc.apps.googleusercontent.com
```

For CI builds, an override goes in the repository variable `ELEKTRUY_GOOGLE_WEB_CLIENT_ID` under *Settings → Secrets and variables → Actions → Variables*. If the ID is ever empty, the sign-in screen shows "Google sign-in is not configured in this build", and "Continue offline" still works.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `[16] Account reauth failed` / `No credentials available` | The SHA-1 or package of the installed APK is not registered as an Android client in the same project as the web client. |
| `Passed nonce and nonce in id_token should either both exist or not` | "Skip nonce check" misconfigured, or an old build. |
| `Unacceptable audience in id_token` | The web client ID is missing from Supabase *Authorized Client IDs*. |
| Admin panel returns to the login page after Google | The Vercel URL is missing from Supabase Redirect URLs, or the email is not in `ew_admins`. |
