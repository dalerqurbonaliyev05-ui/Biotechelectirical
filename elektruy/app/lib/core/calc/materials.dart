import 'dart:math' as math;

import 'models.dart';
import 'planner.dart';

/// One line in the bill of materials. Quantities and prices are editable in the app.
class MaterialLine {
  MaterialLine({
    required this.key,
    required this.qty,
    required this.unit,
    this.unitPrice = 0,
    this.optional = false,
    this.reasonCode,
  });

  final String key;
  double qty;
  final String unit;
  double unitPrice;

  /// Tools and nice-to-haves: shown, but excluded from the total until ticked.
  bool optional;
  bool included = true;
  final String? reasonCode;

  double get total => included && !optional ? qty * unitPrice : 0;

  Map<String, dynamic> toJson() => {
        'key': key,
        'qty': qty,
        'unit': unit,
        'unit_price': unitPrice,
        'optional': optional,
        'included': included,
        if (reasonCode != null) 'reason': reasonCode,
      };

  factory MaterialLine.fromJson(Map<String, dynamic> j) => MaterialLine(
        key: j['key'] as String,
        qty: (j['qty'] as num).toDouble(),
        unit: j['unit'] as String,
        unitPrice: (j['unit_price'] as num?)?.toDouble() ?? 0,
        optional: j['optional'] == true,
        reasonCode: j['reason'] as String?,
      )..included = j['included'] != false;
}

/// Price source: region override -> default price; unknown keys cost 0.
typedef PriceLookup = double Function(String key);

class MaterialsCalculator {
  const MaterialsCalculator({this.clipSpacingM = 0.45});

  final double clipSpacingM;

  List<MaterialLine> build(Plan plan, Answers answers, PriceLookup price) {
    final lines = <MaterialLine>[];
    void add(String key, double qty, String unit, {bool optional = false, String? reason}) {
      if (qty <= 0) return;
      lines.add(MaterialLine(key: key, qty: qty, unit: unit, unitPrice: price(key), optional: optional, reasonCode: reason));
    }

    // Cables (+ reserve, already rounded to 0.5 m).
    final cables = plan.cableToBuy.entries.toList()..sort((a, b) => a.key.compareTo(b.key));
    for (final c in cables) {
      add(c.key, c.value, 'm');
    }

    final sockets = plan.ofType(DeviceType.socket).length;
    final singles = plan.ofType(DeviceType.switchSingle).length;
    final doubles = plan.ofType(DeviceType.switchDouble).length;
    final passes = plan.ofType(DeviceType.switchPass).length;
    final lamps = plan.ofType(DeviceType.lamp).length;
    final switches = singles + doubles + passes;
    final autoJb = plan.devices.any((d) => d.type == DeviceType.junctionBox && d.id == 'jb_auto');
    final drywall = answers.wallMaterial == WallMaterial.gypsum;
    final hidden = answers.hidden;

    add('socket', sockets.toDouble(), 'pcs');
    add('switch_single', singles.toDouble(), 'pcs');
    add('switch_double', doubles.toDouble(), 'pcs');
    add('switch_pass', passes.toDouble(), 'pcs');
    if (hidden) {
      add(drywall ? 'socket_box_drywall' : 'socket_box', (sockets + switches).toDouble(), 'pcs');
    }
    if (autoJb && !answers.hasJunctionBox) {
      add(hidden ? 'junction_box_hidden' : 'junction_box_open', 1, 'pcs');
    }

    // Protection of the cable: corrugated conduit in drywall/wood (and for open wiring
    // in conduit), trunking for open wiring; plaster for chases in brick/concrete.
    final route = plan.totalRouteM;
    final conduitNeeded = hidden && (answers.wallMaterial == WallMaterial.gypsum || answers.wallMaterial == WallMaterial.wood);
    if (conduitNeeded) {
      final m = (route * 1.1 * 2).ceil() / 2;
      add('corrugated_pipe_16', m, 'm', reason: 'conduit_required');
      add('clip_16', (m / clipSpacingM).ceilToDouble(), 'pcs');
    } else if (!hidden) {
      add('cable_channel_16', (route * 1.1 * 2).ceil() / 2, 'm');
    } else {
      add('gypsum_plaster', math.max(1, (route / 8).ceil()).toDouble(), 'pcs');
    }

    // Connectors: L/N/PE bundles in the box, switched lines, and socket loops.
    final hasLighting = lamps > 0;
    final wago5 = hasLighting ? 3 : 0;
    final wago3 = lamps + doubles + 2 * (passes ~/ 2) + 3 * sockets;
    add('wago_5', wago5.toDouble(), 'pcs');
    add('wago_3', wago3.toDouble(), 'pcs');
    add('insulation_tape', 1, 'pcs');
    add('warning_sign', 1, 'pcs', reason: 'safety');

    // Breakers: one per circuit; installed in the panel by an electrician.
    final breakers = <int, int>{};
    for (final c in plan.circuits) {
      breakers[c.breakerA] = (breakers[c.breakerA] ?? 0) + 1;
    }
    for (final e in breakers.entries) {
      add('breaker_${e.key}a', e.value.toDouble(), 'pcs', reason: 'electrician_installs');
    }

    add('led_bulb', lamps.toDouble(), 'pcs', optional: true);
    add('ceiling_light', lamps.toDouble(), 'pcs', optional: true);

    // Tools: the voltage tester is mandatory for safety; the rest are optional.
    add('tool_voltage_tester', 1, 'pcs', reason: 'safety');
    for (final t in const ['tool_screwdriver_set', 'tool_pliers', 'tool_wire_stripper', 'tool_multimeter', 'ppe_kit']) {
      add(t, 1, 'pcs', optional: true);
    }
    if (hidden) {
      for (final t in const ['tool_crown_68', 'tool_wall_chaser', 'tool_drill', 'tool_cable_detector']) {
        add(t, 1, 'pcs', optional: true);
      }
    }
    return lines;
  }

  static double total(List<MaterialLine> lines) => lines.fold(0, (a, l) => a + l.total);
}
