import 'package:elektruy/core/calc/calc.dart';
import 'package:elektruy/core/project/project_doc.dart';
import 'package:elektruy/core/project/project_planning.dart';
import 'package:elektruy/ui/screens/project/result_screen.dart';
import 'package:elektruy/ui/widgets/safety_gate.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'test_app.dart';

void main() {
  testWidgets('result has 3 tabs and the 3D guide walks through the job', (tester) async {
    tester.view.physicalSize = const Size(1080, 2280);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final content = loadTestContent();
    final repo = await pumpTestApp(
      tester,
      initial: '/r',
      routes: {'/r': (_) => const ResultScreen(projectId: 'p1')},
      content: content,
      seed: (r) {
        final doc = ProjectDoc(id: 'p1', title: 'Bedroom', length: 4, width: 3, height: 2.7);
        doc.extraDevices.addAll([
          Device(id: 'in', type: DeviceType.input, wall: Wall.a, u: 0.5, z: 2.4),
          Device(id: 'k1', type: DeviceType.switchSingle, wall: Wall.a, u: 3.5, z: 1),
          Device(id: 'h1', type: DeviceType.lamp, cx: 2, cy: 1.5),
          Device(id: 's1', type: DeviceType.socket, wall: Wall.b, u: 1, z: 0.3),
        ]);
        storeResult(doc, computeProject(doc, content, region: 'tashkent_city'));
        r.docs['p1'] = doc;
      },
    );
    // The checklist was already accepted today, so the guide does not ask again.
    await markSafetyGateAccepted(await SharedPreferences.getInstance());

    expect(find.text('Plan'), findsOneWidget);
    expect(find.text('3D assembly'), findsOneWidget);
    expect(find.text('Materials'), findsOneWidget);
    expect(find.text('Cable route'), findsNothing);
    expect(find.text('Turn off the power'), findsOneWidget);
    expect(find.text('1 / 11'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    expect(find.text('Mark the routes'), findsOneWidget);
    expect(repo.docs['p1']!.status, ProjectStatus.inProgress);

    for (var i = 0; i < 3; i++) {
      await tester.tap(find.widgetWithText(FilledButton, 'Next'));
      await tester.pumpAndSettle();
    }
    expect(find.textContaining('pull the cable'), findsOneWidget);
    expect(find.text('Diagram'), findsOneWidget);
  });
}
