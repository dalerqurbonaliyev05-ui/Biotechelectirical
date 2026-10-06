import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../../core/calc/calc.dart';
import '../../../../core/project/project_doc.dart';
import '../../../../state/providers.dart';
import '../../../theme.dart';
import '../../../widgets/common.dart';
import '../wizard_screen.dart';

const _uuid = Uuid();

class QuestionsStep extends ConsumerWidget {
  const QuestionsStep({super.key, required this.ctrl});

  final WizardController ctrl;

  ProjectDoc get doc => ctrl.doc;

  /// Adds a device without a photo marker, placed evenly; the user can move it on the plan.
  Future<void> _addExtra(DeviceType type, RoomGeometry room) => ctrl.update((d) {
        final n = d.extraDevices.where((e) => e.type == type || (type.isSwitch && e.type.isSwitch)).length;
        final id = '${type.name}_${_uuid.v4().substring(0, 8)}';
        switch (type) {
          case DeviceType.lamp:
            d.extraDevices.add(Device(id: id, type: type, cx: room.length * (n + 1) / (n + 2), cy: room.width / 2));
          case DeviceType.socket:
            final w = Wall.values[(n + 1) % 4];
            d.extraDevices.add(Device(id: id, type: type, wall: w, u: (0.6 + 0.9 * (n ~/ 4)).clamp(0.2, room.wallLength(w) - 0.2), z: 0.3));
          default:
            d.extraDevices.add(Device(id: id, type: type, wall: Wall.a, u: (room.length - 0.4 - 0.3 * n).clamp(0.2, room.length - 0.2), z: 1.0));
        }
      });

  Future<void> _removeExtra(bool Function(Device) match) => ctrl.update((d) {
        final i = d.extraDevices.lastIndexWhere(match);
        if (i >= 0) d.extraDevices.removeAt(i);
      });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value;
    final room = doc.room;
    if (room == null || content == null) return const Skeleton();
    final devices = doc.devices(room);
    final a = doc.answers;
    final sockets = devices.where((d) => d.type == DeviceType.socket).toList();
    final lamps = devices.where((d) => d.type == DeviceType.lamp).toList();
    final switches = devices.where((d) => d.type.isSwitch).toList();
    final threshold = content.calc.calc.separateLineThresholdW;

    Widget counter(String label, IconData icon, int count, VoidCallback onAdd, VoidCallback? onRemove) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(icon),
            title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            trailing: Row(mainAxisSize: MainAxisSize.min, children: [
              IconButton.filledTonal(onPressed: onRemove, icon: const Icon(Icons.remove)),
              SizedBox(width: 36, child: Text('$count', textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700))),
              IconButton.filledTonal(onPressed: onAdd, icon: const Icon(Icons.add)),
            ]),
          ),
        );

    Widget toggle(String label, bool value, ValueChanged<bool> onChanged, {bool danger = false}) => Card(
          margin: const EdgeInsets.only(bottom: 8),
          color: danger && value ? RiskColors.dangerBg : null,
          child: SwitchListTile(
            title: Text(label),
            value: value,
            onChanged: onChanged,
            activeThumbColor: danger ? RiskColors.danger : null,
          ),
        );

    String switchName(Device s) => switch (s.type) {
          DeviceType.switchDouble => l.switchDouble,
          DeviceType.switchPass => l.switchPass,
          _ => l.switchSingle,
        };

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(l.questionsTitle, style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 6),
      Text(l.qCountsHint, style: Theme.of(context).textTheme.bodySmall),
      const SizedBox(height: 12),
      counter(l.qSockets, Icons.electrical_services, sockets.length, () => _addExtra(DeviceType.socket, room),
          doc.extraDevices.any((e) => e.type == DeviceType.socket) ? () => _removeExtra((e) => e.type == DeviceType.socket) : null),
      counter(l.qLamps, Icons.lightbulb_outline, lamps.length, () => _addExtra(DeviceType.lamp, room),
          doc.extraDevices.any((e) => e.type == DeviceType.lamp) ? () => _removeExtra((e) => e.type == DeviceType.lamp) : null),
      counter(l.qSwitches, Icons.toggle_on_outlined, switches.length, () => _addExtra(DeviceType.switchSingle, room),
          doc.extraDevices.any((e) => e.type.isSwitch) ? () => _removeExtra((e) => e.type.isSwitch) : null),
      for (final (i, s) in switches.indexed)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(children: [
            Expanded(child: Text('${l.devSwitch} ${i + 1}${s.wall != null ? ' (${s.wall!.label})' : ''}')),
            DropdownButton<SwitchKind>(
              value: switch (s.type) {
                DeviceType.switchDouble => SwitchKind.double,
                DeviceType.switchPass => SwitchKind.pass,
                _ => SwitchKind.single,
              },
              items: [
                DropdownMenuItem(value: SwitchKind.single, child: Text(l.switchSingle)),
                DropdownMenuItem(value: SwitchKind.double, child: Text(l.switchDouble)),
                DropdownMenuItem(value: SwitchKind.pass, child: Text(l.switchPass)),
              ],
              onChanged: (k) => ctrl.update((d) {
                if (k == null) return;
                for (final m in d.markers.where((m) => m.deviceId == s.id)) {
                  m.switchKind = k;
                }
                final i = d.extraDevices.indexWhere((e) => e.id == s.id);
                if (i >= 0) {
                  final old = d.extraDevices[i];
                  d.extraDevices[i] = Device(
                    id: old.id,
                    type: switch (k) {
                      SwitchKind.double => DeviceType.switchDouble,
                      SwitchKind.pass => DeviceType.switchPass,
                      SwitchKind.single => DeviceType.switchSingle,
                    },
                    wall: old.wall,
                    u: old.u,
                    z: old.z,
                  );
                }
              }),
            ),
          ]),
        ),
      if (switches.length > 1 && lamps.isNotEmpty)
        for (final (i, lamp) in lamps.indexed)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(children: [
              Expanded(child: Text('${l.devLamp} ${i + 1} →')),
              DropdownButton<String?>(
                value: switches.any((s) => s.id == doc.lampSwitch[lamp.id]) ? doc.lampSwitch[lamp.id] : null,
                hint: const Text('auto'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('auto')),
                  for (final (j, s) in switches.indexed) DropdownMenuItem(value: s.id, child: Text('${l.devSwitch} ${j + 1} · ${switchName(s)}')),
                ],
                onChanged: (v) => ctrl.update((d) => v == null ? d.lampSwitch.remove(lamp.id) : d.lampSwitch[lamp.id] = v),
              ),
            ]),
          ),
      toggle(l.qJunctionBox, a.hasJunctionBox, (v) => ctrl.update((d) => d.answers.hasJunctionBox = v)),
      SectionTitle(l.qWallMaterial),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final (m, label) in [
          (WallMaterial.brick, l.wallBrick),
          (WallMaterial.concrete, l.wallConcrete),
          (WallMaterial.gypsum, l.wallGypsum),
          (WallMaterial.wood, l.wallWood),
        ])
          ChoiceChip(label: Text(label), selected: a.wallMaterial == m, onSelected: (_) => ctrl.update((d) => d.answers.wallMaterial = m)),
      ]),
      SectionTitle(l.qWiringType),
      SegmentedButton<WiringType>(
        segments: [
          ButtonSegment(value: WiringType.hidden, label: Text(l.wiringHidden)),
          ButtonSegment(value: WiringType.open, label: Text(l.wiringOpen)),
        ],
        selected: {a.wiringType},
        onSelectionChanged: (s) => ctrl.update((d) => d.answers.wiringType = s.first),
      ),
      const SizedBox(height: 12),
      toggle(l.qHasPe, a.hasPe, (v) => ctrl.update((d) => d.answers.hasPe = v)),
      _NumberField(
        label: l.qPanelDistance,
        value: a.panelDistanceM,
        onChanged: (v) => ctrl.update((d) => d.answers.panelDistanceM = v.clamp(1, 200).toDouble()),
      ),
      _NumberField(
        label: l.qLampPower,
        value: a.lampPowerW ?? content.calc.calc.lampDefaultW,
        onChanged: (v) => ctrl.update((d) => d.answers.lampPowerW = v.clamp(1, 500).toDouble()),
      ),
      SectionTitle(l.qAppliances),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final def in content.calc.appliances)
          FilterChip(
            label: Text(def.name(lang)),
            selected: a.appliances.any((x) => x.key == def.key),
            onSelected: (on) => ctrl.update((d) {
              d.answers.appliances.removeWhere((x) => x.key == def.key);
              if (on) d.answers.appliances.add(ApplianceChoice(key: def.key, powerW: def.powerW, cosphi: def.cosphi));
            }),
          ),
      ]),
      for (final (i, app) in a.appliances.indexed)
        Card(
          margin: const EdgeInsets.only(top: 8),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(content.calc.appliance(app.key)?.name(lang) ?? app.key, style: const TextStyle(fontWeight: FontWeight.w700)),
              _NumberField(
                label: l.qAppliancePower,
                value: app.powerW,
                onChanged: (v) => ctrl.update((d) => d.answers.appliances[i] =
                    ApplianceChoice(key: app.key, powerW: v.clamp(1, 20000).toDouble(), cosphi: app.cosphi, socketId: app.socketId)),
              ),
              if (app.powerW >= threshold && app.powerW <= content.calc.calc.diyMaxApplianceW)
                DropdownButtonFormField<String?>(
                  initialValue: sockets.any((s) => s.id == app.socketId) ? app.socketId : null,
                  decoration: InputDecoration(labelText: l.qApplianceSocket),
                  items: [
                    DropdownMenuItem(value: null, child: Text(l.qApplianceAutoSocket)),
                    for (final (j, s) in sockets.indexed) DropdownMenuItem(value: s.id, child: Text('${l.devSocket} ${j + 1} (${s.wall?.label ?? '-'})')),
                  ],
                  onChanged: (v) => ctrl.update((d) => d.answers.appliances[i] = app.withSocket(v)),
                ),
            ]),
          ),
        ),
      SectionTitle(l.qChecksTitle),
      toggle(l.qPanelWork, a.panelWork, (v) => ctrl.update((d) => d.answers.panelWork = v), danger: true),
      toggle(l.qGrounding, a.groundingWork, (v) => ctrl.update((d) => d.answers.groundingWork = v), danger: true),
      toggle(l.qThreePhase, a.threePhase, (v) => ctrl.update((d) => d.answers.threePhase = v), danger: true),
      toggle(l.qWetZone, a.wetZone, (v) => ctrl.update((d) => d.answers.wetZone = v), danger: true),
      toggle(l.qAluminium, a.aluminiumWiring, (v) => ctrl.update((d) => d.answers.aluminiumWiring = v), danger: true),
      toggle(l.qDamaged, a.damagedWiring, (v) => ctrl.update((d) => d.answers.damagedWiring = v), danger: true),
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(l.qUnsure, style: const TextStyle(fontStyle: FontStyle.italic)),
      ),
    ]);
  }
}

class _NumberField extends StatefulWidget {
  const _NumberField({required this.label, required this.value, required this.onChanged});

  final String label;
  final double value;
  final ValueChanged<double> onChanged;

  @override
  State<_NumberField> createState() => _NumberFieldState();
}

class _NumberFieldState extends State<_NumberField> {
  late final _c = TextEditingController(text: widget.value.toStringAsFixed(widget.value == widget.value.roundToDouble() ? 0 : 1));

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8),
        child: TextField(
          controller: _c,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
          decoration: InputDecoration(labelText: widget.label),
          onChanged: (t) {
            final v = double.tryParse(t.replaceAll(',', '.'));
            if (v != null && v > 0) widget.onChanged(v);
          },
        ),
      );
}
