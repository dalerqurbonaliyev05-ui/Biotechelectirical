import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/ai_service.dart';
import '../../../../core/services/ar_service.dart';
import '../../../../state/providers.dart';
import '../../../theme.dart';
import '../../../widgets/common.dart';
import '../wizard_screen.dart';

enum _Dim { length, width, height }

class DimensionsStep extends ConsumerStatefulWidget {
  const DimensionsStep({super.key, required this.ctrl});

  final WizardController ctrl;

  @override
  ConsumerState<DimensionsStep> createState() => _DimensionsStepState();
}

class _DimensionsStepState extends ConsumerState<DimensionsStep> {
  late final _c = {
    _Dim.length: TextEditingController(),
    _Dim.width: TextEditingController(),
    _Dim.height: TextEditingController(),
  };
  bool _estimating = false;
  RoomEstimate? _estimate;
  ArAvailability? _ar;

  static const _range = {_Dim.length: (1.0, 15.0), _Dim.width: (1.0, 15.0), _Dim.height: (2.0, 4.5)};

  bool get _cm => ref.read(settingsProvider).units == 'cm';

  @override
  void initState() {
    super.initState();
    final d = widget.ctrl.doc;
    _set(_Dim.length, d.length);
    _set(_Dim.width, d.width);
    _set(_Dim.height, d.height ?? 2.7);
    if (d.aiEstimate != null) _estimate = RoomEstimate.fromJson(d.aiEstimate!);
    ref.read(arServiceProvider).availability().then((a) {
      if (mounted) setState(() => _ar = a);
    });
    if (d.height == null) WidgetsBinding.instance.addPostFrameCallback((_) => _commit());
  }

  @override
  void dispose() {
    for (final c in _c.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _set(_Dim d, double? meters) {
    if (meters == null) return;
    _c[d]!.text = _cm ? (meters * 100).round().toString() : meters.toStringAsFixed(2);
  }

  double? _read(_Dim d) {
    final v = double.tryParse(_c[d]!.text.replaceAll(',', '.'));
    if (v == null) return null;
    final m = _cm ? v / 100 : v;
    final (lo, hi) = _range[d]!;
    return m >= lo && m <= hi ? m : null;
  }

  Future<void> _commit() => widget.ctrl.update((doc) {
        doc.length = _read(_Dim.length);
        doc.width = _read(_Dim.width);
        doc.height = _read(_Dim.height);
      });

  Future<void> _aiEstimate() async {
    final l = context.l;
    final ai = ref.read(aiServiceProvider);
    if (ref.read(currentUserProvider) == null || ai == null) {
      showSnack(context, l.needsSignIn, error: true);
      return;
    }
    if (!ref.read(isOnlineProvider)) {
      showSnack(context, l.needsOnline, error: true);
      return;
    }
    setState(() => _estimating = true);
    try {
      final doc = widget.ctrl.doc;
      await ref.read(projectRepoProvider).pushProject(doc); // uploads photos first
      final paths = doc.photos.map((p) => p.remotePath).whereType<String>().take(4).toList();
      final est = await ai.estimateRoom(photoPaths: paths, lang: ref.read(langProvider));
      await widget.ctrl.update((d) => d.aiEstimate = est.toJson());
      setState(() => _estimate = est);
    } on AiError catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } catch (e) {
      if (mounted) showSnack(context, l.errorWithDetail('$e'), error: true);
    } finally {
      if (mounted) setState(() => _estimating = false);
    }
  }

  Future<void> _measure(_Dim d) async {
    final l = context.l;
    final ar = ref.read(arServiceProvider);
    final v = await ar.measure(scanHint: l.arScanHint, tapFirst: l.arTapFirst, tapSecond: l.arTapSecond, useLabel: l.arUse, resetLabel: l.arReset);
    if (v == null || !mounted) return;
    setState(() => _set(d, v));
    await widget.ctrl.update((doc) => doc.dimsSource = 'ar');
    await _commit();
    if (mounted) showSnack(context, l.arResult(v.toStringAsFixed(2)));
  }

  Future<void> _pickArTarget() async {
    final l = context.l;
    final d = await showModalBottomSheet<_Dim>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(title: Text(l.arMeasureWhat, style: Theme.of(ctx).textTheme.titleMedium)),
          ListTile(leading: const Icon(Icons.straighten), title: Text(l.dimLength), onTap: () => Navigator.pop(ctx, _Dim.length)),
          ListTile(leading: const Icon(Icons.straighten), title: Text(l.dimWidth), onTap: () => Navigator.pop(ctx, _Dim.width)),
          ListTile(leading: const Icon(Icons.height), title: Text(l.dimHeight), onTap: () => Navigator.pop(ctx, _Dim.height)),
        ]),
      ),
    );
    if (d != null) await _measure(d);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final unit = _cm ? l.unitCm : l.unitM;
    final content = ref.watch(contentProvider).value;
    final aiEnabled = content?.feature('ai_estimate') ?? true;
    final arEnabled = (content?.feature('ar_measure') ?? true) &&
        (_ar == ArAvailability.supported || _ar == ArAvailability.notInstalled); // the AR screen offers the ARCore install

    Widget field(_Dim d, String label) {
      final (lo, hi) = _range[d]!;
      String f(double m) => _cm ? '${(m * 100).round()}' : m.toStringAsFixed(1);
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: _c[d],
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
          style: const TextStyle(fontSize: 20),
          decoration: InputDecoration(
            labelText: label,
            suffixText: unit,
            errorText: _c[d]!.text.isNotEmpty && _read(d) == null ? l.dimInvalid(f(lo), f(hi)) : null,
          ),
          onChanged: (_) {
            setState(() {});
            _commit();
          },
        ),
      );
    }

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(l.dimsTitle, style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 16),
      field(_Dim.length, l.dimLength),
      field(_Dim.width, l.dimWidth),
      field(_Dim.height, l.dimHeight),
      const SizedBox(height: 8),
      if (aiEnabled)
        OutlinedButton.icon(
          onPressed: _estimating ? null : _aiEstimate,
          icon: _estimating ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome),
          label: Text(_estimating ? l.aiEstimating : l.dimAi),
        ),
      const SizedBox(height: 8),
      if (arEnabled)
        OutlinedButton.icon(onPressed: _pickArTarget, icon: const Icon(Icons.view_in_ar), label: Text(l.dimAr))
      else if (_ar == ArAvailability.unsupported)
        Text(l.arUnsupported, style: Theme.of(context).textTheme.bodySmall),
      if (_estimate != null) ...[
        const SizedBox(height: 16),
        _EstimateCard(
          estimate: _estimate!,
          onUse: () async {
            final e = _estimate!;
            setState(() {
              _set(_Dim.length, e.length);
              _set(_Dim.width, e.width);
              _set(_Dim.height, e.height);
            });
            await widget.ctrl.update((d) => d.dimsSource = 'ai');
            await _commit();
          },
        ),
      ],
    ]);
  }
}

class _EstimateCard extends StatelessWidget {
  const _EstimateCard({required this.estimate, required this.onUse});

  final RoomEstimate estimate;
  final VoidCallback onUse;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    if (!estimate.usable) {
      return Card(color: RiskColors.warnBg, child: Padding(padding: const EdgeInsets.all(14), child: Text(l.aiUnusable)));
    }
    final level = switch (estimate.confidence) {
      'high' => l.confidenceHigh,
      'medium' => l.confidenceMedium,
      _ => l.confidenceLow,
    };
    final risk = switch (estimate.confidence) {
      'high' => Risk.ok,
      'medium' => Risk.warn,
      _ => Risk.danger,
    };
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.auto_awesome),
            const SizedBox(width: 8),
            Expanded(child: Text(l.aiResultTitle, style: Theme.of(context).textTheme.titleMedium)),
            RiskChip(risk: risk, label: l.aiConfidence(level)),
          ]),
          const SizedBox(height: 10),
          Text(
            '${l.dimLength}: ${estimate.length?.toStringAsFixed(2)} · ${l.dimWidth}: ${estimate.width?.toStringAsFixed(2)} · ${l.dimHeight}: ${estimate.height?.toStringAsFixed(2)} ${l.unitM}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          if (estimate.references.isNotEmpty) ...[const SizedBox(height: 6), Text(estimate.references.join(' · '), style: Theme.of(context).textTheme.bodySmall)],
          if (estimate.notes.isNotEmpty) ...[const SizedBox(height: 6), Text(estimate.notes)],
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: RiskColors.warnBg, borderRadius: BorderRadius.circular(10)),
            child: Text(l.aiConfirmHint),
          ),
          const SizedBox(height: 10),
          SizedBox(width: double.infinity, child: FilledButton(onPressed: onUse, child: Text(l.useValues))),
        ]),
      ),
    );
  }
}
