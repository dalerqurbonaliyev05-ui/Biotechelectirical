import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/providers.dart';
import '../theme.dart';
import 'common.dart';

/// Mandatory checklist before every lesson or project execution. The user cannot
/// continue until every item is ticked; acceptance is logged (ew_consents, type
/// safety_gate) with the context, even when offline.
Future<bool> showSafetyGate(BuildContext context, WidgetRef ref, {required Map<String, dynamic> logContext}) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    isDismissible: true,
    useSafeArea: true,
    builder: (_) => const _SafetyGateSheet(),
  );
  if (ok == true) {
    await ref.read(syncProvider).logSafetyGate({...logContext, 'lang': ref.read(langProvider)});
    return true;
  }
  return false;
}

class _SafetyGateSheet extends ConsumerStatefulWidget {
  const _SafetyGateSheet();

  @override
  ConsumerState<_SafetyGateSheet> createState() => _SafetyGateSheetState();
}

class _SafetyGateSheetState extends ConsumerState<_SafetyGateSheet> {
  final _ticked = <String>{};

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(langProvider);
    final items = ref.watch(contentProvider).value?.safetyChecklist ?? const [];
    final all = items.isNotEmpty && _ticked.length == items.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.health_and_safety, color: RiskColors.danger, size: 32),
          const SizedBox(width: 10),
          Expanded(child: Text(context.l.gateTitle, style: Theme.of(context).textTheme.headlineSmall)),
        ]),
        const SizedBox(height: 8),
        Text(context.l.gateBody),
        const SizedBox(height: 12),
        for (final item in items)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            color: _ticked.contains(item.key) ? RiskColors.okBg : null,
            child: CheckboxListTile(
              value: _ticked.contains(item.key),
              onChanged: (v) => setState(() => v == true ? _ticked.add(item.key) : _ticked.remove(item.key)),
              title: Text(item.text(lang), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            ),
          ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: all ? () => Navigator.pop(context, true) : null,
            icon: const Icon(Icons.check),
            label: Text(context.l.gateContinue),
          ),
        ),
      ]),
    );
  }
}

/// Free-text report to admins (wrong lesson, content, AI result, electrician).
Future<void> showReportDialog(BuildContext context, WidgetRef ref, {required String type, required String target}) async {
  final ctrl = TextEditingController();
  final send = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(ctx.l.reportTitle),
      content: TextField(
        controller: ctrl,
        maxLines: 5,
        maxLength: 2000,
        decoration: InputDecoration(hintText: ctx.l.reportText),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(ctx.l.cancel)),
        FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim().isNotEmpty), child: Text(ctx.l.reportSend)),
      ],
    ),
  );
  if (send == true) {
    await ref.read(syncProvider).queueReport(type: type, target: target, text: ctrl.text.trim());
    if (context.mounted) showSnack(context, context.l.reportSent);
  }
}
