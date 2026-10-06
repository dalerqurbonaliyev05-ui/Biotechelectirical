import 'package:elektruy/core/project/project_doc.dart';
import 'package:elektruy/ui/screens/project/wizard_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'test_app.dart';

ProjectDoc _room({String id = 'p1'}) => ProjectDoc(id: id, title: 'Bedroom', length: 4, width: 3, height: 2.7);

void main() {
  testWidgets('a new project cannot leave the photos step without a photo', (tester) async {
    await pumpTestApp(tester, initial: '/w', routes: {'/w': (_) => const WizardScreen()});

    expect(find.text('Step 1 of 4 · Photos'), findsOneWidget);
    final next = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Next'));
    expect(next.onPressed, isNull);
  });

  testWidgets('questions step builds a plan and opens the result', (tester) async {
    final repo = await pumpTestApp(
      tester,
      initial: '/w',
      routes: {'/w': (_) => const WizardScreen(projectId: 'p1', startStep: 3)},
      seed: (r) => r.docs['p1'] = _room(),
    );

    expect(find.text('Step 4 of 4 · Questions'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Build plan'));
    await tester.pumpAndSettle();

    expect(find.text('result p1'), findsOneWidget);
    final saved = repo.docs['p1']!;
    expect(saved.result, isNotNull);
    expect(saved.outOfScope, isFalse);
    expect(saved.status, ProjectStatus.planned);
    // Devices without markers still produce circuits and a bill of materials.
    expect((saved.result!['materials'] as List), isNotEmpty);
  });

  testWidgets('answering "panel work" sends the user to the electrician screen', (tester) async {
    final repo = await pumpTestApp(
      tester,
      initial: '/w',
      routes: {'/w': (_) => const WizardScreen(projectId: 'p2', startStep: 3)},
      seed: (r) => r.docs['p2'] = _room(id: 'p2'),
    );

    final panel = find.text('The job needs work inside the electric panel');
    await tester.scrollUntilVisible(panel, 200, scrollable: find.byType(Scrollable).first);
    await tester.tap(panel);
    await tester.pumpAndSettle();
    expect(repo.docs['p2']!.answers.panelWork, isTrue);

    await tester.tap(find.widgetWithText(FilledButton, 'Build plan'));
    await tester.pumpAndSettle();

    expect(find.text('oos p2'), findsOneWidget);
    expect(repo.docs['p2']!.outOfScope, isTrue);
  });
}
