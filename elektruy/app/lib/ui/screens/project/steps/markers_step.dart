import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/calc/models.dart';
import '../../../../core/project/project_doc.dart';
import '../../../widgets/common.dart';
import '../wizard_screen.dart';

const _uuid = Uuid();

IconData markerIcon(MarkerKind k) => switch (k) {
      MarkerKind.input => Icons.power,
      MarkerKind.socket => Icons.electrical_services,
      MarkerKind.switchKey => Icons.toggle_on,
      MarkerKind.lamp => Icons.lightbulb,
      MarkerKind.junction => Icons.radio_button_checked,
    };

Color markerColor(MarkerKind k) => switch (k) {
      MarkerKind.input => const Color(0xFFEF6C00),
      MarkerKind.socket => const Color(0xFF1565C0),
      MarkerKind.switchKey => const Color(0xFF2E7D32),
      MarkerKind.lamp => const Color(0xFFF9A825),
      MarkerKind.junction => const Color(0xFF616161),
    };

String markerLabel(BuildContext context, MarkerKind k) => switch (k) {
      MarkerKind.input => context.l.markerInput,
      MarkerKind.socket => context.l.markerSocket,
      MarkerKind.switchKey => context.l.markerSwitch,
      MarkerKind.lamp => context.l.markerLamp,
      MarkerKind.junction => context.l.markerJunction,
    };

class MarkersStep extends ConsumerStatefulWidget {
  const MarkersStep({super.key, required this.ctrl});

  final WizardController ctrl;

  @override
  ConsumerState<MarkersStep> createState() => _MarkersStepState();
}

class _MarkersStepState extends ConsumerState<MarkersStep> {
  int _photo = 0;
  MarkerKind _kind = MarkerKind.socket;

  ProjectDoc get doc => widget.ctrl.doc;

  Future<void> _addAt(Offset local, Size size) async {
    final photo = doc.photos[_photo];
    final m = MarkerDoc(
      id: _uuid.v4(),
      photoId: photo.id,
      kind: _kind,
      x: (local.dx / size.width).clamp(0.0, 1.0),
      y: (local.dy / size.height).clamp(0.0, 1.0),
      onCeiling: _kind == MarkerKind.lamp ? local.dy / size.height < 0.35 : true,
    );
    await widget.ctrl.update((d) => d.markers.add(m));
  }

  Future<void> _edit(MarkerDoc m) async {
    final l = context.l;
    // Points of the same kind on other photos, for "same point" linking.
    final others = doc.markers.where((o) => o.kind == m.kind && o.photoId != m.photoId).toList();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setSheet) {
        Future<void> apply(void Function() f) async {
          await widget.ctrl.update((_) => f());
          setSheet(() {});
        }

        return Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 16 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final k in MarkerKind.values)
                ChoiceChip(
                  avatar: Icon(markerIcon(k), size: 18, color: markerColor(k)),
                  label: Text(markerLabel(context, k)),
                  selected: m.kind == k,
                  onSelected: (_) => apply(() => m.kind = k),
                ),
            ]),
            if (m.kind == MarkerKind.switchKey) ...[
              const SizedBox(height: 12),
              Text(l.switchType, style: Theme.of(ctx).textTheme.titleSmall),
              SegmentedButton<SwitchKind>(
                segments: [
                  ButtonSegment(value: SwitchKind.single, label: Text(l.switchSingle)),
                  ButtonSegment(value: SwitchKind.double, label: Text(l.switchDouble)),
                  ButtonSegment(value: SwitchKind.pass, label: Text(l.switchPass)),
                ],
                selected: {m.switchKind},
                onSelectionChanged: (s) => apply(() => m.switchKind = s.first),
              ),
            ],
            if (m.kind == MarkerKind.lamp) ...[
              const SizedBox(height: 12),
              Text(l.lampMount, style: Theme.of(ctx).textTheme.titleSmall),
              SegmentedButton<bool>(
                segments: [
                  ButtonSegment(value: true, label: Text(l.lampCeiling), icon: const Icon(Icons.vertical_align_top)),
                  ButtonSegment(value: false, label: Text(l.lampWall), icon: const Icon(Icons.border_left)),
                ],
                selected: {m.onCeiling},
                onSelectionChanged: (s) => apply(() => m.onCeiling = s.first),
              ),
            ],
            if (others.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                initialValue: m.linkKey,
                decoration: InputDecoration(labelText: l.markerSamePoint),
                items: [
                  DropdownMenuItem(value: null, child: Text(l.markerSamePointNone)),
                  for (final o in others)
                    DropdownMenuItem(
                      value: o.deviceId,
                      child: Text('${markerLabel(context, o.kind)} · ${l.wallName(doc.photo(o.photoId)?.wall?.label ?? '?')} · ${(o.x * 100).round()}%'),
                    ),
                ],
                onChanged: (v) => apply(() => m.linkKey = v),
              ),
            ],
            const SizedBox(height: 12),
            TextFormField(
              initialValue: m.note,
              maxLength: 300,
              decoration: InputDecoration(labelText: l.markerNote),
              onChanged: (v) => m.note = v.trim().isEmpty ? null : v.trim(),
              onEditingComplete: () => apply(() {}),
            ),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(foregroundColor: Theme.of(ctx).colorScheme.error),
                  onPressed: () async {
                    await widget.ctrl.update((d) {
                      d.markers.remove(m);
                      for (final o in d.markers.where((o) => o.linkKey == m.id)) {
                        o.linkKey = null;
                      }
                    });
                    if (ctx.mounted) Navigator.pop(ctx);
                  },
                  icon: const Icon(Icons.delete_outline),
                  label: Text(l.markerDelete),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () async {
                    await widget.ctrl.update((_) {});
                    if (ctx.mounted) Navigator.pop(ctx);
                  },
                  child: Text(l.done),
                ),
              ),
            ]),
          ]),
        );
      }),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    if (doc.photos.isEmpty) return EmptyState(icon: Icons.photo, title: l.needOnePhoto);
    _photo = _photo.clamp(0, doc.photos.length - 1);
    final photo = doc.photos[_photo];
    final markers = doc.markers.where((m) => m.photoId == photo.id).toList();
    final switches = doc.count(MarkerKind.switchKey);
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Text(l.markersHint, style: Theme.of(context).textTheme.bodyMedium),
      ),
      SizedBox(
        height: 56,
        child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12), children: [
          for (final k in MarkerKind.values)
            Padding(
              padding: const EdgeInsets.all(4),
              child: ChoiceChip(
                avatar: Icon(markerIcon(k), color: markerColor(k)),
                label: Text(markerLabel(context, k)),
                selected: _kind == k,
                onSelected: (_) => setState(() => _kind = k),
                labelPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              ),
            ),
        ]),
      ),
      Expanded(
        child: LayoutBuilder(builder: (context, box) {
          final w = photo.width?.toDouble() ?? 4, h = photo.height?.toDouble() ?? 3;
          var width = box.maxWidth, height = box.maxWidth * h / w;
          if (height > box.maxHeight) {
            height = box.maxHeight;
            width = height * w / h;
          }
          final size = Size(width, height);
          return Center(
            child: SizedBox(
              width: width,
              height: height,
              child: GestureDetector(
                onTapUp: (d) => _addAt(d.localPosition, size),
                child: Stack(clipBehavior: Clip.none, children: [
                  Positioned.fill(
                    child: photo.localPath != null && File(photo.localPath!).existsSync()
                        ? Image.file(File(photo.localPath!), fit: BoxFit.fill)
                        : const ColoredBox(color: Colors.black12),
                  ),
                  for (final m in markers)
                    Positioned(
                      left: m.x * width - 22,
                      top: m.y * height - 22,
                      child: GestureDetector(
                        onTap: () => _edit(m),
                        onPanUpdate: (d) {
                          setState(() {
                            m.x = (m.x + d.delta.dx / width).clamp(0.0, 1.0);
                            m.y = (m.y + d.delta.dy / height).clamp(0.0, 1.0);
                          });
                        },
                        onPanEnd: (_) => widget.ctrl.update((_) {}),
                        child: _MarkerDot(kind: m.kind, linked: m.linkKey != null),
                      ),
                    ),
                ]),
              ),
            ),
          );
        }),
      ),
      if (doc.photos.length > 1)
        SizedBox(
          height: 72,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(8),
            itemCount: doc.photos.length,
            itemBuilder: (_, i) {
              final p = doc.photos[i];
              return GestureDetector(
                onTap: () => setState(() => _photo = i),
                child: Container(
                  width: 72,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: i == _photo ? Theme.of(context).colorScheme.primary : Colors.transparent, width: 3),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(fit: StackFit.expand, children: [
                    if (p.localPath != null && File(p.localPath!).existsSync()) Image.file(File(p.localPath!), fit: BoxFit.cover, cacheWidth: 200),
                    Align(
                      alignment: Alignment.bottomRight,
                      child: Container(
                        color: Colors.black54,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Text(p.wall?.label ?? '?', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ]),
                ),
              );
            },
          ),
        ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
        child: Text(
          doc.markers.isEmpty ? l.markersNone : l.markersCount(doc.count(MarkerKind.socket), switches, doc.count(MarkerKind.lamp)),
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ),
    ]);
  }
}

class _MarkerDot extends StatelessWidget {
  const _MarkerDot({required this.kind, required this.linked});

  final MarkerKind kind;
  final bool linked;

  @override
  Widget build(BuildContext context) => Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: markerColor(kind),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 6)],
        ),
        child: Stack(alignment: Alignment.center, children: [
          Icon(markerIcon(kind), color: Colors.white, size: 24),
          if (linked) const Positioned(right: 0, bottom: 0, child: Icon(Icons.link, size: 14, color: Colors.white)),
        ]),
      );
}
