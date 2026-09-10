/// Runtime configuration — every value overridable via `--dart-define` for
/// staging/prod builds, defaulting to this repo's actual dev Supabase project
/// and local `web_app`/`realtime-gateway` so `flutter run` works out of the box.
///
/// The Supabase anon key is a public, client-safe credential by design (same
/// key already shipped in web_app's browser bundle as NEXT_PUBLIC_SUPABASE_ANON_KEY)
/// — never put the service-role key here.
class AppConfig {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://nkhaigpskpsweimalugu.supabase.co',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'sb_publishable_MpA3PdSnoLRcU8dMP9PN8Q_cegowEpU',
  );

  /// web_app's Next.js API — the ONLY data surface this app talks to besides
  /// Supabase Auth itself (plans/my_hole_project_plan.md §7.7 point 1).
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Standalone Realtime Gateway process (§7.9, §8.1) — run via `npm run dev:realtime`.
  static const realtimeUrl = String.fromEnvironment(
    'REALTIME_URL',
    defaultValue: 'http://localhost:9010',
  );
}
