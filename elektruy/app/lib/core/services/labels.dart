import '../../l10n/gen/app_localizations.dart';
import '../calc/calc.dart';
import '../content/content_models.dart';

/// Human-readable names shared by the screens and the PDF export.

String deviceLabel(AppLocalizations l, Device? d) {
  if (d == null) return '?';
  final base = switch (d.type) {
    DeviceType.input => l.devInput,
    DeviceType.junctionBox => l.devJunction,
    DeviceType.socket => l.devSocket,
    DeviceType.lamp => l.devLamp,
    DeviceType.switchSingle || DeviceType.switchDouble || DeviceType.switchPass => l.devSwitch,
  };
  final where = d.wall != null ? ' (${d.wall!.label})' : '';
  return '$base$where';
}

String circuitLabel(AppLocalizations l, Circuit c, ContentBundle content, String lang) => switch (c.kind) {
      CircuitKind.lighting => l.circuitLighting,
      CircuitKind.sockets => l.circuitSockets(c.index),
      CircuitKind.dedicated => l.circuitDedicated(content.calc.appliance(c.applianceKey ?? '')?.name(lang) ?? c.applianceKey ?? ''),
    };

String cableName(String key, ContentBundle content, String lang) => content.material(key)?.name(lang) ?? key;

String unitLabel(AppLocalizations l, String unit) => switch (unit) {
      'm' => l.unitM,
      'kg' => l.unitKg,
      _ => l.unitPcs,
    };

String diagramTitle(AppLocalizations l, DiagramKind k) => switch (k) {
      DiagramKind.switchSingle => l.diagramSingle,
      DiagramKind.switchDouble => l.diagramDouble,
      DiagramKind.switchPass => l.diagramPass,
      DiagramKind.sockets => l.diagramSockets,
      DiagramKind.dedicated => l.diagramDedicated,
    };

/// Text for a planner warning or scope issue: the admin-managed rule text first,
/// then the app's own strings.
String issueText(AppLocalizations l, String code, ContentBundle content, String lang) {
  final rule = content.calc.rule(code);
  if (rule != null) return rule.text(lang);
  return switch (code) {
    'input_assumed' => l.warn_input_assumed,
    'switch_auto_added' => l.warn_switch_auto_added,
    'pass_unpaired' => l.warn_pass_unpaired,
    'near_corner' => l.warn_near_corner,
    'too_many_lamps' => l.warn_too_many_lamps,
    'extra_socket_groups' => l.warn_extra_socket_groups,
    'dedicated_socket_auto' => l.warn_dedicated_socket_auto,
    'cable_upsized' => l.warn_cable_upsized,
    'switch_without_lamp' => l.warn_switch_without_lamp,
    'lighting_overload' => l.warn_lighting_overload,
    'socket_overload' => l.warn_socket_overload,
    _ => code,
  };
}

String reasonText(AppLocalizations l, String? code) => switch (code) {
      'electrician_installs' => l.reasonElectricianInstalls,
      'safety' => l.reasonSafety,
      'conduit_required' => l.reasonConduit,
      _ => '',
    };
