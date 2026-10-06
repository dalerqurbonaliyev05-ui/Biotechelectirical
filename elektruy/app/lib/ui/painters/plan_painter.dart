import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/calc/calc.dart';

Color hexColor(String? hex, Color fallback) {
  if (hex == null) return fallback;
  final h = hex.replaceAll('#', '');
  final v = int.tryParse(h.length == 6 ? 'FF$h' : h, radix: 16);
  return v == null ? fallback : Color(v);
}

Color deviceColor(DeviceType t) => switch (t) {
      DeviceType.socket => const Color(0xFF1565C0),
      DeviceType.lamp => const Color(0xFFF9A825),
      DeviceType.input => const Color(0xFFEF6C00),
      DeviceType.junctionBox => const Color(0xFF616161),
      _ => const Color(0xFF2E7D32),
    };

/// Maps room metres to canvas pixels for the top view (wall A at the bottom).
class PlanTransform {
  PlanTransform(this.room, Size size, {this.pad = 28}) {
    scale = math.min((size.width - 2 * pad) / room.length, (size.height - 2 * pad) / room.width);
    ox = (size.width - room.length * scale) / 2;
    oy = (size.height - room.width * scale) / 2;
  }

  final RoomGeometry room;
  final double pad;
  late final double scale, ox, oy;

  Offset toCanvas(double x, double y) => Offset(ox + x * scale, oy + (room.width - y) * scale);

  (double, double) toRoom(Offset p) => ((p.dx - ox) / scale, room.width - (p.dy - oy) / scale);
}

/// Top-down floor plan: walls with labels, cable routes and devices.
class PlanPainter extends CustomPainter {
  PlanPainter({
    required this.plan,
    required this.colors,
    required this.dark,
    this.highlight,
    this.labels = const {},
  });

  final Plan plan;
  final Map<String, String> colors;
  final bool dark;
  final String? highlight;
  final Map<String, String> labels;

  @override
  void paint(Canvas canvas, Size size) {
    final room = plan.room;
    final t = PlanTransform(room, size);
    final ink = dark ? Colors.white70 : const Color(0xFF37474F);
    final rect = Rect.fromPoints(t.toCanvas(0, 0), t.toCanvas(room.length, room.width));
    canvas.drawRect(rect, Paint()..color = dark ? const Color(0xFF263238) : const Color(0xFFF5F5F5));
    canvas.drawRect(rect, Paint()
      ..color = ink
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5);

    // Wall labels outside the walls.
    void label(String text, Offset at) {
      final tp = TextPainter(
        text: TextSpan(text: text, style: TextStyle(color: const Color(0xFF1565C0), fontWeight: FontWeight.w800, fontSize: 16)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, at - Offset(tp.width / 2, tp.height / 2));
    }

    label(labels['a'] ?? 'A', t.toCanvas(room.length / 2, 0) + const Offset(0, 16));
    label(labels['b'] ?? 'B', t.toCanvas(room.length, room.width / 2) + const Offset(16, 0));
    label(labels['c'] ?? 'C', t.toCanvas(room.length / 2, room.width) - const Offset(0, 16));
    label(labels['d'] ?? 'D', t.toCanvas(0, room.width / 2) - const Offset(16, 0));

    final phase = hexColor(colors['phase'], const Color(0xFF8B4513));
    final switched = hexColor(colors['phase_alt'], const Color(0xFFD32F2F));
    for (final seg in plan.segments) {
      final c = seg.purpose == SegmentPurpose.lamp || seg.purpose == SegmentPurpose.switchDrop ? switched : phase;
      final path = Path();
      for (var i = 0; i < seg.points.length; i++) {
        final p = t.toCanvas(seg.points[i].x, seg.points[i].y);
        if (i == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          path.lineTo(p.dx, p.dy);
        }
      }
      canvas.drawPath(path, Paint()
        ..color = c.withValues(alpha: 0.85)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeJoin = StrokeJoin.round);
    }

    for (final d in plan.devices) {
      final pos = d.position(room);
      final p = t.toCanvas(pos.x, pos.y);
      final r = d.id == highlight ? 15.0 : 11.0;
      canvas.drawCircle(p, r + 2, Paint()..color = Colors.white);
      canvas.drawCircle(p, r, Paint()..color = deviceColor(d.type));
      final glyph = switch (d.type) {
        DeviceType.socket => 'R',
        DeviceType.lamp => 'H',
        DeviceType.input => '⚡',
        DeviceType.junctionBox => 'J',
        DeviceType.switchDouble => 'S2',
        DeviceType.switchPass => 'SP',
        DeviceType.switchSingle => 'S',
      };
      final tp = TextPainter(
        text: TextSpan(text: glyph, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, p - Offset(tp.width / 2, tp.height / 2));
    }

    // Dimension text.
    final dim = TextPainter(
      text: TextSpan(
        text: '${room.length.toStringAsFixed(2)} × ${room.width.toStringAsFixed(2)} m',
        style: TextStyle(color: ink, fontSize: 12),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    dim.paint(canvas, Offset(size.width - dim.width - 6, size.height - dim.height - 2));
  }

  @override
  bool shouldRepaint(covariant PlanPainter old) => old.plan != plan || old.highlight != highlight || old.dark != dark;
}

/// Four wall elevations side by side (A, B, C, D): devices and the cable runs on each wall.
class ElevationPainter extends CustomPainter {
  ElevationPainter({required this.plan, required this.colors, required this.dark});

  final Plan plan;
  final Map<String, String> colors;
  final bool dark;

  static double widthFor(RoomGeometry room, double height) {
    final s = (height - 40) / room.height;
    return 2 * (room.length + room.width) * s + 5 * 16;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final room = plan.room;
    final s = (size.height - 40) / room.height;
    final ink = dark ? Colors.white70 : const Color(0xFF37474F);
    final phase = hexColor(colors['phase'], const Color(0xFF8B4513));
    final switched = hexColor(colors['phase_alt'], const Color(0xFFD32F2F));
    var x0 = 16.0;
    for (final w in Wall.values) {
      final len = room.wallLength(w);
      final rect = Rect.fromLTWH(x0, 20, len * s, room.height * s);
      canvas.drawRect(rect, Paint()..color = dark ? const Color(0xFF263238) : const Color(0xFFFAFAFA));
      canvas.drawRect(rect, Paint()
        ..color = ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2);
      // Ceiling band guide.
      final bandY = 20 + 0.15 * s;
      canvas.drawLine(Offset(rect.left, bandY), Offset(rect.right, bandY), Paint()
        ..color = ink.withValues(alpha: 0.3)
        ..strokeWidth = 1);
      final tp = TextPainter(
        text: TextSpan(text: w.label, style: const TextStyle(color: Color(0xFF1565C0), fontWeight: FontWeight.w800, fontSize: 15)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(rect.center.dx - tp.width / 2, 0));

      Offset toWall(Vec3 p) {
        // Wall-local u from the 3D point (inverse of RoomGeometry.wallPoint).
        final u = switch (w) {
          Wall.a => p.x,
          Wall.b => p.y,
          Wall.c => room.length - p.x,
          Wall.d => room.width - p.y,
        };
        return Offset(x0 + u * s, 20 + (room.height - p.z) * s);
      }

      bool onWall(Vec3 p) => switch (w) {
            Wall.a => p.y.abs() < 1e-6,
            Wall.b => (p.x - room.length).abs() < 1e-6,
            Wall.c => (p.y - room.width).abs() < 1e-6,
            Wall.d => p.x.abs() < 1e-6,
          };

      for (final seg in plan.segments) {
        final c = seg.purpose == SegmentPurpose.lamp || seg.purpose == SegmentPurpose.switchDrop ? switched : phase;
        for (var i = 1; i < seg.points.length; i++) {
          final a = seg.points[i - 1], b = seg.points[i];
          if (onWall(a) && onWall(b)) {
            canvas.drawLine(toWall(a), toWall(b), Paint()
              ..color = c
              ..strokeWidth = 3);
          }
        }
      }
      for (final d in plan.devices.where((d) => d.wall == w && !d.onCeiling)) {
        final p = toWall(d.position(room));
        canvas.drawRect(Rect.fromCenter(center: p, width: 14, height: 14), Paint()..color = deviceColor(d.type));
      }
      x0 += len * s + 16;
    }
  }

  @override
  bool shouldRepaint(covariant ElevationPainter old) => old.plan != plan || old.dark != dark;
}
