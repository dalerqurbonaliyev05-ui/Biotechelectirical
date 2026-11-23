import 'dart:io';

import 'package:elektruy/ui/screens/start/consent_screen.dart';
import 'package:elektruy/ui/theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'test_app.dart';

void main() {
  // Real glyph widths matter here: the default test font draws every letter as a wide square.
  setUpAll(() async {
    final loader = FontLoader('NotoSans');
    for (final f in ['assets/fonts/NotoSans-Regular.ttf', 'assets/fonts/NotoSans-Bold.ttf']) {
      loader.addFont(Future.value(ByteData.sublistView(File(f).readAsBytesSync())));
    }
    await loader.load();
  });

  for (final lang in ['ru', 'uz', 'en']) {
    testWidgets('consent checkboxes keep readable text on a phone ($lang)', (tester) async {
      tester.view.physicalSize = const Size(1080, 2280);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await pumpTestApp(tester, initial: '/c', routes: {'/c': (_) => const ConsentBody(firstTime: true)}, locale: lang, theme: AppTheme.light());

      for (final tile in tester.widgetList<CheckboxListTile>(find.byType(CheckboxListTile))) {
        final title = find.descendant(of: find.byWidget(tile), matching: find.byWidget(tile.title!));
        expect(tester.getSize(title).width, greaterThan(200), reason: 'checkbox text must not be squeezed');
      }
      expect(tester.takeException(), isNull);
    });
  }
}
