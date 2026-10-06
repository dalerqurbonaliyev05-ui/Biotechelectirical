import 'package:elektruy/core/calc/calc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  final cfg = loadConfig();
  final guard = ScopeGuard(cfg);
  final planner = Planner(cfg);
  final room = RoomGeometry(length: 4, width: 3, height: 2.7);

  group('ScopeGuard', () {
    test('clean answers are in scope', () {
      expect(ScopeGuard.isOutOfScope(guard.fromAnswers(Answers(), room: room)), isFalse);
    });

    final blockers = <String, Answers Function()>{
      'panel_work': () => Answers(panelWork: true),
      'grounding': () => Answers(groundingWork: true),
      'three_phase': () => Answers(threePhase: true),
      'wet_zone': () => Answers(wetZone: true),
      'aluminium': () => Answers(aluminiumWiring: true),
      'damaged_wiring': () => Answers(damagedWiring: true),
      'high_power': () => Answers(appliances: [const ApplianceChoice(key: 'oven', powerW: 3600, cosphi: 1)]),
      'boiler': () => Answers(appliances: [const ApplianceChoice(key: 'water_heater', powerW: 2000, cosphi: 1)]),
    };
    blockers.forEach((code, answers) {
      test('$code blocks', () {
        final issues = guard.fromAnswers(answers());
        expect(issues.any((i) => i.code == code && i.blocks), isTrue);
        expect(ScopeGuard.isOutOfScope(issues), isTrue);
        expect(cfg.rule(code), isNotNull, reason: 'rule text must exist in config');
      });
    });

    test('exactly 3.5 kW is still allowed, warnings do not block', () {
      final issues = guard.fromAnswers(
        Answers(wallMaterial: WallMaterial.wood, hasPe: false, appliances: [const ApplianceChoice(key: 'x', powerW: 3500, cosphi: 1)]),
        room: RoomGeometry(length: 7, width: 5, height: 2.7),
      );
      expect(issues.map((i) => i.code), containsAll(['wood_hidden', 'no_pe', 'room_too_large']));
      expect(ScopeGuard.isOutOfScope(issues), isFalse);
    });

    test('evaluate merges plan warnings without duplicates', () {
      final answers = Answers(hasPe: false);
      final plan = planner.build(room: room, input: [Device(id: 's', type: DeviceType.socket, wall: Wall.a, u: 1)], answers: answers);
      final issues = guard.evaluate(answers, plan);
      expect(issues.where((i) => i.code == 'no_pe').length, 1);
      expect(issues.any((i) => i.code == 'input_assumed'), isTrue);
    });
  });

  group('MaterialsCalculator', () {
    double price(String key) => switch (key) { 'cable_3x1_5' => 9000, 'cable_3x2_5' => 14000, 'socket' => 35000, _ => 1000 };

    Plan typical(Answers a) => planner.build(room: room, answers: a, input: [
          Device(id: 'in', type: DeviceType.input, wall: Wall.a, u: 0.5, z: 2.4),
          Device(id: 'sw', type: DeviceType.switchSingle, wall: Wall.a, u: 3.5, z: 1),
          Device(id: 'l', type: DeviceType.lamp, cx: 2, cy: 1.5),
          Device(id: 's1', type: DeviceType.socket, wall: Wall.b, u: 1),
          Device(id: 's2', type: DeviceType.socket, wall: Wall.c, u: 2),
        ]);

    test('hidden wiring in brick', () {
      final a = Answers();
      final plan = typical(a);
      final lines = const MaterialsCalculator().build(plan, a, price);
      final byKey = {for (final l in lines) l.key: l};
      expect(byKey['cable_3x1_5']!.qty, plan.cableToBuy['cable_3x1_5']);
      expect(byKey['cable_3x2_5']!.qty, plan.cableToBuy['cable_3x2_5']);
      expect(byKey['socket']!.qty, 2);
      expect(byKey['switch_single']!.qty, 1);
      expect(byKey['socket_box']!.qty, 3);
      expect(byKey['junction_box_hidden']!.qty, 1);
      expect(byKey.containsKey('gypsum_plaster'), isTrue);
      expect(byKey.containsKey('corrugated_pipe_16'), isFalse);
      expect(byKey['breaker_10a']!.qty, 1);
      expect(byKey['breaker_16a']!.qty, 1);
      expect(byKey['tool_voltage_tester']!.optional, isFalse);
      expect(byKey['tool_multimeter']!.optional, isTrue);
      // Optional lines do not count towards the total.
      final total = MaterialsCalculator.total(lines);
      final expected = lines.where((l) => !l.optional).fold<double>(0, (s, l) => s + l.qty * l.unitPrice);
      expect(total, closeTo(expected, 1e-6));
    });

    test('drywall needs corrugated conduit, drywall boxes and clips', () {
      final a = Answers(wallMaterial: WallMaterial.gypsum);
      final lines = const MaterialsCalculator().build(typical(a), a, price);
      final keys = lines.map((l) => l.key).toSet();
      expect(keys, containsAll(['corrugated_pipe_16', 'clip_16', 'socket_box_drywall']));
      expect(keys.contains('socket_box'), isFalse);
    });

    test('open wiring uses trunking and no wall boxes', () {
      final a = Answers(wiringType: WiringType.open);
      final lines = const MaterialsCalculator().build(typical(a), a, price);
      final keys = lines.map((l) => l.key).toSet();
      expect(keys, contains('cable_channel_16'));
      expect(keys, contains('junction_box_open'));
      expect(keys.contains('socket_box'), isFalse);
    });

    test('existing junction box is not bought again', () {
      final a = Answers(hasJunctionBox: true);
      final lines = const MaterialsCalculator().build(typical(a), a, price);
      expect(lines.any((l) => l.key.startsWith('junction_box')), isFalse);
    });

    test('quantity edits change the total', () {
      final a = Answers();
      final lines = const MaterialsCalculator().build(typical(a), a, price);
      final before = MaterialsCalculator.total(lines);
      lines.firstWhere((l) => l.key == 'socket').qty += 1;
      expect(MaterialsCalculator.total(lines) - before, closeTo(35000, 1e-6));
      final roundTrip = lines.map((l) => MaterialLine.fromJson(l.toJson())).toList();
      expect(MaterialsCalculator.total(roundTrip), closeTo(MaterialsCalculator.total(lines), 1e-6));
    });
  });

  group('DiagramBuilder', () {
    test('one diagram per switch and per socket circuit', () {
      final plan = planner.build(room: room, answers: Answers(), input: [
        Device(id: 'in', type: DeviceType.input, wall: Wall.a, u: 0.5, z: 2.4),
        Device(id: 'sw', type: DeviceType.switchDouble, wall: Wall.a, u: 3.5, z: 1),
        Device(id: 'l1', type: DeviceType.lamp, cx: 1.5, cy: 1.5),
        Device(id: 'l2', type: DeviceType.lamp, cx: 3, cy: 1.5),
        Device(id: 'p1', type: DeviceType.switchPass, wall: Wall.b, u: 1, z: 1),
        Device(id: 'p2', type: DeviceType.switchPass, wall: Wall.d, u: 1, z: 1),
        Device(id: 'l3', type: DeviceType.lamp, wall: Wall.c, u: 2, z: 2.0, switchId: 'p1'),
        Device(id: 's1', type: DeviceType.socket, wall: Wall.b, u: 2),
      ]);
      final diagrams = const DiagramBuilder().build(plan, hasPe: true);
      final kinds = diagrams.map((d) => d.kind).toList();
      expect(kinds, containsAll([DiagramKind.switchDouble, DiagramKind.switchPass, DiagramKind.sockets]));
      for (final d in diagrams) {
        expect(d.prims, isNotEmpty);
        expect(d.prims.whereType<DLine>().any((l) => l.color == WireColor.neutral), isTrue);
        expect(d.prims.whereType<DLine>().any((l) => l.color == WireColor.pe), isTrue);
      }
      final noPe = const DiagramBuilder().build(plan, hasPe: false);
      expect(noPe.expand((d) => d.prims).whereType<DLine>().any((l) => l.color == WireColor.pe), isFalse);
    });
  });
}
