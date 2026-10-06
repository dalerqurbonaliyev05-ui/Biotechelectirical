import 'package:elektruy/core/calc/calc.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  final cfg = loadConfig();
  final s = cfg.calc;

  group('loadCurrent', () {
    test('I = P / (U·cosφ)', () {
      expect(loadCurrent(powerW: 2200, voltage: 220), closeTo(10.0, 1e-9));
      expect(loadCurrent(powerW: 2090, voltage: 220, cosphi: 0.95), closeTo(10.0, 1e-9));
      expect(loadCurrent(powerW: 0, voltage: 220), 0);
    });

    test('rejects invalid input', () {
      expect(() => loadCurrent(powerW: -1, voltage: 220), throwsArgumentError);
      expect(() => loadCurrent(powerW: 100, voltage: 0), throwsArgumentError);
      expect(() => loadCurrent(powerW: 100, voltage: 220, cosphi: 0), throwsArgumentError);
      expect(() => loadCurrent(powerW: 100, voltage: 220, cosphi: 1.2), throwsArgumentError);
    });
  });

  group('voltageDropPercent', () {
    test('2·L·I·ρ·cosφ / S / U', () {
      // 20 m, 10 A, 2.5 mm², ρ=0.0175: ΔU = 2·20·10·0.0175/2.5 = 2.8 V -> 1.2727 %
      expect(voltageDropPercent(lengthM: 20, currentA: 10, mm2: 2.5, voltage: 220), closeTo(1.2727, 1e-3));
      expect(voltageDropPercent(lengthM: 20, currentA: 10, mm2: 2.5, voltage: 220, cosphi: 0.5), closeTo(0.6364, 1e-3));
    });

    test('larger section means smaller drop', () {
      final a = voltageDropPercent(lengthM: 30, currentA: 16, mm2: 1.5, voltage: 220);
      final b = voltageDropPercent(lengthM: 30, currentA: 16, mm2: 2.5, voltage: 220);
      expect(b, lessThan(a));
    });

    test('rejects zero section', () {
      expect(() => voltageDropPercent(lengthM: 1, currentA: 1, mm2: 0, voltage: 220), throwsArgumentError);
    });
  });

  group('pickBreaker', () {
    test('smallest standard rating >= current', () {
      expect(pickBreaker(4.2, s.breakerRatings), 6);
      expect(pickBreaker(10, s.breakerRatings), 10);
      expect(pickBreaker(10.1, s.breakerRatings), 13);
      expect(pickBreaker(3, s.breakerRatings, atLeast: 16), 16);
      expect(pickBreaker(40, s.breakerRatings), isNull);
    });
  });

  group('chooseCircuit (defaults from config)', () {
    test('lighting: copper 1.5 mm², 10 A', () {
      final c = chooseCircuit(
        designCurrentA: loadCurrent(powerW: 300, voltage: 220),
        settings: s,
        minMm2: s.lightingMinMm2,
        defaultBreakerA: s.lightingBreakerA,
        maxBreakerA: s.lightingMaxBreakerA,
        hidden: true,
      )!;
      expect(c.breakerA, 10);
      expect(c.mm2, 1.5);
    });

    test('sockets: copper 2.5 mm², 16 A', () {
      final c = chooseCircuit(
        designCurrentA: loadCurrent(powerW: 1800, voltage: 220, cosphi: 0.95),
        settings: s,
        minMm2: s.socketsMinMm2,
        defaultBreakerA: s.socketsBreakerA,
        hidden: true,
      )!;
      expect(c.breakerA, 16);
      expect(c.mm2, 2.5);
    });

    test('2.5 kW AC on a dedicated line still fits 16 A / 2.5 mm²', () {
      final c = chooseCircuit(
        designCurrentA: loadCurrent(powerW: 2500, voltage: 220, cosphi: 0.9),
        settings: s,
        minMm2: 2.5,
        defaultBreakerA: 16,
        hidden: true,
      )!;
      expect(c.designCurrentA, closeTo(12.63, 0.01));
      expect(c.breakerA, 16);
      expect(c.mm2, 2.5);
    });

    test('3.5 kW (15.9 A) still fits 16 A / 2.5 mm²; 3.6 kW (16.4 A) needs 20 A / 4 mm²', () {
      final ok = chooseCircuit(
        designCurrentA: loadCurrent(powerW: 3500, voltage: 220),
        settings: s,
        minMm2: 2.5,
        defaultBreakerA: 16,
        hidden: true,
      )!;
      expect(ok.breakerA, 16);
      expect(ok.mm2, 2.5);
      final c = chooseCircuit(
        designCurrentA: loadCurrent(powerW: 3600, voltage: 220),
        settings: s,
        minMm2: 2.5,
        defaultBreakerA: 16,
        hidden: true,
      )!;
      expect(c.breakerA, 20);
      expect(c.mm2, 4);
    });

    test('lighting above the max breaker is rejected', () {
      final c = chooseCircuit(
        designCurrentA: 18,
        settings: s,
        minMm2: 1.5,
        defaultBreakerA: 10,
        maxBreakerA: 16,
        hidden: true,
      );
      expect(c, isNull);
    });

    test('nothing in the table for 40 A', () {
      expect(chooseCircuit(designCurrentA: 40, settings: s, minMm2: 2.5, defaultBreakerA: 16, hidden: true), isNull);
    });
  });

  group('withReserve', () {
    test('adds percent and rounds up to 0.5 m', () {
      expect(withReserve(10, 12), 11.5); // 11.2 -> 11.5
      expect(withReserve(20, 10), 22.0);
      expect(withReserve(0, 12), 0);
    });
  });

  test('cable keys', () {
    expect(cableKeyFor(3, 1.5), 'cable_3x1_5');
    expect(cableKeyFor(3, 2.5), 'cable_3x2_5');
    expect(cableKeyFor(4, 1.5), 'cable_4x1_5');
    expect(cableKeyFor(3, 4), 'cable_3x4');
  });
}
