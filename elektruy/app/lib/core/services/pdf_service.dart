import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../l10n/gen/app_localizations.dart';
import '../calc/calc.dart';
import '../content/content_models.dart';
import 'labels.dart';

/// Builds the printable plan: room, circuits, cable route, materials and diagrams.
class PdfService {
  pw.ThemeData? _theme;

  Future<pw.ThemeData> _loadTheme() async {
    if (_theme != null) return _theme!;
    final regular = pw.Font.ttf(await rootBundle.load('assets/fonts/NotoSans-Regular.ttf'));
    final bold = pw.Font.ttf(await rootBundle.load('assets/fonts/NotoSans-Bold.ttf'));
    return _theme = pw.ThemeData.withFont(base: regular, bold: bold);
  }

  Future<Uint8List> build({
    required AppLocalizations l,
    required String lang,
    required String title,
    required Plan plan,
    required List<MaterialLine> materials,
    required List<DiagramModel> diagrams,
    required ContentBundle content,
    required String currency,
    required double Function(double uzs) convert,
  }) async {
    final theme = await _loadTheme();
    final doc = pw.Document(title: title, author: 'ElektrUy', theme: theme);
    final colors = content.wireColors;
    PdfColor wire(String key, String fallback) => PdfColor.fromHex(colors[key] ?? fallback);
    final money = NumberFormat.decimalPattern(lang == 'en' ? 'en' : 'ru');
    String m2(double v) => v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1);
    final room = plan.room;
    final disclaimer = content.legalText('disclaimer_short', lang);

    pw.Widget heading(String t) => pw.Padding(
          padding: const pw.EdgeInsets.only(top: 14, bottom: 6),
          child: pw.Text(t, style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
        );

    doc.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(32),
      footer: (ctx) => pw.Column(children: [
        pw.Divider(color: PdfColors.grey400),
        pw.Text(disclaimer, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700)),
        pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text('${ctx.pageNumber}/${ctx.pagesCount}', style: const pw.TextStyle(fontSize: 8)),
        ),
      ]),
      build: (ctx) => [
        pw.Text(l.pdfTitle, style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
        pw.Text(title, style: const pw.TextStyle(fontSize: 13)),
        pw.Text(l.pdfGenerated(DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())),
            style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
        pw.Text(l.pdfRoom(room.length.toStringAsFixed(2), room.width.toStringAsFixed(2), room.height.toStringAsFixed(2))),
        pw.SizedBox(height: 10),
        _topView(plan, wire),
        heading(l.pdfCircuits),
        pw.TableHelper.fromTextArray(
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
          cellStyle: const pw.TextStyle(fontSize: 9),
          headers: ['', 'QF', 'mm²', 'W', 'A', 'ΔU %'],
          data: [
            for (final c in plan.circuits)
              [
                circuitLabel(l, c, content, lang),
                '${c.breakerA} A',
                m2(c.mm2),
                '${c.powerW.round()}',
                c.designCurrentA.toStringAsFixed(1),
                c.vdropPct.toStringAsFixed(2),
              ],
          ],
        ),
        if (plan.circuits.any((c) => c.needsPanelWork))
          pw.Padding(
            padding: const pw.EdgeInsets.only(top: 4),
            child: pw.Text(l.panelWorkNote, style: pw.TextStyle(color: PdfColors.red800, fontWeight: pw.FontWeight.bold)),
          ),
        heading(l.pdfCableRoute),
        pw.TableHelper.fromTextArray(
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
          cellStyle: const pw.TextStyle(fontSize: 9),
          headers: ['#', l.pdfItem, l.pdfQty],
          data: [
            for (final s in plan.segments)
              [
                s.id,
                l.segmentFromTo(deviceLabel(l, plan.device(s.fromId)), deviceLabel(l, plan.device(s.toId))),
                l.segmentLength(s.length.toStringAsFixed(2), cableName(s.cableKey, content, lang)),
              ],
          ],
        ),
        pw.Text(l.routeTotal(plan.totalRouteM.toStringAsFixed(1)), style: const pw.TextStyle(fontSize: 9)),
        pw.SizedBox(height: 4),
        pw.Text(l.routingRules, style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey800)),
        heading(l.pdfMaterials),
        pw.TableHelper.fromTextArray(
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9),
          cellStyle: const pw.TextStyle(fontSize: 9),
          cellAlignments: {2: pw.Alignment.centerRight, 3: pw.Alignment.centerRight, 4: pw.Alignment.centerRight},
          headers: [l.pdfItem, '', l.pdfQty, l.pdfPrice, l.pdfSum],
          data: [
            for (final line in materials.where((m) => !m.optional || m.included))
              [
                content.material(line.key)?.name(lang) ?? line.key,
                unitLabel(l, line.unit),
                m2(line.qty),
                money.format(convert(line.unitPrice).round()),
                line.optional ? '—' : money.format(convert(line.qty * line.unitPrice).round()),
              ],
          ],
        ),
        pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Padding(
            padding: const pw.EdgeInsets.only(top: 6),
            child: pw.Text('${l.materialsTotal}: ${money.format(convert(MaterialsCalculator.total(materials)).round())} $currency',
                style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
          ),
        ),
        heading(l.pdfDiagrams),
        pw.Text(l.diagramNote, style: const pw.TextStyle(fontSize: 8)),
        for (final d in diagrams) ...[
          pw.SizedBox(height: 8),
          pw.Text('${diagramTitle(l, d.kind)} — QF ${d.breakerA} A, ${m2(d.mm2)} mm²',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
          _diagram(d, wire),
        ],
      ],
    ));
    return doc.save();
  }

  PdfColor _roleColor(WireColor c, PdfColor Function(String, String) wire) => switch (c) {
        WireColor.phase => wire('phase', '#8B4513'),
        WireColor.switched => wire('phase_alt', '#D32F2F'),
        WireColor.neutral => wire('neutral', '#1E63D6'),
        WireColor.pe => wire('pe', '#9ACD32'),
        WireColor.traveller => wire('traveller', '#111111'),
        WireColor.ink => PdfColors.blueGrey900,
        WireColor.muted => PdfColors.blueGrey300,
      };

  /// Draws a [DiagramModel] scaled to the page width (PDF y axis points up).
  pw.Widget _diagram(DiagramModel d, PdfColor Function(String, String) wire) {
    const maxW = 531.0;
    final s = maxW / d.width;
    final h = d.height * s;
    final texts = d.prims.whereType<DText>().toList();
    return pw.SizedBox(
      width: maxW,
      height: h,
      child: pw.Stack(children: [
        pw.CustomPaint(
          size: PdfPoint(maxW, h),
          painter: (canvas, size) {
            double y(double v) => size.y - v * s;
            for (final p in d.prims) {
              switch (p) {
                case DLine():
                  canvas
                    ..setStrokeColor(_roleColor(p.color, wire))
                    ..setLineWidth(p.width * s)
                    ..setLineDashPattern(p.dashed ? [4, 3] : const []);
                  canvas
                    ..moveTo(p.x1 * s, y(p.y1))
                    ..lineTo(p.x2 * s, y(p.y2))
                    ..strokePath();
                  canvas.setLineDashPattern();
                case DRect():
                  canvas
                    ..setStrokeColor(_roleColor(p.color, wire))
                    ..setLineWidth(1.2)
                    ..setLineDashPattern(p.dashed ? [4, 3] : const [])
                    ..drawRect(p.x * s, y(p.y + p.h), p.w * s, p.h * s)
                    ..strokePath()
                    ..setLineDashPattern();
                case DCircle():
                  final col = _roleColor(p.color, wire);
                  canvas.drawEllipse(p.cx * s, y(p.cy), p.r * s, p.r * s);
                  if (p.filled) {
                    canvas
                      ..setFillColor(col)
                      ..fillPath();
                  } else {
                    canvas
                      ..setStrokeColor(col)
                      ..setLineWidth(1.2)
                      ..strokePath();
                  }
                  if (p.cross) {
                    final k = p.r * 0.7 * s;
                    canvas
                      ..moveTo(p.cx * s - k, y(p.cy) - k)
                      ..lineTo(p.cx * s + k, y(p.cy) + k)
                      ..moveTo(p.cx * s - k, y(p.cy) + k)
                      ..lineTo(p.cx * s + k, y(p.cy) - k)
                      ..strokePath();
                  }
                case DText():
                  break;
              }
            }
          },
        ),
        for (final t in texts)
          pw.Positioned(
            left: t.center ? t.x * s - 30 : t.x * s,
            top: t.y * s - t.size * s,
            child: pw.SizedBox(
              width: t.center ? 60 : null,
              child: pw.Text(
                t.text,
                textAlign: t.center ? pw.TextAlign.center : pw.TextAlign.left,
                style: pw.TextStyle(
                  fontSize: (t.size * s).clamp(5, 12).toDouble(),
                  color: _roleColor(t.color, wire),
                  fontWeight: t.bold ? pw.FontWeight.bold : pw.FontWeight.normal,
                ),
              ),
            ),
          ),
      ]),
    );
  }

  /// Top view: walls, cable routes projected onto the floor plan, devices.
  pw.Widget _topView(Plan plan, PdfColor Function(String, String) wire) {
    final room = plan.room;
    const maxW = 531.0, maxH = 260.0, pad = 18.0;
    final s = [(maxW - 2 * pad) / room.length, (maxH - 2 * pad) / room.width].reduce((a, b) => a < b ? a : b);
    final w = room.length * s + 2 * pad, h = room.width * s + 2 * pad;
    return pw.Center(
      child: pw.Stack(children: [
        pw.CustomPaint(
          size: PdfPoint(w, h),
          painter: (canvas, size) {
            double px(double x) => pad + x * s;
            double py(double y) => pad + y * s; // room y=0 (wall A) at the bottom of the page
            canvas
              ..setStrokeColor(PdfColors.blueGrey700)
              ..setLineWidth(2.5)
              ..drawRect(px(0), py(0), room.length * s, room.width * s)
              ..strokePath();
            for (final seg in plan.segments) {
              final col = seg.purpose == SegmentPurpose.lamp || seg.purpose == SegmentPurpose.switchDrop
                  ? wire('phase_alt', '#D32F2F')
                  : wire('phase', '#8B4513');
              canvas
                ..setStrokeColor(col)
                ..setLineWidth(1.4);
              for (var i = 0; i < seg.points.length; i++) {
                final p = seg.points[i];
                if (i == 0) {
                  canvas.moveTo(px(p.x), py(p.y));
                } else {
                  canvas.lineTo(px(p.x), py(p.y));
                }
              }
              canvas.strokePath();
            }
            for (final d in plan.devices) {
              final p = d.position(room);
              final col = switch (d.type) {
                DeviceType.socket => PdfColors.blue700,
                DeviceType.lamp => PdfColors.amber700,
                DeviceType.input => PdfColors.orange800,
                DeviceType.junctionBox => PdfColors.grey700,
                _ => PdfColors.green700,
              };
              canvas
                ..setFillColor(col)
                ..drawEllipse(px(p.x), py(p.y), 4.5, 4.5)
                ..fillPath();
            }
          },
        ),
        for (final (wall, x, y) in [
          (Wall.a, w / 2, h - 14.0),
          (Wall.b, w - 14.0, h / 2),
          (Wall.c, w / 2, 2.0),
          (Wall.d, 4.0, h / 2),
        ])
          pw.Positioned(
            left: x - 4,
            top: y - 6,
            child: pw.Text(wall.label, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.blue800, fontSize: 10)),
          ),
      ]),
    );
  }
}
