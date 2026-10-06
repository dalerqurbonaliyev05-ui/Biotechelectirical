/// Build-time configuration (`--dart-define`). The Supabase URL and anon key are
/// public client values (data is protected by RLS); the Claude API key never
/// reaches the app — it lives only in Supabase Edge Function secrets.
class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://mjtdilcbwbqpibrooamz.supabase.co',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qdGRpbGNid2JxcGlicm9vYW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMDQ1NDAsImV4cCI6MjEwNjY4MDU0MH0.4nbJH-H__PnqLHHpn4rdq6kgsM0CuE9Ac9GP4G6u2V8',
  );

  /// OAuth 2.0 *Web* client ID from Google Cloud (used as serverClientId so the
  /// ID token is accepted by Supabase). See docs/GOOGLE_OAUTH.md.
  static const googleWebClientId = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');

  static const lessonMediaBucket = 'ew-lesson-media';
  static const projectPhotosBucket = 'ew-project-photos';
  static const workChecksBucket = 'ew-work-checks';

  static String publicMediaUrl(String path) => '$supabaseUrl/storage/v1/object/public/$lessonMediaBucket/$path';
}
