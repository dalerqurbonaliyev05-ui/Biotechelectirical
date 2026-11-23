import 'package:elektruy/ui/widgets/safety_gate.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  test('safety checklist is asked once a day', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final morning = DateTime(2026, 11, 23, 8);
    expect(safetyGateAcceptedToday(prefs, morning), isFalse);
    await markSafetyGateAccepted(prefs, morning);
    expect(safetyGateAcceptedToday(prefs, DateTime(2026, 11, 23, 22, 30)), isTrue);
    expect(safetyGateAcceptedToday(prefs, DateTime(2026, 11, 24, 0, 5)), isFalse);
  });
}
