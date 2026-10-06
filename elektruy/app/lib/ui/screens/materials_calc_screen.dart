import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/calc/calc.dart';
import '../../core/content/content_models.dart';
import '../../core/services/labels.dart';
import '../../state/providers.dart';
import '../widgets/common.dart';

/// Devices placed automatically for a quick estimate without photos: sockets spread
/// over walls B–D, switches next to the door on wall A, lamps on the ceiling.
List<Device> autoDevices(RoomGeometry room, {required int sockets, required int lamps, required SwitchKind switchKind}) {
  final out = <Device>[];
  const socketWalls = [Wall.b, Wall.c, Wall.d];
  for (var i = 0; i < sockets; i++) {
    final w = socketWalls[i % socketWalls.length];
    final perWall = (sockets / socketWalls.length).ceil();
    final slot = i ~/ socketWalls.length;
    final len = room.wallLength(w);
    out.add(Device(id: 'S${i + 1}', type: DeviceType.socket, wall: w, u: len * (slot + 1) / (perWall + 1), z: 0.3));
  }
  if (lamps > 0) {
    final type = switch (switchKind) {
      SwitchKind.single => DeviceType.switchSingle,
      SwitchKind.double => DeviceType.switchDouble,
      SwitchKind.pass => DeviceType.switchPass,
    };
    out.add(Device(id: 'K1', type: type, wall: Wall.a, u: (room.length - 0.4).clamp(0.2, room.length), z: 0.9));
    if (switchKind == SwitchKind.pass) {
      out.add(Device(id: 'K2', type: type, wall: Wall.c, u: 0.4, z: 0.9));
    }
  }
  for (var i = 0; i < lamps; i++) {
    out.add(Device(
      id: 'H${i + 1}',
      type: DeviceType.lamp,
      cx: room.length * (i + 1) / (lamps + 1),
      cy: room.width / 2,
      lampGroup: switchKind == SwitchKind.double ? i % 2 : 0,
    ));
  }
  return out;
}

class MaterialsCalcScreen extends ConsumerStatefulWidget {
  const MaterialsCalcScreen({super.key});

  @override
  ConsumerState<MaterialsCalcScreen> createState() => _MaterialsCalcScreenState();
}

class _MaterialsCalcScreenState extends ConsumerState<MaterialsCalcScreen> {
  double _length = 4, _width = 3, _height = 2.7;
  int _sockets = 4, _lamps = 1;
  SwitchKind _switch = SwitchKind.single;
  final _answers = Answers();
  final _edits = <String, (double qty, double price)>{};

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final settings = ref.watch(settingsProvider);
    final content = ref.watch(contentProvider).value;
    if (content == null) return Scaffold(appBar: AppBar(title: Text(l.materialsCalc)), body: const Skeleton());

    final room = RoomGeometry(length: _length, width: _width, height: _height);
    final plan = Planner(content.calc).build(
      room: room,
      input: autoDevices(room, sockets: _sockets, lamps: _lamps, switchKind: _switch),
      answers: _answers,
    );
    final lines = MaterialsCalculator(clipSpacingM: content.calc.calc.clipSpacingM)
        .build(plan, _answers, (k) => content.price(k, settings.region));
    for (final line in lines) {
      final e = _edits[line.key];
      if (e != null) {
        line.qty = e.$1;
        line.unitPrice = e.$2;
      }
    }
    final rate = settings.currency == 'USD' ? content.usdRate() : 1.0;
    final cur = settings.currency == 'USD' ? l.currencyUSD : l.currencyUZS;
    final total = MaterialsCalculator.total(lines) / rate;
    final regionName = content.region(settings.region)?.name(lang) ?? settings.region;

    return Scaffold(
      appBar: AppBar(title: Text(l.materialsCalc)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        SectionTitle(l.dimsTitle),
        Row(children: [
          Expanded(child: _num(l.dimLength, _length, 1, 12, (v) => _length = v)),
          const SizedBox(width: 8),
          Expanded(child: _num(l.dimWidth, _width, 1, 12, (v) => _width = v)),
          const SizedBox(width: 8),
          Expanded(child: _num(l.dimHeight, _height, 2, 4.5, (v) => _height = v)),
        ]),
        const SizedBox(height: 8),
        _counter(l.qSockets, _sockets, 0, 16, (v) => _sockets = v),
        _counter(l.qLamps, _lamps, 0, 8, (v) => _lamps = v),
        const SizedBox(height: 4),
        Text(l.switchType, style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        SegmentedButton<SwitchKind>(
          segments: [
            ButtonSegment(value: SwitchKind.single, label: Text(l.switchSingle)),
            ButtonSegment(value: SwitchKind.double, label: Text(l.switchDouble)),
            ButtonSegment(value: SwitchKind.pass, label: Text(l.switchPass)),
          ],
          selected: {_switch},
          onSelectionChanged: (s) => setState(() => _switch = s.first),
        ),
        const SizedBox(height: 12),
        Text(l.qWiringType, style: const TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        SegmentedButton<WiringType>(
          segments: [
            ButtonSegment(value: WiringType.hidden, label: Text(l.wiringHidden)),
            ButtonSegment(value: WiringType.open, label: Text(l.wiringOpen)),
          ],
          selected: {_answers.wiringType},
          onSelectionChanged: (s) => setState(() => _answers.wiringType = s.first),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<WallMaterial>(
          initialValue: _answers.wallMaterial,
          decoration: InputDecoration(labelText: l.qWallMaterial),
          items: [
            DropdownMenuItem(value: WallMaterial.brick, child: Text(l.wallBrick)),
            DropdownMenuItem(value: WallMaterial.concrete, child: Text(l.wallConcrete)),
            DropdownMenuItem(value: WallMaterial.gypsum, child: Text(l.wallGypsum)),
            DropdownMenuItem(value: WallMaterial.wood, child: Text(l.wallWood)),
          ],
          onChanged: (v) => setState(() => _answers.wallMaterial = v ?? WallMaterial.brick),
        ),
        const SizedBox(height: 8),
        _num(l.qPanelDistance, _answers.panelDistanceM, 1, 60, (v) => _answers.panelDistanceM = v),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          value: _answers.hasPe,
          onChanged: (v) => setState(() => _answers.hasPe = v),
          title: Text(l.qHasPe),
        ),
        const Divider(),
        SectionTitle(l.tabMaterials),
        Text(l.materialsPricesNote(regionName), style: Theme.of(context).textTheme.bodySmall),
        Text(l.materialsReserveNote(content.calc.calc.cableReservePct.round()), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: 8),
        for (final line in lines.where((x) => !x.optional)) _lineTile(context, line, content, lang, rate),
        if (lines.any((x) => x.optional)) ...[
          SectionTitle(l.materialsOptional),
          for (final line in lines.where((x) => x.optional)) _lineTile(context, line, content, lang, rate),
        ],
        const SizedBox(height: 80),
      ]),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          color: Theme.of(context).colorScheme.primaryContainer,
          child: Row(children: [
            Text(l.materialsTotal, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const Spacer(),
            Text('${formatMoney(total, lang)} $cur', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          ]),
        ),
      ),
    );
  }

  Widget _lineTile(BuildContext context, MaterialLine line, ContentBundle content, String lang, double rate) {
    final l = context.l;
    final reason = reasonText(l, line.reasonCode);
    final qty = line.qty == line.qty.roundToDouble() ? line.qty.toStringAsFixed(0) : line.qty.toStringAsFixed(1);
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        title: Text(content.material(line.key)?.name(lang) ?? line.key),
        subtitle: Text([
          '$qty ${unitLabel(l, line.unit)} × ${formatMoney(line.unitPrice / rate, lang)}',
          if (reason.isNotEmpty) reason,
        ].join('\n')),
        trailing: Text(formatMoney(line.qty * line.unitPrice / rate, lang), style: const TextStyle(fontWeight: FontWeight.w700)),
        onTap: () => _editLine(line, content.material(line.key)?.name(lang) ?? line.key),
      ),
    );
  }

  Future<void> _editLine(MaterialLine line, String name) async {
    final l = context.l;
    final q = TextEditingController(text: line.qty.toString());
    final p = TextEditingController(text: line.unitPrice.round().toString());
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(name),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: q, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: l.quantity)),
          TextField(controller: p, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: '${l.unitPrice}, ${l.currencyUZS}')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l.save)),
        ],
      ),
    );
    if (ok != true) return;
    final qty = double.tryParse(q.text.replaceAll(',', '.'));
    final price = double.tryParse(p.text.replaceAll(' ', ''));
    if (qty == null || price == null || qty < 0 || price < 0) return;
    setState(() => _edits[line.key] = (qty, price));
  }

  Widget _num(String label, double value, double min, double max, ValueChanged<double> set) => TextFormField(
        key: ValueKey(label),
        initialValue: value.toString(),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(labelText: label, suffixText: context.l.unitM),
        autovalidateMode: AutovalidateMode.onUserInteraction,
        validator: (s) {
          final v = double.tryParse((s ?? '').replaceAll(',', '.'));
          return v == null || v < min || v > max ? context.l.dimInvalid(min.toString(), max.toString()) : null;
        },
        onChanged: (s) {
          final v = double.tryParse(s.replaceAll(',', '.'));
          if (v != null && v >= min && v <= max) setState(() => set(v));
        },
      );

  Widget _counter(String label, int value, int min, int max, ValueChanged<int> set) => Row(children: [
        Expanded(child: Text(label, style: const TextStyle(fontSize: 16))),
        IconButton.filledTonal(onPressed: value > min ? () => setState(() => set(value - 1)) : null, icon: const Icon(Icons.remove)),
        SizedBox(width: 40, child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
        IconButton.filledTonal(onPressed: value < max ? () => setState(() => set(value + 1)) : null, icon: const Icon(Icons.add)),
      ]);
}
