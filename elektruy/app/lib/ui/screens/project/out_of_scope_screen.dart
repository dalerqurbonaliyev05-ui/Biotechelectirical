import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/project/project_doc.dart';
import '../../../core/services/labels.dart';
import '../../../state/providers.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Shown instead of any instructions when the scope guard blocks the job.
class OutOfScopeScreen extends ConsumerStatefulWidget {
  const OutOfScopeScreen({super.key, required this.projectId});

  final String projectId;

  @override
  ConsumerState<OutOfScopeScreen> createState() => _OutOfScopeScreenState();
}

class _OutOfScopeScreenState extends ConsumerState<OutOfScopeScreen> {
  ProjectDoc? _doc;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    ref.read(projectRepoProvider).get(widget.projectId).then((d) {
      if (!mounted) return;
      setState(() {
        _doc = d;
        _loaded = true;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value;
    final scope = ((_doc?.result?['scope'] as List?) ?? const []).cast<Map>();
    final blocking = scope.where((i) => i['severity'] == 'block').toList();
    final other = scope.where((i) => i['severity'] != 'block').toList();

    return Scaffold(
      appBar: AppBar(title: Text(l.statusOutOfScope)),
      body: !_loaded || content == null
          ? const Skeleton()
          : ListView(padding: const EdgeInsets.all(20), children: [
              const Icon(Icons.engineering, size: 88, color: RiskColors.danger),
              const SizedBox(height: 12),
              Text(l.oosTitle, style: Theme.of(context).textTheme.headlineSmall, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(l.oosBody, textAlign: TextAlign.center),
              const SizedBox(height: 20),
              if (blocking.isNotEmpty) ...[
                Text(l.oosReasons, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                for (final i in blocking)
                  Card(
                    color: RiskColors.dangerBg,
                    child: ListTile(
                      leading: const Icon(Icons.dangerous, color: RiskColors.danger),
                      title: Text(issueText(l, i['code'] as String, content, lang)),
                    ),
                  ),
              ],
              for (final i in other)
                Card(
                  color: RiskColors.warnBg,
                  child: ListTile(
                    leading: const Icon(Icons.warning_amber_rounded, color: Color(0xFF8D6E00)),
                    title: Text(issueText(l, i['code'] as String, content, lang)),
                  ),
                ),
              const SizedBox(height: 20),
              SizedBox(
                height: 56,
                child: FilledButton.icon(
                  onPressed: () => context.push('/electricians'),
                  icon: const Icon(Icons.call),
                  label: Text(l.oosFindElectrician),
                ),
              ),
              const SizedBox(height: 10),
              OutlinedButton.icon(onPressed: () => context.push('/lessons'), icon: const Icon(Icons.school), label: Text(l.oosLessons)),
              const SizedBox(height: 10),
              if (_doc != null)
                TextButton.icon(
                  onPressed: () => context.pushReplacement('/project/${widget.projectId}/edit?step=3'),
                  icon: const Icon(Icons.edit),
                  label: Text(l.oosChangeAnswers),
                ),
            ]),
      bottomNavigationBar: const DisclaimerBanner(),
    );
  }
}
