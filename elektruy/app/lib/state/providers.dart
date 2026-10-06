import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/content/content_models.dart';
import '../core/content/content_repository.dart';
import '../core/db/local_db.dart';
import '../core/project/project_doc.dart';
import '../core/project/project_repository.dart';
import '../core/services/ai_service.dart';
import '../core/services/ar_service.dart';
import '../core/services/auth_service.dart';
import '../core/services/electricians_service.dart';
import '../core/services/pdf_service.dart';
import '../core/services/progress_repository.dart';
import '../core/services/voice_service.dart';

// ------------------------------------------------------------------ infrastructure
final prefsProvider = Provider<SharedPreferences>((ref) => throw UnimplementedError('overridden in main'));
final dbProvider = Provider<LocalDb>((ref) => throw UnimplementedError('overridden in main'));

/// Null when Supabase failed to initialise (the app still works offline).
final supabaseProvider = Provider<SupabaseClient?>((ref) {
  try {
    return Supabase.instance.client;
  } catch (_) {
    return null;
  }
});

final connectivityProvider = StreamProvider<bool>((ref) async* {
  final c = Connectivity();
  bool online(List<ConnectivityResult> r) => r.any((x) => x != ConnectivityResult.none);
  yield online(await c.checkConnectivity());
  yield* c.onConnectivityChanged.map(online);
});

final isOnlineProvider = Provider<bool>((ref) => ref.watch(connectivityProvider).value ?? true);

final sessionProvider = StreamProvider<Session?>((ref) async* {
  final client = ref.watch(supabaseProvider);
  if (client == null) {
    yield null;
    return;
  }
  yield client.auth.currentSession;
  yield* client.auth.onAuthStateChange.map((e) => e.session);
});

final currentUserProvider = Provider<User?>((ref) => ref.watch(sessionProvider).value?.user);

final authServiceProvider = Provider<AuthService?>((ref) {
  final c = ref.watch(supabaseProvider);
  return c == null ? null : AuthService(c);
});
final aiServiceProvider = Provider<AiService?>((ref) {
  final c = ref.watch(supabaseProvider);
  return c == null ? null : AiService(c);
});
final electriciansServiceProvider = Provider<ElectriciansService?>((ref) {
  final c = ref.watch(supabaseProvider);
  return c == null ? null : ElectriciansService(c);
});
final voiceServiceProvider = Provider<VoiceService>((ref) {
  final v = VoiceService();
  ref.onDispose(v.dispose);
  return v;
});
final arServiceProvider = Provider<ArService>((ref) => ArService());
final pdfServiceProvider = Provider<PdfService>((ref) => PdfService());
final contentRepoProvider = Provider<ContentRepository>((ref) => ContentRepository(ref.watch(dbProvider), ref.watch(supabaseProvider)));
final projectRepoProvider = Provider<ProjectRepository>((ref) => ProjectRepository(ref.watch(dbProvider), ref.watch(supabaseProvider)));
final progressRepoProvider = Provider<ProgressRepository>((ref) => ProgressRepository(ref.watch(dbProvider), ref.watch(supabaseProvider)));

// ------------------------------------------------------------------ settings
class AppSettings {
  const AppSettings({
    required this.locale,
    required this.languageChosen,
    required this.onboardingDone,
    required this.disclaimerVersion,
    required this.privacyVersion,
    required this.acceptedAt,
    required this.themeMode,
    required this.voiceGuide,
    required this.units,
    required this.region,
    required this.currency,
    required this.offlineMode,
  });

  final String locale;
  final bool languageChosen;
  final bool onboardingDone;
  final int disclaimerVersion;
  final int privacyVersion;
  final DateTime? acceptedAt;
  final ThemeMode themeMode;
  final bool voiceGuide;
  final String units;
  final String region;
  final String currency;

  /// "Continue offline" without a Google account (lessons and calculators only).
  final bool offlineMode;

  AppSettings copyWith({
    String? locale,
    bool? languageChosen,
    bool? onboardingDone,
    int? disclaimerVersion,
    int? privacyVersion,
    DateTime? acceptedAt,
    ThemeMode? themeMode,
    bool? voiceGuide,
    String? units,
    String? region,
    String? currency,
    bool? offlineMode,
  }) =>
      AppSettings(
        locale: locale ?? this.locale,
        languageChosen: languageChosen ?? this.languageChosen,
        onboardingDone: onboardingDone ?? this.onboardingDone,
        disclaimerVersion: disclaimerVersion ?? this.disclaimerVersion,
        privacyVersion: privacyVersion ?? this.privacyVersion,
        acceptedAt: acceptedAt ?? this.acceptedAt,
        themeMode: themeMode ?? this.themeMode,
        voiceGuide: voiceGuide ?? this.voiceGuide,
        units: units ?? this.units,
        region: region ?? this.region,
        currency: currency ?? this.currency,
        offlineMode: offlineMode ?? this.offlineMode,
      );
}

/// Device language if supported, otherwise Uzbek.
String defaultLocale() {
  final code = WidgetsBinding.instance.platformDispatcher.locale.languageCode;
  return const ['uz', 'ru', 'en'].contains(code) ? code : 'uz';
}

class SettingsNotifier extends Notifier<AppSettings> {
  SharedPreferences get _p => ref.read(prefsProvider);

  @override
  AppSettings build() {
    final p = ref.watch(prefsProvider);
    return AppSettings(
      locale: p.getString('locale') ?? defaultLocale(),
      languageChosen: p.getBool('language_chosen') ?? false,
      onboardingDone: p.getBool('onboarding_done') ?? false,
      disclaimerVersion: p.getInt('consent_disclaimer_v') ?? 0,
      privacyVersion: p.getInt('consent_privacy_v') ?? 0,
      acceptedAt: DateTime.tryParse(p.getString('consent_at') ?? ''),
      themeMode: ThemeMode.values.firstWhere((m) => m.name == p.getString('theme'), orElse: () => ThemeMode.system),
      voiceGuide: p.getBool('voice_guide') ?? true,
      units: p.getString('units') ?? 'm',
      region: p.getString('region') ?? 'tashkent_city',
      currency: p.getString('currency') ?? 'UZS',
      offlineMode: p.getBool('offline_mode') ?? false,
    );
  }

  Future<void> setLocale(String code) async {
    await _p.setString('locale', code);
    await _p.setBool('language_chosen', true);
    state = state.copyWith(locale: code, languageChosen: true);
  }

  Future<void> setTheme(ThemeMode m) async {
    await _p.setString('theme', m.name);
    state = state.copyWith(themeMode: m);
  }

  Future<void> setVoice(bool v) async {
    await _p.setBool('voice_guide', v);
    state = state.copyWith(voiceGuide: v);
  }

  Future<void> setUnits(String u) async {
    await _p.setString('units', u);
    state = state.copyWith(units: u);
  }

  Future<void> setRegion(String r) async {
    await _p.setString('region', r);
    state = state.copyWith(region: r);
  }

  Future<void> setCurrency(String c) async {
    await _p.setString('currency', c);
    state = state.copyWith(currency: c);
  }

  Future<void> setOfflineMode(bool v) async {
    await _p.setBool('offline_mode', v);
    state = state.copyWith(offlineMode: v);
  }

  /// Stores acceptance locally and queues it for ew_consents (works offline).
  Future<void> acceptLegal({required int disclaimerVersion, required int privacyVersion}) async {
    final now = DateTime.now();
    await _p.setInt('consent_disclaimer_v', disclaimerVersion);
    await _p.setInt('consent_privacy_v', privacyVersion);
    await _p.setString('consent_at', now.toIso8601String());
    await _p.setBool('onboarding_done', true);
    final db = ref.read(dbProvider);
    for (final (type, v) in [('disclaimer', disclaimerVersion), ('privacy', privacyVersion)]) {
      await db.enqueue('consent', jsonEncode({'type': type, 'version': v, 'accepted_at': now.toUtc().toIso8601String(), 'context': {'locale': state.locale}}));
    }
    state = state.copyWith(disclaimerVersion: disclaimerVersion, privacyVersion: privacyVersion, acceptedAt: now, onboardingDone: true);
  }
}

final settingsProvider = NotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);

final langProvider = Provider<String>((ref) => ref.watch(settingsProvider).locale);

// ------------------------------------------------------------------ content
class ContentNotifier extends AsyncNotifier<ContentBundle> {
  @override
  Future<ContentBundle> build() => ref.read(contentRepoProvider).loadCachedOrBundled();

  /// Pulls fresh content from Supabase; keeps the current bundle on failure.
  Future<bool> refresh() async {
    final current = state.value ?? await ref.read(contentRepoProvider).loadBundled();
    try {
      final next = await ref.read(contentRepoProvider).sync(current);
      state = AsyncData(next);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> reset() async {
    await ref.read(contentRepoProvider).clearCache();
    await ref.read(contentRepoProvider).clearImages();
    state = AsyncData(await ref.read(contentRepoProvider).loadBundled());
  }

  Future<int> downloadImages() async {
    final bundle = state.value;
    if (bundle == null) return 0;
    final http = HttpClient();
    try {
      return await ref.read(contentRepoProvider).downloadImages(bundle, http);
    } finally {
      http.close();
    }
  }
}

final contentProvider = AsyncNotifierProvider<ContentNotifier, ContentBundle>(ContentNotifier.new);

/// Latest legal versions the user still has to accept (empty when up to date).
final pendingConsentProvider = Provider<bool>((ref) {
  final s = ref.watch(settingsProvider);
  final c = ref.watch(contentProvider).value;
  if (c == null || !s.onboardingDone) return false;
  return c.legalVersion('disclaimer') > s.disclaimerVersion || c.legalVersion('privacy') > s.privacyVersion;
});

// ------------------------------------------------------------------ projects & progress
class ProjectsNotifier extends AsyncNotifier<List<ProjectDoc>> {
  @override
  Future<List<ProjectDoc>> build() {
    ref.watch(currentUserProvider);
    return ref.read(projectRepoProvider).list();
  }

  Future<void> reload() async => state = AsyncData(await ref.read(projectRepoProvider).list());

  Future<void> save(ProjectDoc doc) async {
    await ref.read(projectRepoProvider).save(doc);
    await reload();
  }

  Future<void> delete(ProjectDoc doc) async {
    await ref.read(projectRepoProvider).delete(doc);
    await reload();
    unawaited(ref.read(syncProvider).run());
  }
}

final projectsProvider = AsyncNotifierProvider<ProjectsNotifier, List<ProjectDoc>>(ProjectsNotifier.new);

class ProgressNotifier extends AsyncNotifier<Map<String, LessonProgress>> {
  @override
  Future<Map<String, LessonProgress>> build() => ref.read(progressRepoProvider).all();

  Future<void> save(LessonProgress p) async {
    await ref.read(progressRepoProvider).save(p);
    state = AsyncData({...?state.value, p.lessonId: p});
  }
}

final progressProvider = AsyncNotifierProvider<ProgressNotifier, Map<String, LessonProgress>>(ProgressNotifier.new);

// ------------------------------------------------------------------ sync
class SyncService {
  SyncService(this.ref);

  final Ref ref;
  bool _running = false;

  /// Pushes local changes and pulls server content. Safe to call often; does
  /// nothing when offline or signed out.
  Future<void> run() async {
    if (_running) return;
    final client = ref.read(supabaseProvider);
    if (client == null || client.auth.currentUser == null || !ref.read(isOnlineProvider)) return;
    _running = true;
    try {
      final lang = ref.read(settingsProvider).locale;
      try {
        await client.rpc('ew_ensure_profile', params: {'p_language': lang});
      } catch (_) {}
      await _flushOutbox(client);
      try {
        await ref.read(projectRepoProvider).sync();
        await ref.read(projectRepoProvider).pullMissing();
        await ref.read(projectsProvider.notifier).reload();
      } catch (_) {}
      try {
        await ref.read(progressRepoProvider).sync();
        ref.invalidate(progressProvider);
      } catch (_) {}
      await ref.read(contentProvider.notifier).refresh();
    } finally {
      _running = false;
    }
  }

  Future<void> _flushOutbox(SupabaseClient client) async {
    final db = ref.read(dbProvider);
    for (final item in await db.pending()) {
      final payload = jsonDecode(item.payload) as Map<String, dynamic>;
      try {
        switch (item.kind) {
          case 'consent':
          case 'safety_gate':
            await client.from('ew_consents').insert({
              'type': item.kind == 'safety_gate' ? 'safety_gate' : payload['type'],
              'version': payload['version'] ?? 1,
              'context': payload['context'] ?? {},
              'accepted_at': payload['accepted_at'],
            });
          case 'report':
            await client.from('ew_reports').insert(payload);
        }
        await db.dequeue(item.id);
      } on PostgrestException catch (e) {
        // Constraint errors will never succeed: drop them; keep anything else for later.
        if (e.code != null && (e.code!.startsWith('23') || e.code == '42501')) await db.dequeue(item.id);
      } catch (_) {
        return;
      }
    }
  }

  /// Logs a passed safety gate (queued, so it is recorded even offline).
  Future<void> logSafetyGate(Map<String, dynamic> context) => ref.read(dbProvider).enqueue(
        'safety_gate',
        jsonEncode({'version': 1, 'accepted_at': DateTime.now().toUtc().toIso8601String(), 'context': context}),
      );

  Future<void> queueReport({required String type, required String target, required String text}) async {
    await ref.read(dbProvider).enqueue('report', jsonEncode({'type': type, 'target': target, 'text': text}));
    unawaited(run());
  }
}

final syncProvider = Provider<SyncService>((ref) => SyncService(ref));
