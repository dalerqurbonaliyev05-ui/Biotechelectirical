import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../state/providers.dart';
import '../../widgets/common.dart';

class LegalScreen extends ConsumerWidget {
  const LegalScreen({super.key, required this.kind});

  final String kind;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value;
    final title = kind == 'privacy' ? context.l.privacyTitle : context.l.disclaimerTitle;
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: content == null
          ? const Skeleton()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: SelectableText(
                content.legalText(kind, lang),
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.45),
              ),
            ),
    );
  }
}
