import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';
import 'package:elektruy/core/content/content_models.dart';
import 'package:elektruy/core/content/content_repository.dart';
import 'package:elektruy/core/db/local_db.dart';
import 'package:elektruy/core/project/project_doc.dart';
import 'package:elektruy/core/project/project_repository.dart';
import 'package:elektruy/l10n/gen/app_localizations.dart';
import 'package:elektruy/state/providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Content bundle read from the generated assets (same data the APK ships).
ContentBundle loadTestContent() {
  Map<String, dynamic> read(String n) => jsonDecode(File('assets/content/$n.json').readAsStringSync()) as Map<String, dynamic>;
  return ContentRepository.bundleFromAssets(
    lessons: read('lessons'),
    materials: read('materials'),
    config: read('config'),
    legal: read('legal'),
  );
}

/// A database that is never opened: the fakes below keep everything in memory.
LocalDb unopenedDb() {
  driftRuntimeOptions.dontWarnAboutMultipleDatabases = true;
  return LocalDb(LazyDatabase(() => throw StateError('the database must not be used in widget tests')));
}

class FakeProjectRepository extends ProjectRepository {
  FakeProjectRepository(LocalDb db) : super(db, null);

  final docs = <String, ProjectDoc>{};

  @override
  Future<List<ProjectDoc>> list() async => docs.values.toList();

  @override
  Future<ProjectDoc?> get(String id) async => docs[id];

  @override
  Future<void> save(ProjectDoc doc) async => docs[doc.id] = doc;
}

class FakeContent extends ContentNotifier {
  FakeContent(this.bundle);

  final ContentBundle bundle;

  @override
  Future<ContentBundle> build() async => bundle;
}

/// Pumps [home] inside a router with stub result routes and English strings.
Future<FakeProjectRepository> pumpTestApp(
  dynamic tester, {
  required String initial,
  required Map<String, WidgetBuilder> routes,
  ContentBundle? content,
  void Function(FakeProjectRepository repo)? seed,
}) async {
  SharedPreferences.setMockInitialValues({'locale': 'en', 'language_chosen': true, 'onboarding_done': true});
  final prefs = await SharedPreferences.getInstance();
  final db = unopenedDb();
  final repo = FakeProjectRepository(db);
  seed?.call(repo);
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      for (final e in routes.entries) GoRoute(path: e.key, builder: (context, state) => e.value(context)),
      GoRoute(path: '/project/:id', builder: (_, st) => Text('result ${st.pathParameters['id']}')),
      GoRoute(path: '/project/:id/oos', builder: (_, st) => Text('oos ${st.pathParameters['id']}')),
    ],
  );
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        prefsProvider.overrideWithValue(prefs),
        dbProvider.overrideWithValue(db),
        supabaseProvider.overrideWithValue(null),
        isOnlineProvider.overrideWithValue(true),
        projectRepoProvider.overrideWithValue(repo),
        contentProvider.overrideWith(() => FakeContent(content ?? loadTestContent())),
      ],
      child: MaterialApp.router(
        routerConfig: router,
        locale: const Locale('en'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return repo;
}
