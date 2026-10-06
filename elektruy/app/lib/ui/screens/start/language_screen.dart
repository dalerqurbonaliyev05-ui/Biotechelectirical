import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../state/providers.dart';
import '../../widgets/common.dart';

/// First launch: splash + language choice (pre-selected from the device language).
class LanguageScreen extends ConsumerWidget {
  const LanguageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(settingsProvider).locale;
    final t = Theme.of(context);
    Widget option(String code, String label, String flag) {
      final child = Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(flag, style: const TextStyle(fontSize: 22)),
        const SizedBox(width: 12),
        Text(label, style: const TextStyle(fontSize: 18)),
      ]);
      void pick() => ref.read(settingsProvider.notifier).setLocale(code);
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: SizedBox(
          width: double.infinity,
          child: code == current ? FilledButton(onPressed: pick, child: child) : OutlinedButton(onPressed: pick, child: child),
        ),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const Spacer(),
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(color: t.colorScheme.primary, borderRadius: BorderRadius.circular(28)),
              child: const Icon(Icons.electrical_services, color: Colors.white, size: 56),
            ),
            const SizedBox(height: 16),
            Text('ElektrUy', style: t.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
            const Spacer(),
            Text(context.l.chooseLanguage, style: t.textTheme.titleLarge),
            const SizedBox(height: 16),
            option('uz', context.l.languageUz, '🇺🇿'),
            option('ru', context.l.languageRu, '🇷🇺'),
            option('en', context.l.languageEn, '🇬🇧'),
            const SizedBox(height: 24),
          ]),
        ),
      ),
    );
  }
}
