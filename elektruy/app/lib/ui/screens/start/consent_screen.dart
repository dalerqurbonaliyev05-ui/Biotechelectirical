import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../state/providers.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Shown when an admin publishes a new disclaimer/privacy version: the app is
/// blocked until the user accepts it again.
class ConsentScreen extends StatelessWidget {
  const ConsentScreen({super.key});

  @override
  Widget build(BuildContext context) => const ConsentBody(firstTime: false);
}

class ConsentBody extends ConsumerStatefulWidget {
  const ConsentBody({super.key, required this.firstTime});

  final bool firstTime;

  @override
  ConsumerState<ConsentBody> createState() => _ConsentBodyState();
}

class _ConsentBodyState extends ConsumerState<ConsentBody> {
  bool _disclaimer = false;
  bool _privacy = false;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value;
    final text = content?.legalText('disclaimer', lang) ?? '';
    return Scaffold(
      appBar: AppBar(title: Text(widget.firstTime ? l.disclaimerTitle : l.reconsentTitle), automaticallyImplyLeading: false),
      body: Column(children: [
        if (!widget.firstTime)
          Container(
            width: double.infinity,
            color: RiskColors.warnBg,
            padding: const EdgeInsets.all(12),
            child: Text(l.reconsentBody),
          ),
        Expanded(
          child: content == null
              ? const Skeleton()
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Text(text, style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.45)),
                ),
        ),
        const Divider(height: 1),
        CheckboxListTile(
          value: _disclaimer,
          onChanged: (v) => setState(() => _disclaimer = v ?? false),
          title: Text(l.acceptDisclaimer),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        CheckboxListTile(
          value: _privacy,
          onChanged: (v) => setState(() => _privacy = v ?? false),
          title: Text(l.acceptPrivacy),
          secondary: TextButton(onPressed: () => context.push('/legal/privacy'), child: Text(l.privacyTitle)),
          controlAffinity: ListTileControlAffinity.leading,
        ),
        BottomAction(
          child: FilledButton(
            onPressed: !(_disclaimer && _privacy) || content == null
                ? null
                : () => ref.read(settingsProvider.notifier).acceptLegal(
                      disclaimerVersion: content.legalVersion('disclaimer'),
                      privacyVersion: content.legalVersion('privacy'),
                    ),
            child: Text(l.continueLabel),
          ),
        ),
      ]),
    );
  }
}
