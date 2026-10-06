import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../state/providers.dart';
import 'screens/check_work_screen.dart';
import 'screens/electricians/electrician_apply_screen.dart';
import 'screens/electricians/electrician_detail_screen.dart';
import 'screens/electricians/electricians_screen.dart';
import 'screens/home_screen.dart';
import 'screens/lessons/lesson_player_screen.dart';
import 'screens/lessons/lessons_screen.dart';
import 'screens/materials_calc_screen.dart';
import 'screens/project/out_of_scope_screen.dart';
import 'screens/project/result_screen.dart';
import 'screens/project/wizard_screen.dart';
import 'screens/settings/downloads_screen.dart';
import 'screens/settings/legal_screen.dart';
import 'screens/settings/settings_screen.dart';
import 'screens/start/consent_screen.dart';
import 'screens/start/language_screen.dart';
import 'screens/start/onboarding_screen.dart';
import 'screens/start/sign_in_screen.dart';

/// Bridges Riverpod state changes to go_router's refreshListenable.
class _RouterRefresh extends ChangeNotifier {
  void ping() => notifyListeners();
}

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefresh();
  ref.listen(settingsProvider, (_, _) => refresh.ping());
  ref.listen(sessionProvider, (_, _) => refresh.ping());
  ref.listen(pendingConsentProvider, (_, _) => refresh.ping());
  ref.onDispose(refresh.dispose);

  const open = {'/language', '/onboarding', '/consent', '/signin', '/legal'};

  return GoRouter(
    initialLocation: '/',
    refreshListenable: refresh,
    redirect: (context, state) {
      final s = ref.read(settingsProvider);
      final loc = state.matchedLocation;
      final signedIn = ref.read(currentUserProvider) != null;
      if (!s.languageChosen) return loc == '/language' ? null : '/language';
      if (!s.onboardingDone) return (loc == '/onboarding' || loc.startsWith('/legal')) ? null : '/onboarding';
      if (ref.read(pendingConsentProvider)) return (loc == '/consent' || loc.startsWith('/legal')) ? null : '/consent';
      if (!signedIn && !s.offlineMode) return (loc == '/signin' || loc.startsWith('/legal')) ? null : '/signin';
      if (loc == '/' || open.contains(loc)) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, _) => const SizedBox.shrink()),
      GoRoute(path: '/language', builder: (_, _) => const LanguageScreen()),
      GoRoute(path: '/onboarding', builder: (_, _) => const OnboardingScreen()),
      GoRoute(path: '/consent', builder: (_, _) => const ConsentScreen()),
      GoRoute(path: '/signin', builder: (_, _) => const SignInScreen()),
      GoRoute(path: '/legal/:kind', builder: (_, st) => LegalScreen(kind: st.pathParameters['kind']!)),
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
      GoRoute(path: '/project/new', builder: (_, _) => const WizardScreen()),
      GoRoute(
        path: '/project/:id/edit',
        builder: (_, st) => WizardScreen(projectId: st.pathParameters['id'], startStep: int.tryParse(st.uri.queryParameters['step'] ?? '') ?? 0),
      ),
      GoRoute(path: '/project/:id', builder: (_, st) => ResultScreen(projectId: st.pathParameters['id']!)),
      GoRoute(path: '/project/:id/oos', builder: (_, st) => OutOfScopeScreen(projectId: st.pathParameters['id']!)),
      GoRoute(path: '/lessons', builder: (_, _) => const LessonsScreen()),
      GoRoute(path: '/lessons/:slug', builder: (_, st) => LessonPlayerScreen(slug: st.pathParameters['slug']!)),
      GoRoute(path: '/materials', builder: (_, _) => const MaterialsCalcScreen()),
      GoRoute(path: '/electricians', builder: (_, _) => const ElectriciansScreen()),
      GoRoute(path: '/electricians/apply', builder: (_, _) => const ElectricianApplyScreen()),
      GoRoute(path: '/electricians/:id', builder: (_, st) => ElectricianDetailScreen(id: st.pathParameters['id']!)),
      GoRoute(path: '/check', builder: (_, st) => CheckWorkScreen(projectId: st.uri.queryParameters['project'])),
      GoRoute(path: '/settings', builder: (_, _) => const SettingsScreen()),
      GoRoute(path: '/settings/downloads', builder: (_, _) => const DownloadsScreen()),
    ],
  );
});
