import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'core/db/local_db.dart';
import 'core/env.dart';
import 'l10n/gen/app_localizations.dart';
import 'state/providers.dart';
import 'ui/router.dart';
import 'ui/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  try {
    await Supabase.initialize(url: Env.supabaseUrl, publishableKey: Env.supabaseAnonKey);
  } catch (e) {
    // Offline-first: lessons, calculators and the 3D viewer work without Supabase.
    debugPrint('Supabase init failed: $e');
  }
  runApp(ProviderScope(
    overrides: [
      prefsProvider.overrideWithValue(prefs),
      dbProvider.overrideWithValue(LocalDb()),
    ],
    child: const ElektrUyApp(),
  ));
}

class ElektrUyApp extends ConsumerStatefulWidget {
  const ElektrUyApp({super.key});

  @override
  ConsumerState<ElektrUyApp> createState() => _ElektrUyAppState();
}

class _ElektrUyAppState extends ConsumerState<ElektrUyApp> {
  @override
  void initState() {
    super.initState();
    // Sync when the user signs in and whenever the phone comes back online.
    ref.listenManual(currentUserProvider, (prev, next) {
      if (next != null && prev?.id != next.id) unawaited(ref.read(syncProvider).run());
    });
    ref.listenManual(isOnlineProvider, (prev, next) {
      if (next && prev == false) unawaited(ref.read(syncProvider).run());
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(ref.read(syncProvider).run()));
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(settingsProvider);
    return MaterialApp.router(
      onGenerateTitle: (ctx) => AppLocalizations.of(ctx).appTitle,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: s.themeMode,
      locale: Locale(s.locale),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      routerConfig: ref.watch(routerProvider),
    );
  }
}
