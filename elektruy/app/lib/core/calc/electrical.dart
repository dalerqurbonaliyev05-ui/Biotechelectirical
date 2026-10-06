import 'calc_config.dart';

/// Single-phase load current: I = P / (U · cosφ).
double loadCurrent({required double powerW, required double voltage, double cosphi = 1.0}) {
  if (powerW < 0) throw ArgumentError.value(powerW, 'powerW', 'must be >= 0');
  if (voltage <= 0) throw ArgumentError.value(voltage, 'voltage', 'must be > 0');
  if (cosphi <= 0 || cosphi > 1) throw ArgumentError.value(cosphi, 'cosphi', 'must be in (0, 1]');
  return powerW / (voltage * cosphi);
}

/// Voltage drop of a single-phase two-wire run, in percent of the supply voltage:
/// ΔU = 2 · L · I · ρ · cosφ / S, ΔU% = ΔU / U · 100 (reactance neglected for small sections).
double voltageDropPercent({
  required double lengthM,
  required double currentA,
  required double mm2,
  required double voltage,
  double rho = 0.0175,
  double cosphi = 1.0,
}) {
  if (mm2 <= 0) throw ArgumentError.value(mm2, 'mm2', 'must be > 0');
  final du = 2 * lengthM * currentA * rho * cosphi / mm2;
  return du / voltage * 100;
}

/// Smallest standard breaker rating that is >= [current] and >= [atLeast].
/// Returns null when even the largest rating is too small.
int? pickBreaker(double current, List<int> ratings, {int atLeast = 0}) {
  for (final r in ratings) {
    if (r >= current - 1e-9 && r >= atLeast) return r;
  }
  return null;
}

class CircuitChoice {
  const CircuitChoice({required this.breakerA, required this.mm2, required this.designCurrentA});

  final int breakerA;
  final double mm2;
  final double designCurrentA;
}

/// Picks breaker and copper cross-section for a circuit:
/// 1. breaker = smallest standard rating ≥ design current and ≥ the group default;
/// 2. cross-section = smallest table row ≥ the group minimum whose cable is allowed
///    to be protected by that breaker and whose permissible current (hidden/open
///    installation) is not below the breaker rating.
/// Returns null when nothing in the table fits (→ "call an electrician").
CircuitChoice? chooseCircuit({
  required double designCurrentA,
  required CalcSettings settings,
  required double minMm2,
  required int defaultBreakerA,
  int? maxBreakerA,
  required bool hidden,
}) {
  final breaker = pickBreaker(designCurrentA, settings.breakerRatings, atLeast: defaultBreakerA);
  if (breaker == null) return null;
  if (maxBreakerA != null && breaker > maxBreakerA) return null;
  for (final row in settings.crossSections) {
    if (row.mm2 + 1e-9 < minMm2) continue;
    if (row.maxBreakerA < breaker) continue;
    if (row.allowed(hidden: hidden) + 1e-9 < breaker) continue;
    return CircuitChoice(breakerA: breaker, mm2: row.mm2, designCurrentA: designCurrentA);
  }
  return null;
}

/// Total cable to buy for a measured route: raw length + reserve %, rounded up to 0.5 m.
double withReserve(double meters, double reservePct) {
  if (meters <= 0) return 0;
  final v = meters * (1 + reservePct / 100);
  return (v * 2).ceil() / 2;
}
