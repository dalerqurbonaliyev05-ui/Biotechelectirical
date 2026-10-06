import 'package:elektruy/core/calc/calc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final room = RoomGeometry(length: 4, width: 3, height: 2.7);

  test('perimeter and wall lengths', () {
    expect(room.perimeter, 14);
    expect(room.wallLength(Wall.a), 4);
    expect(room.wallLength(Wall.b), 3);
    expect(room.floorArea, 12);
  });

  test('wall points walk counter-clockwise', () {
    expect(room.wallPoint(Wall.a, 1, 0), const Vec3(1, 0, 0));
    expect(room.wallPoint(Wall.b, 1, 0), const Vec3(4, 1, 0));
    expect(room.wallPoint(Wall.c, 1, 0), const Vec3(3, 3, 0));
    expect(room.wallPoint(Wall.d, 1, 0), const Vec3(0, 2, 0));
  });

  test('toS / fromS round trip', () {
    for (final w in Wall.values) {
      final s = room.toS(w, 0.7);
      final (w2, u2) = room.fromS(s);
      expect(room.wallPoint(w2, u2, 0), room.wallPoint(w, 0.7, 0));
    }
    expect(room.fromS(-1).$1, Wall.d); // wraps
  });

  test('perimeter walk takes the shorter way and lists corners', () {
    // From A@1 (s=1) to D@2 (s=13): backwards is 2 m through corner s=0.
    final w = room.perimeterWalk(room.toS(Wall.a, 1), room.toS(Wall.d, 2));
    expect(w.distance, closeTo(2, 1e-9));
    expect(w.direction, -1);
    expect(w.corners, [0]);
    // From A@1 to C@1 (s=8): forward 7 m through corners 4 and 7.
    final f = room.perimeterWalk(1, 8);
    expect(f.distance, closeTo(7, 1e-9));
    expect(f.corners, [4, 7]);
  });

  test('nearest wall to a ceiling point', () {
    expect(room.nearestWall(2, 0.5), (Wall.a, 2.0));
    expect(room.nearestWall(3.8, 1.5).$1, Wall.b);
    expect(room.nearestWall(2, 2.9).$1, Wall.c);
    expect(room.nearestWall(0.2, 1.5).$1, Wall.d);
  });

  test('invalid dimensions throw', () {
    expect(() => RoomGeometry(length: 0, width: 3, height: 2.7), throwsArgumentError);
  });

  test('manhattan distance', () {
    expect(const Vec3(0, 0, 0).manhattanTo(const Vec3(1, 2, 3)), 6);
  });
}
