import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:printing/printing.dart';

import '../../../core/calc/calc.dart';
import '../../../core/project/project_doc.dart';
import '../../../core/project/project_planning.dart';
import '../../../core/services/labels.dart';
import '../../../state/providers.dart';
import '../../painters/diagram_painter.dart';
import '../../painters/plan_painter.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/safety_gate.dart';
import '../../widgets/viewer3d.dart';

/// Lesson slugs in the recommended order of work for a project.
List<String> recommendedLessons(Plan plan, Answers a) => [
      'safety-basics',
      'voltage-tester',
      if (a.hidden) 'cable-routing',
      if (plan.devices.any((d) => d.type == DeviceType.junctionBox)) 'junction-box',
      if (plan.devices.any((d) => d.type == DeviceType.socket)) 'install-socket',
      if (plan.devices.any((d) => d.type == DeviceType.switchSingle)) 'switch-single',
      if (plan.devices.any((d) => d.type == DeviceType.switchDouble)) 'switch-double',
      if (plan.devices.any((d) => d.type == DeviceType.switchPass)) 'switch-pass-through',
      if (plan.devices.any((d) => d.type == DeviceType.lamp)) 'lamp-install',
    ];

class ResultScreen extends ConsumerStatefulWidget {
  const ResultScreen({super.key, required this.projectId});

  final String projectId;

  @override
  ConsumerState<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<ResultScreen> {
  ProjectDoc? _doc;
  ProjectComputation? _calc;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final doc = await ref.read(projectRepoProvider).get(widget.projectId);
    final content = await ref.read(contentProvider.future);
    if (!mounted) return;
    if (doc == null || doc.room == null) {
      setState(() => _error = context.l.errorGeneric);
      return;
    }
    setState(() {
      _doc = doc;
      _calc = computeProject(doc, content, region: ref.read(settingsProvider).region);
    });
  }

  Future<void> _recompute() async {
    final doc = _doc!;
    final content = ref.read(contentProvider).value!;
    final c = computeProject(doc, content, region: ref.read(settingsProvider).region);
    storeResult(doc, c);
    await ref.read(projectsProvider.notifier).save(doc);
    if (mounted) setState(() => _calc = c);
  }

  Future<void> _exportPdf() async {
    final doc = _doc!, c = _calc!;
    final content = ref.read(contentProvider).value!;
    final s = ref.read(settingsProvider);
    final rate = content.usdRate();
    final bytes = await ref.read(pdfServiceProvider).build(
          l: context.l,
          lang: s.locale,
          title: doc.title.isEmpty ? context.l.projectUntitled : doc.title,
          plan: c.plan,
          materials: c.materials,
          diagrams: c.diagrams,
          content: content,
          currency: s.currency == 'USD' ? 'USD' : context.l.currencyUZS,
          convert: (v) => s.currency == 'USD' ? v / rate : v,
        );
    await Printing.sharePdf(bytes: bytes, filename: 'elektruy-${doc.id.substring(0, 8)}.pdf');
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    if (_error != null) return Scaffold(appBar: AppBar(), body: ErrorView(message: _error!, onRetry: _load));
    final doc = _doc, c = _calc;
    if (doc == null || c == null) return Scaffold(appBar: AppBar(title: Text(l.resultTitle)), body: const Skeleton());
    final tabs = [l.tabPlan, l.tab3d, l.tabRoute, l.tabDiagram, l.tabMaterials, l.tabSteps];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: Text(doc.title.isEmpty ? l.resultTitle : doc.title),
          actions: [
            IconButton(onPressed: _exportPdf, icon: const Icon(Icons.picture_as_pdf), tooltip: l.exportPdf),
            PopupMenuButton<String>(
              onSelected: (v) async {
                switch (v) {
                  case 'edit':
                    await context.push('/project/${doc.id}/edit?step=1');
                    await _load();
                  case 'check':
                    context.push('/check?project=${doc.id}');
                  case 'report':
                    await showReportDialog(context, ref, type: 'content', target: 'project:${doc.id}');
                }
              },
              itemBuilder: (_) => [
                PopupMenuItem(value: 'edit', child: Text(l.editProject)),
                PopupMenuItem(value: 'check', child: Text(l.checkWork)),
                PopupMenuItem(value: 'report', child: Text(l.reportMistake)),
              ],
            ),
          ],
          bottom: TabBar(isScrollable: true, tabAlignment: TabAlignment.start, tabs: [for (final t in tabs) Tab(text: t)]),
        ),
        body: Column(children: [
          const DisclaimerBanner(),
          _WarningsPanel(calc: c),
          Expanded(
            child: TabBarView(physics: const NeverScrollableScrollPhysics(), children: [
              _PlanTab(doc: doc, calc: c, onMoved: _recompute),
              _Viewer3DTab(calc: c),
              _RouteTab(calc: c),
              _DiagramTab(calc: c),
              _MaterialsTab(doc: doc, calc: c, onChanged: _recompute),
              _StepsTab(doc: doc, calc: c, onChanged: _load),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _WarningsPanel extends ConsumerWidget {
  const _WarningsPanel({required this.calc});

  final ProjectComputation calc;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final issues = calc.issues;
    if (issues.isEmpty) return const SizedBox.shrink();
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value!;
    return ExpansionTile(
      leading: const Icon(Icons.warning_amber_rounded, color: Color(0xFF8D6E00)),
      title: Text('${context.l.warningsTitle} (${issues.length})'),
      backgroundColor: RiskColors.warnBg,
      collapsedBackgroundColor: RiskColors.warnBg,
      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      children: [
        for (final i in issues)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(i.blocks ? Icons.dangerous : Icons.info_outline, size: 18, color: i.blocks ? RiskColors.danger : const Color(0xFF8D6E00)),
              const SizedBox(width: 8),
              Expanded(child: Text(issueText(context.l, i.code, content, lang))),
            ]),
          ),
      ],
    );
  }
}

// ------------------------------------------------------------------ Plan 2D
class _PlanTab extends ConsumerStatefulWidget {
  const _PlanTab({required this.doc, required this.calc, required this.onMoved});

  final ProjectDoc doc;
  final ProjectComputation calc;
  final Future<void> Function() onMoved;

  @override
  ConsumerState<_PlanTab> createState() => _PlanTabState();
}

class _PlanTabState extends ConsumerState<_PlanTab> {
  bool _elevations = false;
  String? _dragging;

  Plan get plan => widget.calc.plan;

  void _move(Offset p, PlanTransform t) {
    final id = _dragging;
    if (id == null) return;
    final d = plan.device(id);
    if (d == null) return;
    final room = plan.room;
    final (x, y) = t.toRoom(p);
    final cx = x.clamp(0.0, room.length), cy = y.clamp(0.0, room.width);
    final placement = widget.doc.placements.putIfAbsent(id, Placement.new);
    if (d.onCeiling) {
      placement
        ..cx = cx
        ..cy = cy;
      d
        ..cx = cx
        ..cy = cy;
    } else {
      final (wall, u) = room.nearestWall(cx, cy);
      placement
        ..wall = wall
        ..u = u;
      d
        ..wall = wall
        ..u = u;
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final colors = ref.watch(contentProvider).value?.wireColors ?? const {};
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(8),
        child: SegmentedButton<bool>(
          segments: [
            ButtonSegment(value: false, label: Text(l.topView), icon: const Icon(Icons.grid_on)),
            ButtonSegment(value: true, label: Text(l.wallName('A–D')), icon: const Icon(Icons.view_week)),
          ],
          selected: {_elevations},
          onSelectionChanged: (s) => setState(() => _elevations = s.first),
        ),
      ),
      Expanded(
        child: _elevations
            ? LayoutBuilder(
                builder: (_, box) => SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: CustomPaint(
                    size: Size(ElevationPainter.widthFor(plan.room, box.maxHeight), box.maxHeight),
                    painter: ElevationPainter(plan: plan, colors: colors, dark: dark),
                  ),
                ),
              )
            : LayoutBuilder(builder: (_, box) {
                final size = Size(box.maxWidth, box.maxHeight);
                final t = PlanTransform(plan.room, size);
                return GestureDetector(
                  onLongPressStart: (e) {
                    String? best;
                    var bestD = 40.0;
                    for (final d in plan.devices) {
                      final pos = d.position(plan.room);
                      final dist = (t.toCanvas(pos.x, pos.y) - e.localPosition).distance;
                      if (dist < bestD) {
                        bestD = dist;
                        best = d.id;
                      }
                    }
                    setState(() => _dragging = best);
                  },
                  onLongPressMoveUpdate: (e) => _move(e.localPosition, t),
                  onLongPressEnd: (_) async {
                    if (_dragging == null) return;
                    setState(() => _dragging = null);
                    await widget.onMoved();
                  },
                  child: CustomPaint(size: size, painter: PlanPainter(plan: plan, colors: colors, dark: dark, highlight: _dragging)),
                );
              }),
      ),
      Padding(
        padding: const EdgeInsets.all(8),
        child: Wrap(spacing: 12, runSpacing: 4, alignment: WrapAlignment.center, children: [
          _Legend(color: hexColor(colors['phase'], const Color(0xFF8B4513)), text: l.legendPhase),
          _Legend(color: hexColor(colors['phase_alt'], const Color(0xFFD32F2F)), text: l.legendSwitched),
          Text(l.planDragHint, style: Theme.of(context).textTheme.bodySmall, textAlign: TextAlign.center),
        ]),
      ),
    ]);
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.text});

  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 18, height: 4, color: color),
        const SizedBox(width: 6),
        Text(text, style: const TextStyle(fontSize: 12)),
      ]);
}

// ------------------------------------------------------------------ 3D
class _Viewer3DTab extends ConsumerWidget {
  const _Viewer3DTab({required this.calc});

  final ProjectComputation calc;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = ref.watch(contentProvider).value?.wireColors ?? const {};
    final scene = {
      ...calc.plan.toJson(),
      'colors': colors,
      'dark': Theme.of(context).brightness == Brightness.dark,
    };
    return Viewer3D(
      sceneJson: scene,
      onTapDevice: (id) {
        final d = calc.plan.device(id);
        if (d != null) showSnack(context, deviceLabel(context.l, d));
      },
    );
  }
}

// ------------------------------------------------------------------ Route
class _RouteTab extends ConsumerWidget {
  const _RouteTab({required this.calc});

  final ProjectComputation calc;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value!;
    final plan = calc.plan;
    return ListView(padding: const EdgeInsets.all(12), children: [
      for (final c in plan.circuits) ...[
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(circuitLabel(l, c, content, lang), style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Wrap(spacing: 8, runSpacing: 6, children: [
                Chip(avatar: const Icon(Icons.power_settings_new, size: 18), label: Text(l.breakerA(c.breakerA))),
                Chip(avatar: const Icon(Icons.cable, size: 18), label: Text(l.crossSection(c.mm2.toStringAsFixed(c.mm2 % 1 == 0 ? 0 : 1)))),
                Chip(label: Text(l.designCurrent(c.powerW.round(), c.designCurrentA.toStringAsFixed(1)))),
                Chip(
                  backgroundColor: c.vdropPct > content.calc.calc.vdropWarnPct ? RiskColors.warnBg : null,
                  label: Text(l.vdrop(c.vdropPct.toStringAsFixed(2))),
                ),
              ]),
              if (c.needsPanelWork)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: RiskChip(risk: Risk.danger, label: l.panelWorkNote),
                ),
              const Divider(),
              for (final s in plan.segments.where((s) => s.circuit == c.kind && s.circuitIndex == c.index))
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(radius: 14, child: Text(s.id.substring(1), style: const TextStyle(fontSize: 11))),
                  title: Text(l.segmentFromTo(deviceLabel(l, plan.device(s.fromId)), deviceLabel(l, plan.device(s.toId)))),
                  subtitle: Text(l.segmentLength(s.length.toStringAsFixed(2), cableName(s.cableKey, content, lang))),
                ),
            ]),
          ),
        ),
        const SizedBox(height: 10),
      ],
      Text(l.routeTotal(plan.totalRouteM.toStringAsFixed(1)), style: Theme.of(context).textTheme.titleSmall),
      SectionTitle(l.routingRulesTitle),
      Text(l.routingRules),
    ]);
  }
}

// ------------------------------------------------------------------ Diagram
class _DiagramTab extends ConsumerWidget {
  const _DiagramTab({required this.calc});

  final ProjectComputation calc;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final colors = ref.watch(contentProvider).value?.wireColors ?? const {};
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ListView(padding: const EdgeInsets.all(12), children: [
      Wrap(spacing: 12, runSpacing: 6, children: [
        _Legend(color: hexColor(colors['phase'], const Color(0xFF8B4513)), text: l.legendPhase),
        _Legend(color: hexColor(colors['phase_alt'], const Color(0xFFD32F2F)), text: l.legendSwitched),
        _Legend(color: hexColor(colors['neutral'], const Color(0xFF1E63D6)), text: l.legendNeutral),
        _Legend(color: hexColor(colors['pe'], const Color(0xFF9ACD32)), text: l.legendPe),
        _Legend(color: dark ? Colors.white : Colors.black, text: l.legendTraveller),
      ]),
      const SizedBox(height: 8),
      Text(l.diagramNote, style: Theme.of(context).textTheme.bodySmall),
      for (final d in calc.diagrams) ...[
        const SizedBox(height: 14),
        Text('${diagramTitle(l, d.kind)} · QF ${d.breakerA} A · ${d.mm2} mm²', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 6),
        Card(
          child: InteractiveViewer(
            maxScale: 4,
            child: AspectRatio(
              aspectRatio: d.width / d.height,
              child: CustomPaint(painter: DiagramPainter(d, colors: colors, dark: dark)),
            ),
          ),
        ),
      ],
    ]);
  }
}

// ------------------------------------------------------------------ Materials
class _MaterialsTab extends ConsumerWidget {
  const _MaterialsTab({required this.doc, required this.calc, required this.onChanged});

  final ProjectDoc doc;
  final ProjectComputation calc;
  final Future<void> Function() onChanged;

  Future<void> _edit(BuildContext context, MaterialLine line, String name, double rate, bool usd) async {
    final l = context.l;
    final qty = TextEditingController(text: line.qty.toString());
    final price = TextEditingController(text: (usd ? line.unitPrice / rate : line.unitPrice).toStringAsFixed(usd ? 2 : 0));
    var included = line.included && (!line.optional || line.included);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => AlertDialog(
          title: Text(name),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: qty, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: l.quantity)),
            const SizedBox(height: 12),
            TextField(controller: price, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: l.unitPrice)),
            if (line.optional)
              CheckboxListTile(value: included, onChanged: (v) => set(() => included = v ?? false), title: Text(l.includeInTotal), contentPadding: EdgeInsets.zero),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l.save)),
          ],
        ),
      ),
    );
    if (ok != true) return;
    final q = double.tryParse(qty.text.replaceAll(',', '.'));
    final p = double.tryParse(price.text.replaceAll(',', '.'));
    final overrides = (doc.result!['material_overrides'] as Map).cast<String, dynamic>();
    overrides[line.key] = {
      'qty': q ?? line.qty,
      'unit_price': p == null ? line.unitPrice : (usd ? p * rate : p),
      if (line.optional) 'included': included,
    };
    doc.result!['material_overrides'] = overrides;
    await onChanged();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final s = ref.watch(settingsProvider);
    final content = ref.watch(contentProvider).value!;
    final usd = s.currency == 'USD';
    final rate = content.usdRate();
    String money(double uzs) => usd ? (uzs / rate).toStringAsFixed(2) : formatMoney(uzs, lang);
    final cur = usd ? 'USD' : l.currencyUZS;
    final main = calc.materials.where((m) => !m.optional).toList();
    final optional = calc.materials.where((m) => m.optional).toList();

    Widget row(MaterialLine m) {
      final name = content.material(m.key)?.name(lang) ?? m.key;
      final reason = reasonText(l, m.reasonCode);
      return ListTile(
        onTap: () => _edit(context, m, name, rate, usd),
        title: Text(name),
        subtitle: Text([
          '${m.qty % 1 == 0 ? m.qty.toInt() : m.qty} ${unitLabel(l, m.unit)} × ${money(m.unitPrice)}',
          if (reason.isNotEmpty) reason,
        ].join('\n')),
        isThreeLine: reason.isNotEmpty,
        trailing: Text(m.optional && !m.included ? '—' : '${money(m.qty * m.unitPrice)} $cur', style: const TextStyle(fontWeight: FontWeight.w700)),
      );
    }

    return Column(children: [
      Expanded(
        child: ListView(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text(l.materialsPricesNote(content.region(s.region)?.name(lang) ?? s.region), style: Theme.of(context).textTheme.bodySmall),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: Text(l.materialsReserveNote(content.calc.calc.cableReservePct.round()), style: Theme.of(context).textTheme.bodySmall),
          ),
          for (final m in main) row(m),
          SectionTitle('  ${l.materialsOptional}'),
          for (final m in optional) row(m),
        ]),
      ),
      Material(
        elevation: 4,
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Text(l.materialsTotal, style: Theme.of(context).textTheme.titleMedium),
              const Spacer(),
              Text('${money(MaterialsCalculator.total(calc.materials))} $cur',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            ]),
          ),
        ),
      ),
    ]);
  }
}

// ------------------------------------------------------------------ Steps
class _StepsTab extends ConsumerWidget {
  const _StepsTab({required this.doc, required this.calc, required this.onChanged});

  final ProjectDoc doc;
  final ProjectComputation calc;
  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value!;
    final progress = ref.watch(progressProvider).value ?? const {};
    final slugs = recommendedLessons(calc.plan, doc.answers);
    return ListView(padding: const EdgeInsets.all(12), children: [
      SectionTitle(l.stepsIntro),
      for (final (i, slug) in slugs.indexed)
        if (content.lessonBySlug(slug) case final lesson?)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(child: Text('${i + 1}')),
              title: Text(lesson.title(lang)),
              subtitle: Text(lesson.summary(lang)),
              trailing: progress[lesson.id]?.completed == true
                  ? const Icon(Icons.check_circle, color: RiskColors.ok)
                  : const Icon(Icons.chevron_right),
              onTap: () => context.push('/lessons/${lesson.slug}'),
            ),
          ),
      const SizedBox(height: 12),
      FilledButton.icon(
        icon: const Icon(Icons.play_arrow),
        label: Text(l.startWork),
        onPressed: () async {
          final ok = await showSafetyGate(context, ref, logContext: {'project_id': doc.id});
          if (!ok) return;
          doc.status = ProjectStatus.inProgress;
          await ref.read(projectsProvider.notifier).save(doc);
          await onChanged();
        },
      ),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        icon: const Icon(Icons.fact_check),
        label: Text(l.checkWork),
        onPressed: () => context.push('/check?project=${doc.id}'),
      ),
      const SizedBox(height: 8),
      if (doc.status == ProjectStatus.inProgress)
        OutlinedButton.icon(
          icon: const Icon(Icons.done_all),
          label: Text(l.markDone),
          onPressed: () async {
            doc.status = ProjectStatus.done;
            await ref.read(projectsProvider.notifier).save(doc);
            await onChanged();
          },
        ),
    ]);
  }
}
