import 'package:elektruy/core/calc/calc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  final cfg = loadConfig();
  final planner = Planner(cfg);
  final room = RoomGeometry(length: 4, width: 3, height: 2.7);

  Device dev(String id, DeviceType t, Wall w, double u, [double z = 0]) => Device(id: id, type: t, wall: w, u: u, z: z);

  group('WallRouter', () {
    final r = WallRouter(room, cfg.heights);

    test('same wall: up to the trunk 15 cm below the ceiling, across, down', () {
      final pts = r.wallToWall(Wall.a, 1, 1.0, Wall.a, 3, 0.3);
      expect(pts.first, const Vec3(1, 0, 1.0));
      expect(pts[1], const Vec3(1, 0, 2.55));
      expect(pts[2], const Vec3(3, 0, 2.55));
      expect(pts.last, const Vec3(3, 0, 0.3));
      expect(isManhattan(pts), isTrue);
      // 1.55 up + 2 across + 2.25 down
      expect(sumLength([Segment(id: 'x', fromId: 'a', toId: 'b', circuit: CircuitKind.sockets, circuitIndex: 1,
          purpose: SegmentPurpose.socketHop, cores: 3, mm2: 2.5, points: pts, terminationM: 0)]), closeTo(5.8, 1e-9));
    });

    test('around a corner the route turns at the corner', () {
      final pts = r.wallToWall(Wall.a, 3.5, 2.5, Wall.b, 1, 0.3);
      expect(pts, contains(const Vec3(4, 0, 2.55)));
      expect(isManhattan(pts), isTrue);
    });

    test('directly above/below: a single vertical run', () {
      final pts = r.wallToWall(Wall.b, 1, 2.5, Wall.b, 1, 0.3);
      expect(pts.length, 2);
      expect(pts.first.distanceTo(pts.last), closeTo(2.2, 1e-9));
    });

    test('ceiling lamp: along the wall, up, straight across the ceiling', () {
      final pts = r.wallToCeiling(Wall.a, 1, 2.5, 2, 1.5);
      expect(pts.last, const Vec3(2, 1.5, 2.7));
      expect(pts[pts.length - 2], const Vec3(2, 0, 2.7)); // foot on wall A, at the ceiling
      expect(isManhattan(pts), isTrue);
    });

    test('floor loop mode routes at socket height', () {
      final pts = r.wallToWall(Wall.a, 1, 0.3, Wall.a, 2, 0.3, viaZ: 0.3);
      expect(pts.length, 2);
      expect(pts.every((p) => p.z == 0.3), isTrue);
    });
  });

  group('Planner', () {
    test('typical room: 1 switch, 1 ceiling lamp, 3 sockets', () {
      final devices = [
        dev('in', DeviceType.input, Wall.a, 0.5, 2.4),
        dev('sw', DeviceType.switchSingle, Wall.a, 3.5, 1.0),
        Device(id: 'lamp', type: DeviceType.lamp, cx: 2, cy: 1.5),
        dev('s1', DeviceType.socket, Wall.b, 1.0),
        dev('s2', DeviceType.socket, Wall.c, 2.0),
        dev('s3', DeviceType.socket, Wall.d, 1.0),
      ];
      final plan = planner.build(room: room, input: devices, answers: Answers());

      // Auto junction box next to the input, 20 cm below the ceiling.
      final jb = plan.device('jb_auto')!;
      expect(jb.z, closeTo(2.5, 1e-9));
      expect(jb.wall, Wall.a);

      final lighting = plan.circuits.firstWhere((c) => c.kind == CircuitKind.lighting);
      expect(lighting.breakerA, 10);
      expect(lighting.mm2, 1.5);
      final sockets = plan.circuits.firstWhere((c) => c.kind == CircuitKind.sockets);
      expect(sockets.breakerA, 16);
      expect(sockets.mm2, 2.5);
      expect(sockets.deviceIds, ['s1', 's2', 's3']); // perimeter order from the input

      // feed + switch drop + lamp + 3 socket hops
      expect(plan.segments.length, 6);
      for (final s in plan.segments) {
        expect(isManhattan(s.points), isTrue, reason: s.id);
        expect(s.length, closeTo(s.routeLength + 2 * cfg.calc.terminationAllowanceM, 1e-9));
      }
      expect(plan.cableRaw.keys.toSet(), {'cable_3x1_5', 'cable_3x2_5'});
      // Buy = raw + 12 %, rounded up to 0.5 m.
      for (final k in plan.cableRaw.keys) {
        expect(plan.cableToBuy[k]! >= plan.cableRaw[k]! * 1.12 - 1e-9, isTrue);
        expect((plan.cableToBuy[k]! * 2) % 1, 0);
      }
      expect(plan.warnings.where((w) => w.severity == Severity.block), isEmpty);
    });

    test('devices are snapped to standard heights and pulled away from corners', () {
      final plan = planner.build(room: room, input: [
        dev('in', DeviceType.input, Wall.a, 0.5, 2.4),
        dev('s1', DeviceType.socket, Wall.a, 0.02, 0.9),
        dev('sw', DeviceType.switchSingle, Wall.b, 1, 1.7),
        Device(id: 'l', type: DeviceType.lamp, cx: 2, cy: 1.5),
      ], answers: Answers());
      final s1 = plan.device('s1')!;
      expect(s1.z, cfg.heights.socketM);
      expect(s1.u, closeTo(cfg.heights.cornerOffsetM, 1e-9));
      expect(plan.device('sw')!.z, cfg.heights.switchM);
      expect(plan.warnings.any((w) => w.code == 'near_corner'), isTrue);
    });

    test('double switch with one lamp feeds a two-group chandelier with 4 cores', () {
      final plan = planner.build(room: room, input: [
        dev('in', DeviceType.input, Wall.a, 0.5, 2.4),
        dev('sw', DeviceType.switchDouble, Wall.a, 3, 1.0),
        Device(id: 'l', type: DeviceType.lamp, cx: 2, cy: 1.5),
      ], answers: Answers());
      final lampSeg = plan.segments.firstWhere((s) => s.purpose == SegmentPurpose.lamp);
      expect(lampSeg.cores, 4);
      expect(lampSeg.cableKey, 'cable_4x1_5');
    });

    test('pass-through pair: both switches get a drop, lamps follow the first switch', () {
      final plan = planner.build(room: room, input: [
        dev('in', DeviceType.input, Wall.a, 0.5, 2.4),
        dev('p1', DeviceType.switchPass, Wall.a, 3, 1.0),
        dev('p2', DeviceType.switchPass, Wall.c, 3, 1.0),
        Device(id: 'l', type: DeviceType.lamp, cx: 2, cy: 1.5),
      ], answers: Answers());
      expect(plan.segments.where((s) => s.purpose == SegmentPurpose.switchDrop).length, 2);
      expect(plan.device('l')!.switchId, 'p1');
      expect(plan.warnings.any((w) => w.code == 'pass_unpaired'), isFalse);
    });

    test('lamps without a switch get one added, input is assumed when missing', () {
      final plan = planner.build(room: room, input: [Device(id: 'l', type: DeviceType.lamp, cx: 2, cy: 1.5)], answers: Answers());
      expect(plan.warnings.map((w) => w.code), containsAll(['input_assumed', 'switch_auto_added']));
      expect(plan.devices.any((d) => d.type.isSwitch), isTrue);
    });

    test('too many sockets are split into groups and flagged', () {
      final sockets = [for (var i = 0; i < 8; i++) dev('s$i', DeviceType.socket, Wall.values[i % 4], 0.5 + (i ~/ 4) * 1.5)];
      final plan = planner.build(room: room, input: [dev('in', DeviceType.input, Wall.a, 0.5, 2.4), ...sockets], answers: Answers());
      final groups = plan.circuits.where((c) => c.kind == CircuitKind.sockets).toList();
      expect(groups.length, 2);
      expect(groups.every((g) => g.deviceIds.length <= cfg.calc.maxSocketsPerGroup), isTrue);
      expect(groups[1].needsPanelWork, isTrue);
      expect(plan.warnings.map((w) => w.code), containsAll(['too_many_sockets', 'extra_socket_groups']));
    });

    test('2.5 kW AC gets a dedicated line from the input to its socket', () {
      final plan = planner.build(
        room: room,
        input: [dev('in', DeviceType.input, Wall.a, 0.5, 2.4), dev('s1', DeviceType.socket, Wall.b, 1), dev('ac', DeviceType.socket, Wall.c, 2, 2.2)],
        answers: Answers(appliances: [const ApplianceChoice(key: 'ac_large', powerW: 2500, cosphi: 0.9, socketId: 'ac')]),
      );
      final ded = plan.circuits.firstWhere((c) => c.kind == CircuitKind.dedicated);
      expect(ded.applianceKey, 'ac_large');
      expect(ded.deviceIds, ['ac']);
      expect(ded.needsPanelWork, isTrue);
      final general = plan.circuits.firstWhere((c) => c.kind == CircuitKind.sockets);
      expect(general.deviceIds, ['s1']);
      expect(plan.segments.where((s) => s.purpose == SegmentPurpose.dedicated).single.fromId, 'in');
      expect(plan.warnings.any((w) => w.code == 'dedicated_line'), isTrue);
    });

    test('long supply run upsizes the cable or flags the voltage drop', () {
      final plan = planner.build(
        room: room,
        input: [dev('in', DeviceType.input, Wall.a, 0.5, 2.4), dev('s1', DeviceType.socket, Wall.c, 2)],
        answers: Answers(panelDistanceM: 90, appliances: [const ApplianceChoice(key: 'kettle', powerW: 1900, cosphi: 1)]),
      );
      final c = plan.circuits.firstWhere((c) => c.kind == CircuitKind.sockets);
      expect(c.vdropPct, greaterThan(0));
      expect(c.mm2 > 2.5 || plan.warnings.any((w) => w.code == 'vdrop_high'), isTrue);
      final vd = voltageDropPercent(
          lengthM: c.longestRunM + 90, currentA: c.designCurrentA, mm2: c.mm2, voltage: 220, rho: cfg.calc.rhoCopper, cosphi: c.cosphi);
      expect(c.vdropPct, closeTo(vd, 1e-9));
    });

    test('plan serializes to JSON with 3D points', () {
      final plan = planner.build(room: room, input: [dev('in', DeviceType.input, Wall.a, 0.5, 2.4), dev('s', DeviceType.socket, Wall.b, 1)], answers: Answers());
      final j = plan.toJson();
      expect(j['room'], {'length': 4.0, 'width': 3.0, 'height': 2.7});
      expect((j['segments'] as List).first['points'], isA<List>());
      expect((j['devices'] as List).first['pos'], hasLength(3));
    });
  });
}
