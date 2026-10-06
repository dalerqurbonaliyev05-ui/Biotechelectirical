// ignore_for_file: invalid_use_of_visible_for_testing_member
// Renders real app screens to PNG for the website (not part of the CI test suite).
// Run: flutter test tool/screenshots/screens_test.dart --update-goldens
// Output: tool/screenshots/out/*.png
import 'dart:io';

import 'package:elektruy/core/calc/calc.dart';
import 'package:elektruy/core/project/project_doc.dart';
import 'package:elektruy/core/project/project_planning.dart';
import 'package:elektruy/l10n/gen/app_localizations.dart';
import 'package:elektruy/state/providers.dart';
import 'package:elektruy/ui/screens/home_screen.dart';
import 'package:elektruy/ui/screens/lessons/lessons_screen.dart';
import 'package:elektruy/ui/screens/materials_calc_screen.dart';
import 'package:elektruy/ui/screens/project/out_of_scope_screen.dart';
import 'package:elektruy/ui/screens/project/result_screen.dart';
import 'package:elektruy/ui/screens/project/wizard_screen.dart';
import 'package:elektruy/ui/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../test/widget/test_app.dart';

Future<void> _font(String family, List<String> files) async {
  final loader = FontLoader(family);
  for (final f in files) {
    loader.addFont(Future.value(ByteData.sublistView(File(f).readAsBytesSync())));
  }
  await loader.load();
}

ProjectDoc _demo(dynamic content) {
  final doc = ProjectDoc(id: 'demo', title: 'Yotoqxona', length: 4.2, width: 3.4, height: 2.7, status: ProjectStatus.planned);
  doc.extraDevices.addAll([
    Device(id: 'in', type: DeviceType.input, wall: Wall.a, u: 0.5, z: 2.4),
    Device(id: 'k1', type: DeviceType.switchSingle, wall: Wall.a, u: 3.6, z: 0.9),
    Device(id: 'h1', type: DeviceType.lamp, cx: 2.1, cy: 1.7),
    Device(id: 's1', type: DeviceType.socket, wall: Wall.b, u: 1.0, z: 0.3),
    Device(id: 's2', type: DeviceType.socket, wall: Wall.c, u: 1.2, z: 0.3),
    Device(id: 's3', type: DeviceType.socket, wall: Wall.c, u: 3.0, z: 0.3),
    Device(id: 's4', type: DeviceType.socket, wall: Wall.d, u: 1.7, z: 0.3),
  ]);
  storeResult(doc, computeProject(doc, content, region: 'tashkent_city'));
  return doc;
}

void main() {
  const flutterRoot = '/opt/flutter';
  final out = Directory('tool/screenshots/out')..createSync(recursive: true);

  setUpAll(() async {
    final m = '$flutterRoot/bin/cache/artifacts/material_fonts';
    await _font('Roboto', ['$m/Roboto-Regular.ttf', '$m/Roboto-Medium.ttf', '$m/Roboto-Bold.ttf']);
    await _font('MaterialIcons', ['$m/MaterialIcons-Regular.otf']);
    // Unstyled text (CustomPainter labels) uses the test default family; give it real glyphs.
    await _font('FlutterTest', ['$m/Roboto-Regular.ttf', '$m/Roboto-Bold.ttf']);
    await _font('Ahem', ['$m/Roboto-Regular.ttf', '$m/Roboto-Bold.ttf']);
  });

  Future<void> shoot(WidgetTester tester, String name, String initial, Map<String, WidgetBuilder> routes, {bool dark = false}) async {
    tester.view.physicalSize = const Size(1080, 2280);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    SharedPreferences.setMockInitialValues({
      'locale': 'uz',
      'language_chosen': true,
      'onboarding_done': true,
      'voice_guide': false,
      'consent_disclaimer_v': 9,
      'consent_privacy_v': 9,
    });
    final prefs = await SharedPreferences.getInstance();
    final db = unopenedDb();
    final repo = FakeProjectRepository(db);
    final content = loadTestContent();
    repo.docs['demo'] = _demo(content);
    final router = GoRouter(initialLocation: initial, routes: [
      for (final e in routes.entries) GoRoute(path: e.key, builder: (c, _) => e.value(c)),
    ]);
    await tester.pumpWidget(ProviderScope(
      overrides: [
        prefsProvider.overrideWithValue(prefs),
        dbProvider.overrideWithValue(db),
        supabaseProvider.overrideWithValue(null),
        isOnlineProvider.overrideWithValue(true),
        projectRepoProvider.overrideWithValue(repo),
        contentProvider.overrideWith(() => FakeContent(content)),
      ],
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        routerConfig: router,
        theme: AppTheme.light(),
        darkTheme: AppTheme.dark(),
        themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        locale: const Locale('uz'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
      ),
    ));
    await tester.pumpAndSettle();
    await expectLater(find.byType(MaterialApp), matchesGoldenFile('out/$name.png'));
  }

  testWidgets('home', (t) => shoot(t, 'home', '/', {'/': (_) => const HomeScreen()}));
  testWidgets('plan', (t) => shoot(t, 'plan', '/', {'/': (_) => const ResultScreen(projectId: 'demo')}));
  testWidgets('questions', (t) => shoot(t, 'questions', '/', {'/': (_) => const WizardScreen(projectId: 'demo', startStep: 3)}));
  testWidgets('lessons', (t) => shoot(t, 'lessons', '/', {'/': (_) => const LessonsScreen()}));
  testWidgets('materials', (t) => shoot(t, 'materials', '/', {'/': (_) => const MaterialsCalcScreen()}));
  testWidgets('oos', (t) => shoot(t, 'oos', '/', {'/': (_) => const OutOfScopeScreen(projectId: 'demo')}, dark: true));
  test('output dir', () => expect(out.existsSync(), isTrue));
}
