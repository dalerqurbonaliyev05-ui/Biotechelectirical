import '../calc/calc.dart';
import '../content/content_models.dart';
import 'project_doc.dart';

class ProjectComputation {
  ProjectComputation({required this.plan, required this.materials, required this.diagrams, required this.issues});

  final Plan plan;
  final List<MaterialLine> materials;
  final List<DiagramModel> diagrams;
  final List<ScopeIssue> issues;

  bool get outOfScope => ScopeGuard.isOutOfScope(issues);
}

/// Runs the planner, scope guard, materials calculator and diagram builder for a
/// project. User edits to material lines (`result.material_overrides`) survive rebuilds.
ProjectComputation computeProject(ProjectDoc doc, ContentBundle content, {required String region}) {
  final room = doc.room;
  if (room == null) throw StateError('room dimensions missing');
  final cfg = content.calc;
  final plan = Planner(cfg).build(room: room, input: doc.devices(room), answers: doc.answers);
  final issues = ScopeGuard(cfg).evaluate(doc.answers, plan);
  final materials = MaterialsCalculator(clipSpacingM: cfg.calc.clipSpacingM).build(plan, doc.answers, (k) => content.price(k, region));
  applyMaterialOverrides(materials, doc.result?['material_overrides'] as Map?);
  final diagrams = const DiagramBuilder().build(plan, hasPe: doc.answers.hasPe);
  return ProjectComputation(plan: plan, materials: materials, diagrams: diagrams, issues: issues);
}

void applyMaterialOverrides(List<MaterialLine> lines, Map? overrides) {
  if (overrides == null) return;
  for (final line in lines) {
    final o = overrides[line.key];
    if (o is! Map) continue;
    if (o['qty'] is num) line.qty = (o['qty'] as num).toDouble();
    if (o['unit_price'] is num) line.unitPrice = (o['unit_price'] as num).toDouble();
    if (o['included'] is bool) {
      line.included = o['included'] as bool;
      if (line.optional && line.included) line.optional = false;
    }
  }
}

/// Stores the computed result on the document (also used by the admin read-only view).
void storeResult(ProjectDoc doc, ProjectComputation c) {
  final overrides = (doc.result?['material_overrides'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
  doc.result = {
    'plan': c.plan.toJson(),
    'materials': c.materials.map((m) => m.toJson()).toList(),
    'scope': c.issues.map((i) => i.toJson()).toList(),
    'material_overrides': overrides,
    'built_at': DateTime.now().toIso8601String(),
  };
  doc.outOfScope = c.outOfScope;
  doc.lampSwitch
    ..clear()
    ..addEntries(c.plan.devices.where((d) => d.type == DeviceType.lamp && d.switchId != null).map((d) => MapEntry(d.id, d.switchId!)));
  if (doc.status == ProjectStatus.draft) doc.status = ProjectStatus.planned;
}
