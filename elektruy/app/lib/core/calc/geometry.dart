import 'dart:math' as math;

/// A point in room coordinates (metres). Origin is the floor corner where wall A
/// starts; x runs along wall A (room length), y along wall B (room width), z up.
class Vec3 {
  const Vec3(this.x, this.y, this.z);

  final double x;
  final double y;
  final double z;

  double distanceTo(Vec3 o) =>
      math.sqrt((x - o.x) * (x - o.x) + (y - o.y) * (y - o.y) + (z - o.z) * (z - o.z));

  /// Manhattan distance: the length of a route that only runs parallel to the axes.
  double manhattanTo(Vec3 o) => (x - o.x).abs() + (y - o.y).abs() + (z - o.z).abs();

  Vec3 withZ(double nz) => Vec3(x, y, nz);

  List<double> toList() => [_r(x), _r(y), _r(z)];

  factory Vec3.fromList(List<dynamic> l) =>
      Vec3((l[0] as num).toDouble(), (l[1] as num).toDouble(), (l[2] as num).toDouble());

  static double _r(double v) => (v * 1000).roundToDouble() / 1000;

  @override
  bool operator ==(Object other) =>
      other is Vec3 && (x - other.x).abs() < 1e-9 && (y - other.y).abs() < 1e-9 && (z - other.z).abs() < 1e-9;

  @override
  int get hashCode => Object.hash(x.toStringAsFixed(6), y.toStringAsFixed(6), z.toStringAsFixed(6));

  @override
  String toString() => 'Vec3(${x.toStringAsFixed(3)}, ${y.toStringAsFixed(3)}, ${z.toStringAsFixed(3)})';
}

/// The four walls, walked counter-clockwise when seen from above:
/// A: y = 0 (x 0→L), B: x = L (y 0→W), C: y = W (x L→0), D: x = 0 (y W→0).
enum Wall {
  a,
  b,
  c,
  d;

  String get label => name.toUpperCase();

  static Wall parse(String s) => Wall.values.firstWhere((w) => w.name == s.toLowerCase(), orElse: () => Wall.a);
}

/// Box-shaped room. `u` is a position along a wall measured from the wall's
/// start corner in the walking direction; `s` is the same position measured
/// along the whole perimeter starting at the corner where wall A begins.
class RoomGeometry {
  RoomGeometry({required this.length, required this.width, required this.height}) {
    if (length <= 0 || width <= 0 || height <= 0) {
      throw ArgumentError('Room dimensions must be positive');
    }
  }

  final double length;
  final double width;
  final double height;

  double get perimeter => 2 * (length + width);
  double get floorArea => length * width;

  double wallLength(Wall w) => (w == Wall.a || w == Wall.c) ? length : width;

  /// Perimeter position where wall [w] starts.
  double wallStartS(Wall w) => switch (w) {
        Wall.a => 0,
        Wall.b => length,
        Wall.c => length + width,
        Wall.d => 2 * length + width,
      };

  double toS(Wall w, double u) => wallStartS(w) + u.clamp(0, wallLength(w));

  /// Wall and offset for a perimeter position (wraps around).
  (Wall, double) fromS(double s) {
    var t = s % perimeter;
    if (t < 0) t += perimeter;
    for (final w in Wall.values) {
      final len = wallLength(w);
      if (t <= len + 1e-9) return (w, t.clamp(0, len).toDouble());
      t -= len;
    }
    return (Wall.d, wallLength(Wall.d));
  }

  Vec3 wallPoint(Wall w, double u, double z) {
    final uu = u.clamp(0, wallLength(w)).toDouble();
    return switch (w) {
      Wall.a => Vec3(uu, 0, z),
      Wall.b => Vec3(length, uu, z),
      Wall.c => Vec3(length - uu, width, z),
      Wall.d => Vec3(0, width - uu, z),
    };
  }

  /// Corner perimeter positions: 0 (A/D), L (A/B), L+W (B/C), 2L+W (C/D).
  List<double> get cornerS => [0, length, length + width, 2 * length + width];

  /// Shortest walk along the walls between two perimeter positions. Returns the
  /// distance and the list of corner positions passed (in walking order).
  ({double distance, List<double> corners, int direction}) perimeterWalk(double s1, double s2) {
    final p = perimeter;
    final a = ((s1 % p) + p) % p;
    final b = ((s2 % p) + p) % p;
    final forward = ((b - a) % p + p) % p;
    final backward = p - forward;
    if (forward <= backward) {
      final corners = <double>[];
      for (final c in cornerS) {
        final rel = ((c - a) % p + p) % p;
        if (rel > 1e-9 && rel < forward - 1e-9) corners.add(c);
      }
      corners.sort((x, y) => (((x - a) % p + p) % p).compareTo(((y - a) % p + p) % p));
      return (distance: forward, corners: corners, direction: 1);
    } else {
      final corners = <double>[];
      for (final c in cornerS) {
        final rel = ((a - c) % p + p) % p;
        if (rel > 1e-9 && rel < backward - 1e-9) corners.add(c);
      }
      corners.sort((x, y) => (((a - x) % p + p) % p).compareTo(((a - y) % p + p) % p));
      return (distance: backward, corners: corners, direction: -1);
    }
  }

  /// Point on the floor plan for a perimeter position.
  Vec3 sPoint(double s, double z) {
    final (w, u) = fromS(s);
    return wallPoint(w, u, z);
  }

  /// Nearest wall to a ceiling point and the offset `u` of its foot on that wall.
  (Wall, double) nearestWall(double x, double y) {
    final candidates = <(Wall, double, double)>[
      (Wall.a, y, x),
      (Wall.b, length - x, y),
      (Wall.c, width - y, length - x),
      (Wall.d, x, width - y),
    ];
    candidates.sort((p, q) => p.$2.compareTo(q.$2));
    return (candidates.first.$1, candidates.first.$3);
  }
}
