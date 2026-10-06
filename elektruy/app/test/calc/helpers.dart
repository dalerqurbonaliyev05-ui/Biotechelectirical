import 'dart:convert';
import 'dart:io';

import 'package:elektruy/core/calc/calc.dart';

/// Tests use the same bundled config the app ships, so formulas are tested against
/// the real defaults (tests run with the app directory as working directory).
CalcConfig loadConfig() {
  final raw = jsonDecode(File('assets/content/config.json').readAsStringSync()) as Map<String, dynamic>;
  return CalcConfig.fromJson(raw);
}

double sumLength(Iterable<Segment> segs) => segs.fold(0, (a, s) => a + s.routeLength);

/// Every polyline step must be parallel to an axis (no diagonal runs).
bool isManhattan(List<Vec3> pts) {
  for (var i = 1; i < pts.length; i++) {
    final a = pts[i - 1], b = pts[i];
    var changed = 0;
    if ((a.x - b.x).abs() > 1e-9) changed++;
    if ((a.y - b.y).abs() > 1e-9) changed++;
    if ((a.z - b.z).abs() > 1e-9) changed++;
    if (changed > 1) return false;
  }
  return true;
}
