import 'package:elektruy/core/calc/calc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  final cfg = loadConfig();
  final planner = Planner(cfg);
  const builder = AssemblyBuilder();
  final room = RoomGeometry(length: 4, width: 3, height: 2.7);

  Device dev(String id, DeviceType t, Wall w, double u, [double z = 0]) => Device(id: id, type: t, wall: w, u: u, z: z);

  List<Device> typicalRoom() => [
        dev('in', DeviceType.input, Wall.a, 0.5, 2.4),
        dev('sw', DeviceType.switchSingle, Wall.a, 3.5, 1.0),
        Device(id: 'lamp', type: DeviceType.lamp, cx: 2, cy: 1.5),
        dev('s1', DeviceType.socket, Wall.b, 1.0),
        dev('s2', DeviceType.socket, Wall.c, 2.0),
      ];

  List<AssemblyStage> stages(List<AssemblyStep> steps) => steps.map((s) => s.stage).toList();

  test('typical room: full order from power off to switching on', () {
    final answers = Answers();
    final plan = planner.build(room: room, input: typicalRoom(), answers: answers);
    final steps = builder.build(plan, answers);
    expect(stages(steps), [
      AssemblyStage.safety,
      AssemblyStage.mark,
      AssemblyStage.chase,
      AssemblyStage.boxes,
      AssemblyStage.cable, // lighting
      AssemblyStage.cable, // sockets
      AssemblyStage.junction,
      AssemblyStage.socket,
      AssemblyStage.switchSingle,
      AssemblyStage.lamp,
      AssemblyStage.finish,
    ]);
    expect(steps.map((s) => s.id).toSet().length, steps.length, reason: 'step ids are unique');
  });

  test('every segment is laid in exactly one cable step', () {
    final answers = Answers();
    final plan = planner.build(room: room, input: typicalRoom(), answers: answers);
    final laid = builder.build(plan, answers).where((s) => s.stage == AssemblyStage.cable).expand((s) => s.segmentIds).toList();
    expect(laid.toSet(), plan.segments.map((s) => s.id).toSet());
    expect(laid.length, plan.segments.length);
  });

  test('cable step carries length, cable type and breaker of its circuit', () {
    final answers = Answers();
    final plan = planner.build(room: room, input: typicalRoom(), answers: answers);
    final step = builder.build(plan, answers).firstWhere((s) => s.circuitId == 'lighting_1');
    final circuit = plan.circuits.firstWhere((c) => c.id == 'lighting_1');
    final expected = plan.segments.where((s) => s.circuit == CircuitKind.lighting).fold<double>(0, (a, s) => a + s.length);
    expect(step.params['length_m'] as double, closeTo(expected, 0.05));
    expect(step.params['breaker_a'], circuit.breakerA);
    expect(step.params['cable'], 'cable_3x1_5');
  });

  test('open wiring uses cable channels instead of chases', () {
    final answers = Answers(wiringType: WiringType.open);
    final plan = planner.build(room: room, input: typicalRoom(), answers: answers);
    final s = stages(builder.build(plan, answers));
    expect(s, contains(AssemblyStage.channel));
    expect(s, isNot(contains(AssemblyStage.chase)));
  });

  test('sockets only: no junction box, switch or lamp steps', () {
    final answers = Answers();
    final plan = planner.build(room: room, input: [dev('in', DeviceType.input, Wall.a, 0.5, 2.4), dev('s1', DeviceType.socket, Wall.b, 1.0)], answers: answers);
    final s = stages(builder.build(plan, answers));
    expect(s, isNot(contains(AssemblyStage.junction)));
    expect(s, isNot(contains(AssemblyStage.lamp)));
    expect(s.where((x) => x == AssemblyStage.cable).length, 1);
    expect(s.first, AssemblyStage.safety);
    expect(s.last, AssemblyStage.finish);
  });

  test('one step per switch type, each focused on a device of that type', () {
    final answers = Answers();
    final plan = planner.build(
      room: room,
      input: [
        dev('in', DeviceType.input, Wall.a, 0.5, 2.4),
        dev('d1', DeviceType.switchDouble, Wall.a, 3.5, 1.0),
        dev('p1', DeviceType.switchPass, Wall.b, 0.5, 1.0),
        dev('p2', DeviceType.switchPass, Wall.d, 2.5, 1.0),
        Device(id: 'l1', type: DeviceType.lamp, cx: 1, cy: 1.5),
        Device(id: 'l2', type: DeviceType.lamp, cx: 3, cy: 1.5),
      ],
      answers: answers,
    );
    final steps = builder.build(plan, answers);
    final dbl = steps.firstWhere((s) => s.stage == AssemblyStage.switchDouble);
    final pass = steps.firstWhere((s) => s.stage == AssemblyStage.switchPass);
    expect(dbl.focusDeviceId, 'd1');
    expect(pass.deviceIds, ['p1', 'p2']);
    expect(pass.detail, AssemblyDetail.switchPass);
  });

  test('steps serialize for the 3D viewer', () {
    final answers = Answers();
    final plan = planner.build(room: room, input: typicalRoom(), answers: answers);
    final json = builder.build(plan, answers).map((s) => s.toJson()).toList();
    expect(json.first['stage'], 'safety');
    expect(json.firstWhere((j) => j['stage'] == 'junction')['detail'], 'junction');
    expect(json.firstWhere((j) => j['stage'] == 'cable')['segments'], isNotEmpty);
  });
}
