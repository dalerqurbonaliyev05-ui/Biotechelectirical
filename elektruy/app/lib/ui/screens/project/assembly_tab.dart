import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/calc/calc.dart';
import '../../../core/content/content_models.dart';
import '../../../core/project/project_doc.dart';
import '../../../core/project/project_planning.dart';
import '../../../core/services/labels.dart';
import '../../../core/services/voice_service.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../state/providers.dart';
import '../../painters/diagram_painter.dart';
import '../../painters/plan_painter.dart';
import '../../widgets/common.dart';
import '../../widgets/safety_gate.dart';
import '../../widgets/viewer3d.dart';

/// Localized title and text of one installation step.
({String title, String body}) assemblyText(AppLocalizations l, AssemblyStep s, Plan plan, ContentBundle content, String lang) {
  final p = s.params;
  String n(Object? v) => v is num ? (v % 1 == 0 ? v.toInt().toString() : v.toStringAsFixed(1)) : '$v';
  final pe = p['pe'] != false;
  return switch (s.stage) {
    AssemblyStage.safety => (title: l.asmSafetyTitle, body: l.asmSafetyBody),
    AssemblyStage.mark => (title: l.asmMarkTitle, body: l.asmMarkBody(p['socket_cm'] as int? ?? 30, p['switch_cm'] as int? ?? 100)),
    AssemblyStage.chase => (title: l.asmChaseTitle, body: l.asmChaseBody(n(p['length_m']))),
    AssemblyStage.channel => (title: l.asmChannelTitle, body: l.asmChannelBody(n(p['length_m']))),
    AssemblyStage.boxes => (
        title: l.asmBoxesTitle,
        body: [
          p['hidden'] == false ? l.asmBoxesBodyOpen(p['count'] as int? ?? 0) : l.asmBoxesBody(p['count'] as int? ?? 0),
          if (s.deviceIds.any((id) => plan.device(id)?.type == DeviceType.junctionBox)) l.asmBoxesJunction,
        ].join(' '),
      ),
    AssemblyStage.cable => (
        title: l.asmCableTitle(_circuitName(l, s, plan, content, lang)),
        body: l.asmCableBody(cableName(p['cable'] as String? ?? '', content, lang), n(p['length_m']), p['count'] as int? ?? 1),
      ),
    AssemblyStage.junction => (title: l.asmJunctionTitle, body: [l.asmJunctionBody, if (pe) l.asmPeJoin].join(' ')),
    AssemblyStage.socket => (title: l.asmSocketTitle(p['count'] as int? ?? 1), body: [l.asmSocketBody, if (pe) l.asmPeSocket].join(' ')),
    AssemblyStage.switchSingle => (title: l.asmSwitchSingleTitle, body: l.asmSwitchSingleBody),
    AssemblyStage.switchDouble => (title: l.asmSwitchDoubleTitle, body: l.asmSwitchDoubleBody),
    AssemblyStage.switchPass => (title: l.asmSwitchPassTitle, body: l.asmSwitchPassBody),
    AssemblyStage.lamp => (title: l.asmLampTitle(p['count'] as int? ?? 1), body: [l.asmLampBody, if (pe) l.asmPeEarth].join(' ')),
    AssemblyStage.finish => (
        title: l.asmFinishTitle,
        body: [p['hidden'] == false ? l.asmFinishOpen : l.asmFinishHidden, l.asmFinishBody, if (p['panel'] == true) l.panelWorkNote].join(' '),
      ),
  };
}

String _circuitName(AppLocalizations l, AssemblyStep s, Plan plan, ContentBundle content, String lang) {
  final c = plan.circuits.where((c) => c.id == s.circuitId).firstOrNull;
  return c == null ? '' : circuitLabel(l, c, content, lang);
}

/// Diagrams that explain a step's connections (empty when none apply).
List<DiagramModel> diagramsForStep(AssemblyStep s, List<DiagramModel> all) {
  const switches = {DiagramKind.switchSingle, DiagramKind.switchDouble, DiagramKind.switchPass};
  return switch (s.stage) {
    AssemblyStage.cable => all.where((d) => d.circuitId == s.circuitId).toList(),
    AssemblyStage.junction || AssemblyStage.lamp => all.where((d) => switches.contains(d.kind)).toList(),
    AssemblyStage.socket => all.where((d) => d.kind == DiagramKind.sockets || d.kind == DiagramKind.dedicated).toList(),
    AssemblyStage.switchSingle => all.where((d) => d.kind == DiagramKind.switchSingle).toList(),
    AssemblyStage.switchDouble => all.where((d) => d.kind == DiagramKind.switchDouble).toList(),
    AssemblyStage.switchPass => all.where((d) => d.kind == DiagramKind.switchPass).toList(),
    _ => const [],
  };
}

/// Step-by-step installation guide: a 3D view that builds the room up step by
/// step and zooms into each connection, with a short text card, voice and links
/// to the diagram and the full lesson.
class AssemblyTab extends ConsumerStatefulWidget {
  const AssemblyTab({super.key, required this.doc, required this.calc, required this.onChanged});

  final ProjectDoc doc;
  final ProjectComputation calc;
  final Future<void> Function() onChanged;

  @override
  ConsumerState<AssemblyTab> createState() => _AssemblyTabState();
}

class _AssemblyTabState extends ConsumerState<AssemblyTab> {
  final _viewer = GlobalKey<Viewer3DState>();
  late List<AssemblyStep> _steps;
  int _i = 0;
  bool _voiceOn = false;
  StreamSubscription<VoiceCommand>? _cmdSub;

  VoiceService get _voice => ref.read(voiceServiceProvider);
  String get _stepKey => 'asm_step_${widget.doc.id}';

  @override
  void initState() {
    super.initState();
    _steps = _build();
    final saved = ref.read(prefsProvider).getInt(_stepKey) ?? 0;
    _i = saved.clamp(0, _steps.length - 1);
  }

  List<AssemblyStep> _build() {
    final h = ref.read(contentProvider).value?.calc.heights;
    final steps = const AssemblyBuilder().build(widget.calc.plan, widget.doc.answers, socketM: h?.socketM ?? 0.3, switchM: h?.switchM ?? 1.0);
    // The boxes text depends on the wiring type.
    return [
      for (final s in steps)
        s.stage == AssemblyStage.boxes
            ? AssemblyStep(id: s.id, stage: s.stage, deviceIds: s.deviceIds, params: {...s.params, 'hidden': widget.doc.answers.hidden})
            : s,
    ];
  }

  @override
  void didUpdateWidget(covariant AssemblyTab old) {
    super.didUpdateWidget(old);
    if (old.calc != widget.calc) {
      _steps = _build();
      _i = _i.clamp(0, _steps.length - 1);
    }
  }

  @override
  void dispose() {
    _cmdSub?.cancel();
    if (_voiceOn) {
      unawaited(_voice.stopHandsFree());
      unawaited(_voice.stopSpeaking());
    }
    super.dispose();
  }

  Future<void> _go(int i) async {
    if (i < 0 || i >= _steps.length) return;
    // Leaving the "power off" step means the user is about to start real work.
    if (_i == 0 && i > 0) {
      final ok = await showSafetyGate(context, ref, logContext: {'project_id': widget.doc.id, 'step': 'assembly'});
      if (!ok || !mounted) return;
      if (widget.doc.status != ProjectStatus.inProgress && widget.doc.status != ProjectStatus.done) {
        widget.doc.status = ProjectStatus.inProgress;
        await ref.read(projectsProvider.notifier).save(widget.doc);
      }
    }
    if (!mounted) return;
    setState(() => _i = i);
    unawaited(ref.read(prefsProvider).setInt(_stepKey, i));
    _speak();
  }

  Future<void> _toggleVoice() async {
    if (_voiceOn) {
      await _cmdSub?.cancel();
      _cmdSub = null;
      await _voice.stopHandsFree();
      await _voice.stopSpeaking();
      if (mounted) setState(() => _voiceOn = false);
      return;
    }
    final hasVoice = await _voice.setLanguage(ref.read(langProvider));
    _cmdSub ??= _voice.commands.listen((c) => switch (c) {
          VoiceCommand.next => _go(_i + 1),
          VoiceCommand.back => _go(_i - 1),
          VoiceCommand.repeat => _speak(),
        });
    final commands = await _voice.startHandsFree();
    if (!mounted) return;
    setState(() => _voiceOn = true);
    if (!commands) {
      showSnack(context, context.l.voiceUnavailable);
    } else if (!hasVoice) {
      showSnack(context, context.l.voiceNoLanguage);
    }
    _speak();
  }

  void _speak() {
    if (!_voiceOn || !mounted) return;
    final content = ref.read(contentProvider).value;
    if (content == null) return;
    final t = assemblyText(context.l, _steps[_i], widget.calc.plan, content, ref.read(langProvider));
    unawaited(_voice.speak('${t.title}. ${t.body}'));
  }

  void _showDiagrams(List<DiagramModel> list) {
    final colors = ref.read(contentProvider).value?.wireColors ?? const {};
    final dark = Theme.of(context).brightness == Brightness.dark;
    final l = context.l;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        builder: (ctx, scroll) => ListView(controller: scroll, padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: [
          _WireLegend(colors: colors, pass: list.any((d) => d.kind == DiagramKind.switchPass)),
          for (final d in list) ...[
            const SizedBox(height: 14),
            Text('${diagramTitle(l, d.kind)} · ${l.breakerA(d.breakerA)} · ${d.mm2} mm²', style: Theme.of(ctx).textTheme.titleSmall),
            const SizedBox(height: 6),
            Card(
              clipBehavior: Clip.antiAlias,
              child: InteractiveViewer(
                maxScale: 4,
                child: AspectRatio(aspectRatio: d.width / d.height, child: CustomPaint(painter: DiagramPainter(d, colors: colors, dark: dark))),
              ),
            ),
          ],
        ]),
      ),
    );
  }

  Future<void> _markDone() async {
    widget.doc.status = ProjectStatus.done;
    await ref.read(projectsProvider.notifier).save(widget.doc);
    await widget.onChanged();
    if (mounted) showSnack(context, context.l.asmProjectDone);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value!;
    final scheme = Theme.of(context).colorScheme;
    final plan = widget.calc.plan;
    final step = _steps[_i];
    final text = assemblyText(l, step, plan, content, lang);
    final diagrams = diagramsForStep(step, widget.calc.diagrams);
    final lesson = step.lessonSlug == null ? null : content.lessonBySlug(step.lessonSlug!);
    final last = _i == _steps.length - 1;
    final scene = {
      ...plan.toJson(),
      'steps': _steps.map((s) => s.toJson()).toList(),
      'wiring': widget.doc.answers.hidden ? 'hidden' : 'open',
      'pe': widget.doc.answers.hasPe,
      'colors': content.wireColors,
      'labels': {'sign': l.asmSign},
      'dark': Theme.of(context).brightness == Brightness.dark,
    };
    final connection = step.detail != null;

    return Column(children: [
      Expanded(
        child: Stack(children: [
          Positioned.fill(child: Viewer3D(key: _viewer, sceneJson: scene, step: _i)),
          Positioned(
            right: 12,
            top: 12,
            child: Column(children: [
              _RoundButton(icon: Icons.replay, tooltip: l.asmReplay, onTap: () => _viewer.currentState?.replay()),
              const SizedBox(height: 8),
              _RoundButton(icon: Icons.center_focus_strong, tooltip: l.arReset, onTap: () => _viewer.currentState?.resetView()),
            ]),
          ),
        ]),
      ),
      Material(
        color: scheme.surface,
        elevation: 8,
        shadowColor: Colors.black26,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: scheme.primaryContainer, borderRadius: BorderRadius.circular(20)),
                  child: Text('${_i + 1} / ${_steps.length}', style: TextStyle(color: scheme.onPrimaryContainer, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: (_i + 1) / _steps.length, minHeight: 6),
                  ),
                ),
                IconButton(
                  tooltip: l.voiceGuide,
                  onPressed: _toggleVoice,
                  icon: Icon(_voiceOn ? Icons.volume_up : Icons.volume_off_outlined, color: _voiceOn ? scheme.primary : null),
                ),
              ]),
              Text(text.title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800, fontSize: 20)),
              const SizedBox(height: 4),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 104),
                child: SingleChildScrollView(child: Text(text.body, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontSize: 15, height: 1.35))),
              ),
              if (step.stage == AssemblyStage.cable) ...[
                const SizedBox(height: 8),
                Wrap(spacing: 8, runSpacing: 6, children: [
                  _InfoChip(icon: Icons.power_settings_new, text: l.breakerA(step.params['breaker_a'] as int? ?? 0)),
                  _InfoChip(icon: Icons.straighten, text: '${step.params['length_m']} ${l.unitM}'),
                  if (step.params['panel'] == true) RiskChip(risk: Risk.danger, label: l.panelWorkNote),
                ]),
              ],
              if (connection) ...[
                const SizedBox(height: 8),
                _WireLegend(colors: content.wireColors, pass: step.stage == AssemblyStage.switchPass, compact: true),
              ],
              if (diagrams.isNotEmpty || lesson != null)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Row(children: [
                    if (diagrams.isNotEmpty)
                      Expanded(child: _LinkButton(icon: Icons.schema_outlined, text: l.asmDiagram, onTap: () => _showDiagrams(diagrams))),
                    if (diagrams.isNotEmpty && lesson != null) const SizedBox(width: 8),
                    if (lesson != null)
                      Expanded(child: _LinkButton(icon: Icons.menu_book_outlined, text: l.asmLesson, onTap: () => context.push('/lessons/${lesson.slug}'))),
                  ]),
                ),
              const SizedBox(height: 10),
              Row(children: [
                if (_i > 0) ...[
                  OutlinedButton(
                    onPressed: () => _go(_i - 1),
                    style: OutlinedButton.styleFrom(minimumSize: const Size(56, 56), padding: EdgeInsets.zero),
                    child: Icon(Icons.arrow_back, semanticLabel: l.back),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: last
                      ? (widget.doc.status == ProjectStatus.done
                          ? OutlinedButton.icon(onPressed: () => context.push('/check?project=${widget.doc.id}'), icon: const Icon(Icons.fact_check), label: Text(l.checkWork))
                          : FilledButton.icon(onPressed: _markDone, icon: const Icon(Icons.done_all), label: Text(l.asmDone)))
                      : FilledButton.icon(
                          onPressed: () => _go(_i + 1),
                          icon: const Icon(Icons.arrow_forward),
                          label: Text(l.next),
                          iconAlignment: IconAlignment.end,
                        ),
                ),
              ]),
            ]),
          ),
        ),
      ),
    ]);
  }
}

class _LinkButton extends StatelessWidget {
  const _LinkButton({required this.icon, required this.text, required this.onTap});

  final IconData icon;
  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.primaryContainer.withValues(alpha: 0.5),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 20, color: scheme.primary),
            const SizedBox(width: 6),
            Flexible(
              child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: scheme.primary, fontWeight: FontWeight.w700)),
            ),
          ]),
        ),
      ),
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({required this.icon, required this.tooltip, required this.onTap});

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surface.withValues(alpha: 0.95),
      shape: CircleBorder(side: BorderSide(color: scheme.outlineVariant)),
      child: IconButton(tooltip: tooltip, onPressed: onTap, icon: Icon(icon, color: scheme.primary)),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: scheme.secondaryContainer, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: scheme.onSecondaryContainer),
        const SizedBox(width: 6),
        Text(text, style: TextStyle(color: scheme.onSecondaryContainer, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}

/// Wire colour legend: L brown, N blue, PE yellow-green (+ travellers for pass-through).
class _WireLegend extends StatelessWidget {
  const _WireLegend({required this.colors, this.pass = false, this.compact = false});

  final Map<String, String> colors;
  final bool pass;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    Widget dot(Color c, String t) => Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 14, height: 14, decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(t, style: TextStyle(fontSize: compact ? 13 : 14)),
        ]);
    return Wrap(spacing: 14, runSpacing: 6, children: [
      dot(hexColor(colors['phase'], const Color(0xFF8B4513)), l.legendPhase),
      dot(hexColor(colors['neutral'], const Color(0xFF1E63D6)), l.legendNeutral),
      dot(hexColor(colors['pe'], const Color(0xFF9ACD32)), l.legendPe),
      if (pass) dot(hexColor(colors['traveller'], const Color(0xFF111111)), l.legendTraveller),
    ]);
  }
}
