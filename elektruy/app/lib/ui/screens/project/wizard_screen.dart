import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/project/project_doc.dart';
import '../../../core/project/project_planning.dart';
import '../../../state/providers.dart';
import '../../widgets/common.dart';
import 'steps/dimensions_step.dart';
import 'steps/markers_step.dart';
import 'steps/photos_step.dart';
import 'steps/questions_step.dart';

/// Holds the project being edited; every change is saved locally right away.
class WizardController extends ChangeNotifier {
  WizardController(this.doc, this._save);

  final ProjectDoc doc;
  final Future<void> Function(ProjectDoc) _save;

  Future<void> update(void Function(ProjectDoc d) change) async {
    change(doc);
    notifyListeners();
    await _save(doc);
  }
}

class WizardScreen extends ConsumerStatefulWidget {
  const WizardScreen({super.key, this.projectId, this.startStep = 0});

  final String? projectId;
  final int startStep;

  @override
  ConsumerState<WizardScreen> createState() => _WizardScreenState();
}

class _WizardScreenState extends ConsumerState<WizardScreen> {
  WizardController? _ctrl;
  late int _step = widget.startStep.clamp(0, 3);
  bool _building = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final repo = ref.read(projectRepoProvider);
    ProjectDoc? doc;
    if (widget.projectId != null) doc = await repo.get(widget.projectId!);
    doc ??= repo.create();
    if (!mounted) return;
    setState(() => _ctrl = WizardController(doc!, (d) => ref.read(projectsProvider.notifier).save(d)));
  }

  @override
  void dispose() {
    _ctrl?.dispose();
    super.dispose();
  }

  bool _canContinue(ProjectDoc d) => switch (_step) {
        0 => d.photos.isNotEmpty,
        2 => d.hasDimensions,
        _ => true,
      };

  Future<void> _build() async {
    final ctrl = _ctrl!;
    final content = ref.read(contentProvider).value;
    if (content == null) return;
    setState(() => _building = true);
    try {
      final c = computeProject(ctrl.doc, content, region: ref.read(settingsProvider).region);
      await ctrl.update((d) => storeResult(d, c));
      if (!mounted) return;
      context.pushReplacement(c.outOfScope ? '/project/${ctrl.doc.id}/oos' : '/project/${ctrl.doc.id}');
    } catch (e) {
      if (mounted) showSnack(context, context.l.errorWithDetail('$e'), error: true);
    } finally {
      if (mounted) setState(() => _building = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final ctrl = _ctrl;
    if (ctrl == null) return Scaffold(appBar: AppBar(), body: const Skeleton());
    final titles = [l.stepPhotos, l.stepMarkers, l.stepDimensions, l.stepQuestions];
    return ListenableBuilder(
      listenable: ctrl,
      builder: (context, _) {
        final doc = ctrl.doc;
        return PopScope(
          canPop: _step == 0,
          onPopInvokedWithResult: (didPop, _) {
            if (!didPop && _step > 0) setState(() => _step--);
          },
          child: Scaffold(
            appBar: AppBar(
              title: Text(doc.title.isEmpty ? l.wizardTitle : doc.title),
              actions: [
                IconButton(
                  icon: const Icon(Icons.edit_note),
                  tooltip: l.projectTitleLabel,
                  onPressed: () async {
                    final t = TextEditingController(text: doc.title);
                    final name = await showDialog<String>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: Text(l.projectTitleLabel),
                        content: TextField(controller: t, autofocus: true, maxLength: 120),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
                          FilledButton(onPressed: () => Navigator.pop(ctx, t.text.trim()), child: Text(l.save)),
                        ],
                      ),
                    );
                    if (name != null) await ctrl.update((d) => d.title = name);
                  },
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(44),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${l.stepOf(_step + 1, 4)} · ${titles[_step]}', style: Theme.of(context).textTheme.labelLarge),
                    const SizedBox(height: 6),
                    LinearProgressIndicator(value: (_step + 1) / 4, minHeight: 6, borderRadius: BorderRadius.circular(3)),
                  ]),
                ),
              ),
            ),
            body: Column(children: [
              const OfflineBanner(),
              Expanded(
                child: switch (_step) {
                  0 => PhotosStep(ctrl: ctrl),
                  1 => MarkersStep(ctrl: ctrl),
                  2 => DimensionsStep(ctrl: ctrl),
                  _ => QuestionsStep(ctrl: ctrl),
                },
              ),
            ]),
            bottomNavigationBar: BottomAction(
              child: Row(children: [
                if (_step > 0)
                  Expanded(
                    child: OutlinedButton(onPressed: () => setState(() => _step--), child: Text(l.back)),
                  ),
                if (_step > 0) const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: !_canContinue(doc) || _building
                        ? null
                        : () => _step < 3 ? setState(() => _step++) : _build(),
                    child: _building
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))
                        : Text(_step < 3 ? l.next : l.buildPlan),
                  ),
                ),
              ]),
            ),
          ),
        );
      },
    );
  }
}
