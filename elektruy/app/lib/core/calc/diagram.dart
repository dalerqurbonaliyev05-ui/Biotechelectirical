import 'models.dart';
import 'planner.dart';

/// Wire colour roles; renderers map them to colours from the `wire_colors` config
/// (phase brown/red, neutral blue, protective earth yellow-green).
enum WireColor { phase, switched, neutral, pe, traveller, ink, muted }

sealed class DPrim {
  const DPrim();
}

class DLine extends DPrim {
  const DLine(this.x1, this.y1, this.x2, this.y2, this.color, {this.width = 3, this.dashed = false});
  final double x1, y1, x2, y2;
  final WireColor color;
  final double width;
  final bool dashed;
}

class DRect extends DPrim {
  const DRect(this.x, this.y, this.w, this.h, {this.color = WireColor.ink, this.dashed = false});
  final double x, y, w, h;
  final WireColor color;
  final bool dashed;
}

class DCircle extends DPrim {
  const DCircle(this.cx, this.cy, this.r, {this.color = WireColor.ink, this.cross = false, this.filled = false});
  final double cx, cy, r;
  final WireColor color;
  final bool cross;
  final bool filled;
}

class DText extends DPrim {
  const DText(this.x, this.y, this.text, {this.size = 14, this.color = WireColor.ink, this.center = false, this.bold = false});
  final double x, y;
  final String text;
  final double size;
  final WireColor color;
  final bool center;
  final bool bold;
}

enum DiagramKind { switchSingle, switchDouble, switchPass, sockets, dedicated }

class DiagramModel {
  const DiagramModel({
    required this.kind,
    required this.width,
    required this.height,
    required this.prims,
    required this.breakerA,
    required this.mm2,
    this.circuitId,
    this.count = 1,
  });

  final DiagramKind kind;
  final double width;
  final double height;
  final List<DPrim> prims;
  final int breakerA;
  final double mm2;
  final String? circuitId;

  /// Lamps or sockets drawn.
  final int count;
}

const double _yL = 70, _yN = 230, _yPE = 262;

/// Builds one schematic per switch (with the lamps it controls) and one per socket circuit.
class DiagramBuilder {
  const DiagramBuilder();

  List<DiagramModel> build(Plan plan, {required bool hasPe}) {
    final out = <DiagramModel>[];
    final lighting = plan.circuits.where((c) => c.kind == CircuitKind.lighting).toList();
    if (lighting.isNotEmpty) {
      final circuit = lighting.first;
      final lamps = plan.ofType(DeviceType.lamp).toList();
      final passIds = plan.ofType(DeviceType.switchPass).map((d) => d.id).toList();
      final handled = <String>{};
      for (final sw in plan.devices.where((d) => d.type.isSwitch)) {
        if (handled.contains(sw.id)) continue;
        final mine = lamps.where((l) => l.switchId == sw.id).toList();
        if (sw.type == DeviceType.switchPass) {
          final i = passIds.indexOf(sw.id);
          final partner = i.isEven && i + 1 < passIds.length ? passIds[i + 1] : null;
          handled.add(sw.id);
          if (partner != null) {
            handled.add(partner);
            out.add(_pass(circuit, mine.length, hasPe));
            continue;
          }
        }
        handled.add(sw.id);
        if (mine.isEmpty) continue;
        out.add(sw.type == DeviceType.switchDouble
            ? _double(circuit, mine.where((l) => l.lampGroup != 1).length, mine.where((l) => l.lampGroup != 0).length, hasPe)
            : _single(circuit, mine.length, hasPe));
      }
    }
    for (final c in plan.circuits.where((c) => c.kind != CircuitKind.lighting)) {
      out.add(_sockets(c, hasPe));
    }
    return out;
  }

  // ---------------------------------------------------------------- shared pieces
  void _supply(List<DPrim> p, int breakerA, double endX, bool hasPe) {
    p.add(const DText(10, 30, 'L', bold: true, color: WireColor.phase));
    p.add(const DText(10, _yN - 10, 'N', bold: true, color: WireColor.neutral));
    if (hasPe) p.add(const DText(10, _yPE - 10, 'PE', bold: true, color: WireColor.pe));
    p.add(const DRect(40, _yL - 22, 70, 44));
    p.add(DText(75, _yL - 28, 'QF ${breakerA}A', center: true, bold: true));
    p.add(const DLine(10, _yL, 40, _yL, WireColor.phase));
    p.add(const DLine(56, _yL + 16, 94, _yL - 16, WireColor.ink, width: 2));
    p.add(DLine(110, _yL, 170, _yL, WireColor.phase));
    p.add(DLine(10, _yN, endX, _yN, WireColor.neutral));
    if (hasPe) p.add(DLine(10, _yPE, endX, _yPE, WireColor.pe, dashed: true));
  }

  void _junctionBox(List<DPrim> p, double x, double w) {
    p.add(DRect(x, 20, w, 270, color: WireColor.muted, dashed: true));
    p.add(DText(x + 6, 36, 'JB', size: 12, color: WireColor.muted));
  }

  /// Lamp symbol (circle with a cross) hanging between [yTop] and the neutral bus.
  void _lamp(List<DPrim> p, double x, double yTop, WireColor feed, bool hasPe, String label) {
    const cy = 165.0;
    p.add(DLine(x, yTop, x, cy - 18, feed));
    p.add(DCircle(x, cy, 18, cross: true));
    p.add(DLine(x, cy + 18, x, _yN, WireColor.neutral));
    p.add(DCircle(x, _yN, 4, color: WireColor.neutral, filled: true));
    if (hasPe) {
      p.add(DLine(x + 14, cy + 12, x + 14, _yPE, WireColor.pe, dashed: true));
      p.add(DCircle(x + 14, _yPE, 4, color: WireColor.pe, filled: true));
    }
    p.add(DText(x, cy + 50, label, size: 12, center: true));
  }

  /// Switch contact drawn as an angled blade between two terminals.
  void _contact(List<DPrim> p, double x, double y, String inLabel, String outLabel) {
    p.add(DCircle(x, y, 4, filled: true));
    p.add(DLine(x, y, x + 36, y - 18, WireColor.ink, width: 2));
    p.add(DCircle(x + 44, y, 4, filled: true));
    p.add(DText(x - 4, y + 22, inLabel, size: 11, center: true));
    p.add(DText(x + 44, y + 22, outLabel, size: 11, center: true));
  }

  // ---------------------------------------------------------------- diagrams
  DiagramModel _single(Circuit c, int lamps, bool hasPe) {
    final p = <DPrim>[];
    final n = lamps.clamp(1, 4);
    final width = 520.0 + 110 * n;
    _supply(p, c.breakerA, width - 30, hasPe);
    _junctionBox(p, 180, width - 210);
    p.add(const DLine(170, _yL, 260, _yL, WireColor.phase));
    _contact(p, 260, _yL, 'L', 'L1');
    p.add(DText(282, _yL - 34, 'S1', center: true, bold: true));
    p.add(DLine(304, _yL, width - 60, _yL, WireColor.switched));
    for (var i = 0; i < n; i++) {
      final x = 420.0 + 110 * i;
      p.add(DCircle(x, _yL, 4, color: WireColor.switched, filled: true));
      _lamp(p, x, _yL, WireColor.switched, hasPe, 'H${i + 1}');
    }
    return DiagramModel(kind: DiagramKind.switchSingle, width: width, height: 330, prims: p, breakerA: c.breakerA, mm2: c.mm2, circuitId: c.id, count: lamps);
  }

  DiagramModel _double(Circuit c, int group1, int group2, bool hasPe) {
    final p = <DPrim>[];
    final g1 = group1.clamp(1, 3);
    final g2 = group2.clamp(1, 3);
    final width = 560.0 + 110 * (g1 + g2);
    _supply(p, c.breakerA, width - 30, hasPe);
    _junctionBox(p, 180, width - 210);
    p.add(const DLine(170, _yL, 250, _yL, WireColor.phase));
    p.add(const DLine(250, _yL, 250, _yL + 40, WireColor.phase));
    _contact(p, 250, _yL, 'L', 'L1');
    _contact(p, 250, _yL + 40, '', 'L2');
    p.add(DText(272, _yL - 34, 'S1', center: true, bold: true));
    p.add(DLine(294, _yL, width - 60, _yL, WireColor.switched));
    p.add(DLine(294, _yL + 40, width - 60, _yL + 40, WireColor.phase));
    var x = 420.0;
    for (var i = 0; i < g1; i++, x += 110) {
      p.add(DCircle(x, _yL, 4, color: WireColor.switched, filled: true));
      _lamp(p, x, _yL, WireColor.switched, hasPe, 'H1.${i + 1}');
    }
    for (var i = 0; i < g2; i++, x += 110) {
      p.add(DCircle(x, _yL + 40, 4, color: WireColor.phase, filled: true));
      _lamp(p, x, _yL + 40, WireColor.phase, hasPe, 'H2.${i + 1}');
    }
    return DiagramModel(kind: DiagramKind.switchDouble, width: width, height: 330, prims: p, breakerA: c.breakerA, mm2: c.mm2, circuitId: c.id, count: g1 + g2);
  }

  DiagramModel _pass(Circuit c, int lamps, bool hasPe) {
    final p = <DPrim>[];
    final n = lamps.clamp(1, 3);
    final width = 700.0 + 110 * n;
    _supply(p, c.breakerA, width - 30, hasPe);
    _junctionBox(p, 180, width - 210);
    p.add(const DLine(170, _yL + 20, 240, _yL + 20, WireColor.phase));
    // Switch 1: COM -> L1 / L2
    p.add(const DCircle(240, _yL + 20, 4, filled: true));
    p.add(const DLine(240, _yL + 20, 276, _yL + 2, WireColor.ink, width: 2));
    p.add(const DCircle(284, _yL, 4, filled: true));
    p.add(const DCircle(284, _yL + 40, 4, filled: true));
    p.add(const DText(236, _yL + 44, 'COM', size: 11, center: true));
    p.add(const DText(272, _yL - 34, 'S1', center: true, bold: true));
    // Travellers
    p.add(const DLine(284, _yL, 430, _yL, WireColor.traveller));
    p.add(const DLine(284, _yL + 40, 430, _yL + 40, WireColor.traveller));
    p.add(const DText(357, _yL - 8, 'L1', size: 11, center: true));
    p.add(const DText(357, _yL + 32, 'L2', size: 11, center: true));
    // Switch 2: L1 / L2 -> COM
    p.add(const DCircle(430, _yL, 4, filled: true));
    p.add(const DCircle(430, _yL + 40, 4, filled: true));
    p.add(const DLine(474, _yL + 20, 438, _yL + 2, WireColor.ink, width: 2));
    p.add(const DCircle(474, _yL + 20, 4, filled: true));
    p.add(const DText(478, _yL + 44, 'COM', size: 11, center: true));
    p.add(const DText(452, _yL - 34, 'S2', center: true, bold: true));
    p.add(DLine(474, _yL + 20, width - 60, _yL + 20, WireColor.switched));
    for (var i = 0; i < n; i++) {
      final x = 580.0 + 110 * i;
      p.add(DCircle(x, _yL + 20, 4, color: WireColor.switched, filled: true));
      _lamp(p, x, _yL + 20, WireColor.switched, hasPe, 'H${i + 1}');
    }
    return DiagramModel(kind: DiagramKind.switchPass, width: width, height: 330, prims: p, breakerA: c.breakerA, mm2: c.mm2, circuitId: c.id, count: lamps);
  }

  DiagramModel _sockets(Circuit c, bool hasPe) {
    final p = <DPrim>[];
    final n = c.deviceIds.length.clamp(1, 6);
    final width = 300.0 + 120 * n;
    _supply(p, c.breakerA, width - 30, hasPe);
    p.add(DLine(170, _yL, width - 60, _yL, WireColor.phase));
    for (var i = 0; i < n; i++) {
      final x = 240.0 + 120 * i;
      p.add(DRect(x - 30, 130, 60, 60));
      p.add(DCircle(x - 12, 160, 5));
      p.add(DCircle(x + 12, 160, 5));
      p.add(DLine(x - 12, _yL, x - 12, 130, WireColor.phase));
      p.add(DCircle(x - 12, _yL, 4, color: WireColor.phase, filled: true));
      p.add(DLine(x + 12, 190, x + 12, _yN, WireColor.neutral));
      p.add(DCircle(x + 12, _yN, 4, color: WireColor.neutral, filled: true));
      if (hasPe) {
        p.add(DLine(x, 190, x, _yPE, WireColor.pe, dashed: true));
        p.add(DCircle(x, _yPE, 4, color: WireColor.pe, filled: true));
      }
      p.add(DText(x, 122, 'XS${i + 1}', size: 12, center: true));
    }
    return DiagramModel(
      kind: c.kind == CircuitKind.dedicated ? DiagramKind.dedicated : DiagramKind.sockets,
      width: width,
      height: 330,
      prims: p,
      breakerA: c.breakerA,
      mm2: c.mm2,
      circuitId: c.id,
      count: c.deviceIds.length,
    );
  }
}
