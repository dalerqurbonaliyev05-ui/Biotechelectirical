import 'models.dart';
import 'planner.dart';

/// Stages of the step-by-step 3D installation guide, in the order they are done.
enum AssemblyStage { safety, mark, chase, channel, boxes, cable, junction, socket, switchSingle, switchDouble, switchPass, lamp, finish }

/// Close-up wiring model shown in the 3D view for a connection step.
enum AssemblyDetail { junction, socket, switchSingle, switchDouble, switchPass, lamp }

/// One step of the 3D installation guide. The viewer uses [stage] to decide what
/// is built in the room (marks, chases, boxes, cables, devices), [focusDeviceId]
/// and [segmentIds] to aim the camera, and [detail] to show a close-up of the
/// terminals. Texts are localized by the app from [stage] and [params].
class AssemblyStep {
  const AssemblyStep({
    required this.id,
    required this.stage,
    this.focusDeviceId,
    this.segmentIds = const [],
    this.deviceIds = const [],
    this.detail,
    this.circuitId,
    this.lessonSlug,
    this.params = const {},
  });

  final String id;
  final AssemblyStage stage;
  final String? focusDeviceId;
  final List<String> segmentIds;
  final List<String> deviceIds;
  final AssemblyDetail? detail;
  final String? circuitId;
  final String? lessonSlug;
  final Map<String, Object> params;

  Map<String, dynamic> toJson() => {
        'id': id,
        'stage': stage.name,
        if (focusDeviceId != null) 'focus': focusDeviceId,
        'segments': segmentIds,
        'devices': deviceIds,
        if (detail != null) 'detail': detail!.name,
        if (circuitId != null) 'circuit': circuitId,
        'params': params,
      };
}

/// Turns a wiring [Plan] into the ordered installation steps:
/// power off → mark → chases (or cable channels) → boxes → one cable step per
/// circuit → junction box → sockets → each switch type → lamps → check and switch on.
class AssemblyBuilder {
  const AssemblyBuilder();

  List<AssemblyStep> build(Plan plan, Answers answers, {double socketM = 0.3, double switchM = 1.0}) {
    final steps = <AssemblyStep>[];
    final input = plan.ofType(DeviceType.input).firstOrNull;
    final jb = plan.ofType(DeviceType.junctionBox).firstOrNull;
    final sockets = plan.ofType(DeviceType.socket).toList();
    final lamps = plan.ofType(DeviceType.lamp).toList();
    final allSegments = plan.segments.map((s) => s.id).toList();
    final boxDevices = plan.devices.where((d) => d.type == DeviceType.socket || d.type.isSwitch || d.type == DeviceType.junctionBox).toList();

    steps.add(AssemblyStep(id: 'safety', stage: AssemblyStage.safety, focusDeviceId: input?.id, lessonSlug: 'safety-basics'));
    steps.add(AssemblyStep(
      id: 'mark',
      stage: AssemblyStage.mark,
      segmentIds: allSegments,
      deviceIds: plan.devices.where((d) => d.type != DeviceType.input).map((d) => d.id).toList(),
      lessonSlug: 'cable-routing',
      params: {'socket_cm': (socketM * 100).round(), 'switch_cm': (switchM * 100).round()},
    ));
    steps.add(AssemblyStep(
      id: answers.hidden ? 'chase' : 'channel',
      stage: answers.hidden ? AssemblyStage.chase : AssemblyStage.channel,
      segmentIds: allSegments,
      lessonSlug: 'cable-routing',
      params: {'length_m': _r1(plan.totalRouteM)},
    ));
    if (boxDevices.isNotEmpty) {
      steps.add(AssemblyStep(
        id: 'boxes',
        stage: AssemblyStage.boxes,
        deviceIds: boxDevices.map((d) => d.id).toList(),
        params: {'count': boxDevices.where((d) => d.type != DeviceType.junctionBox).length},
      ));
    }

    // One cable step per circuit, lighting first, then socket groups and dedicated lines.
    final circuits = [...plan.circuits]..sort((a, b) => _circuitOrder(a).compareTo(_circuitOrder(b)));
    for (final c in circuits) {
      final segs = plan.segments.where((s) => s.circuit == c.kind && s.circuitIndex == c.index).toList();
      if (segs.isEmpty) continue;
      final length = segs.fold<double>(0, (a, s) => a + s.length);
      final cables = <String>{for (final s in segs) s.cableKey}.toList();
      steps.add(AssemblyStep(
        id: 'cable_${c.id}',
        stage: AssemblyStage.cable,
        segmentIds: segs.map((s) => s.id).toList(),
        deviceIds: c.deviceIds,
        circuitId: c.id,
        lessonSlug: 'cable-routing',
        params: {
          'length_m': _r1(length),
          'count': segs.length,
          'cable': cables.first,
          'cables': cables,
          'breaker_a': c.breakerA,
          'mm2': c.mm2,
          'panel': c.needsPanelWork,
        },
      ));
    }

    if (jb != null && lamps.isNotEmpty) {
      final switches = plan.devices.where((d) => d.type.isSwitch).length;
      steps.add(AssemblyStep(
        id: 'junction',
        stage: AssemblyStage.junction,
        focusDeviceId: jb.id,
        detail: AssemblyDetail.junction,
        segmentIds: plan.segments.where((s) => s.fromId == jb.id || s.toId == jb.id).map((s) => s.id).toList(),
        lessonSlug: 'junction-box',
        params: {'lamps': lamps.length, 'switches': switches, 'pe': answers.hasPe},
      ));
    }
    if (sockets.isNotEmpty) {
      steps.add(AssemblyStep(
        id: 'socket',
        stage: AssemblyStage.socket,
        focusDeviceId: sockets.first.id,
        detail: AssemblyDetail.socket,
        deviceIds: sockets.map((d) => d.id).toList(),
        lessonSlug: 'install-socket',
        params: {'count': sockets.length, 'pe': answers.hasPe},
      ));
    }
    for (final (type, stage, detail, slug) in const [
      (DeviceType.switchSingle, AssemblyStage.switchSingle, AssemblyDetail.switchSingle, 'switch-single'),
      (DeviceType.switchDouble, AssemblyStage.switchDouble, AssemblyDetail.switchDouble, 'switch-double'),
      (DeviceType.switchPass, AssemblyStage.switchPass, AssemblyDetail.switchPass, 'switch-pass-through'),
    ]) {
      final list = plan.ofType(type).toList();
      if (list.isEmpty) continue;
      steps.add(AssemblyStep(
        id: 'switch_${type.name}',
        stage: stage,
        focusDeviceId: list.first.id,
        detail: detail,
        deviceIds: list.map((d) => d.id).toList(),
        lessonSlug: slug,
        params: {'count': list.length},
      ));
    }
    if (lamps.isNotEmpty) {
      steps.add(AssemblyStep(
        id: 'lamp',
        stage: AssemblyStage.lamp,
        focusDeviceId: lamps.first.id,
        detail: AssemblyDetail.lamp,
        deviceIds: lamps.map((d) => d.id).toList(),
        lessonSlug: 'lamp-install',
        params: {'count': lamps.length, 'pe': answers.hasPe},
      ));
    }
    steps.add(AssemblyStep(
      id: 'finish',
      stage: AssemblyStage.finish,
      lessonSlug: 'voltage-tester',
      params: {
        'hidden': answers.hidden,
        'panel': plan.circuits.any((c) => c.needsPanelWork),
        'breakers': plan.circuits.map((c) => c.breakerA).toList(),
      },
    ));
    return steps;
  }

  static int _circuitOrder(Circuit c) => switch (c.kind) {
        CircuitKind.lighting => 0,
        CircuitKind.sockets => 100 + c.index,
        CircuitKind.dedicated => 200 + c.index,
      };

  static double _r1(double v) => (v * 10).roundToDouble() / 10;
}
