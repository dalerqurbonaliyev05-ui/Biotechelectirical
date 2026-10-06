import 'calc_config.dart';
import 'geometry.dart';
import 'models.dart';
import 'planner.dart';

class ScopeIssue {
  const ScopeIssue(this.code, this.severity, [this.params = const {}]);

  final String code;
  final Severity severity;
  final Map<String, Object?> params;

  bool get blocks => severity == Severity.block;

  Map<String, dynamic> toJson() => {'code': code, 'severity': severity.name, if (params.isNotEmpty) 'params': params};
}

/// Decides whether the job is DIY-able. Any `block` issue sends the user to the
/// "call a licensed electrician" screen (educational content stays available).
class ScopeGuard {
  ScopeGuard(this.config);

  final CalcConfig config;

  /// Checks that can run before the plan exists (answers + room only).
  List<ScopeIssue> fromAnswers(Answers a, {RoomGeometry? room}) {
    final out = <ScopeIssue>[];
    void block(String code, [Map<String, Object?> p = const {}]) => out.add(ScopeIssue(code, Severity.block, p));
    void warn(String code, [Map<String, Object?> p = const {}]) => out.add(ScopeIssue(code, Severity.warn, p));

    if (a.panelWork) block('panel_work');
    if (a.groundingWork) block('grounding');
    if (a.threePhase) block('three_phase');
    if (a.wetZone) block('wet_zone');
    if (a.aluminiumWiring) block('aluminium');
    if (a.damagedWiring) block('damaged_wiring');
    for (final app in a.appliances) {
      final def = config.appliance(app.key);
      if (def?.outOfScope == true) {
        block('boiler', {'appliance': app.key});
      } else if (app.powerW > config.calc.diyMaxApplianceW) {
        block('high_power', {'appliance': app.key, 'power_w': app.powerW.round()});
      }
    }
    if (room != null && room.floorArea > config.calc.maxRoomAreaM2) {
      warn('room_too_large', {'area_m2': (room.floorArea * 10).round() / 10});
    }
    if (a.hidden && a.wallMaterial == WallMaterial.wood) warn('wood_hidden');
    if (!a.hasPe) warn('no_pe');
    return out;
  }

  /// Full evaluation: answers + whatever the planner flagged.
  List<ScopeIssue> evaluate(Answers a, Plan plan) {
    final out = fromAnswers(a, room: plan.room);
    final seen = out.map((i) => '${i.code}|${i.params}').toSet();
    for (final w in plan.warnings) {
      final issue = ScopeIssue(w.code, w.severity, w.params);
      if (seen.add('${issue.code}|${issue.params}')) out.add(issue);
    }
    return out;
  }

  static bool isOutOfScope(List<ScopeIssue> issues) => issues.any((i) => i.blocks);
}
