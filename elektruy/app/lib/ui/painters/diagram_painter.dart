import 'package:flutter/material.dart';

import '../../core/calc/diagram.dart';
import 'plan_painter.dart';

/// Renders a [DiagramModel] (the same primitives the PDF export draws).
class DiagramPainter extends CustomPainter {
  DiagramPainter(this.model, {required this.colors, required this.dark});

  final DiagramModel model;
  final Map<String, String> colors;
  final bool dark;

  Color _c(WireColor c) => switch (c) {
        WireColor.phase => hexColor(colors['phase'], const Color(0xFF8B4513)),
        WireColor.switched => hexColor(colors['phase_alt'], const Color(0xFFD32F2F)),
        WireColor.neutral => hexColor(colors['neutral'], const Color(0xFF1E63D6)),
        WireColor.pe => hexColor(colors['pe'], const Color(0xFF9ACD32)),
        WireColor.traveller => dark ? Colors.white : hexColor(colors['traveller'], const Color(0xFF111111)),
        WireColor.ink => dark ? Colors.white : const Color(0xFF263238),
        WireColor.muted => dark ? Colors.white38 : const Color(0xFF90A4AE),
      };

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / model.width;
    canvas.scale(s);
    for (final p in model.prims) {
      switch (p) {
        case DLine():
          final paint = Paint()
            ..color = _c(p.color)
            ..strokeWidth = p.width
            ..strokeCap = StrokeCap.round;
          if (p.dashed) {
            _dashed(canvas, Offset(p.x1, p.y1), Offset(p.x2, p.y2), paint);
            if (p.color == WireColor.pe) {
              _dashed(canvas, Offset(p.x1, p.y1), Offset(p.x2, p.y2), paint..color = hexColor(colors['pe_stripe'], const Color(0xFFF2C200)), phase: 6);
            }
          } else {
            canvas.drawLine(Offset(p.x1, p.y1), Offset(p.x2, p.y2), paint);
          }
        case DRect():
          final paint = Paint()
            ..color = _c(p.color)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.5;
          final r = Rect.fromLTWH(p.x, p.y, p.w, p.h);
          if (p.dashed) {
            for (final (a, b) in [(r.topLeft, r.topRight), (r.topRight, r.bottomRight), (r.bottomRight, r.bottomLeft), (r.bottomLeft, r.topLeft)]) {
              _dashed(canvas, a, b, paint);
            }
          } else {
            canvas.drawRect(r, paint);
          }
        case DCircle():
          final paint = Paint()
            ..color = _c(p.color)
            ..style = p.filled ? PaintingStyle.fill : PaintingStyle.stroke
            ..strokeWidth = 2;
          if (!p.filled && p.cross) canvas.drawCircle(Offset(p.cx, p.cy), p.r, Paint()..color = const Color(0xFFFFF8E1));
          canvas.drawCircle(Offset(p.cx, p.cy), p.r, paint);
          if (p.cross) {
            final k = p.r * 0.7;
            canvas
              ..drawLine(Offset(p.cx - k, p.cy - k), Offset(p.cx + k, p.cy + k), paint)
              ..drawLine(Offset(p.cx - k, p.cy + k), Offset(p.cx + k, p.cy - k), paint);
          }
        case DText():
          final tp = TextPainter(
            text: TextSpan(
              text: p.text,
              style: TextStyle(color: _c(p.color), fontSize: p.size, fontWeight: p.bold ? FontWeight.w700 : FontWeight.w400),
            ),
            textDirection: TextDirection.ltr,
          )..layout();
          tp.paint(canvas, Offset(p.center ? p.x - tp.width / 2 : p.x, p.y - tp.height + 2));
      }
    }
  }

  void _dashed(Canvas canvas, Offset a, Offset b, Paint paint, {double dash = 6, double gap = 6, double phase = 0}) {
    final total = (b - a).distance;
    if (total == 0) return;
    final dir = (b - a) / total;
    var d = phase;
    while (d < total) {
      final e = (d + dash).clamp(0, total).toDouble();
      canvas.drawLine(a + dir * d, a + dir * e, paint);
      d += dash + gap;
    }
  }

  @override
  bool shouldRepaint(covariant DiagramPainter old) => old.model != model || old.dark != dark;
}
