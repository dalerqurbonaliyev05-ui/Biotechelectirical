import 'dart:math' as math;

import 'calc_config.dart';
import 'electrical.dart';
import 'geometry.dart';
import 'models.dart';

enum CircuitKind { lighting, sockets, dedicated }

enum SegmentPurpose { feed, switchDrop, lamp, socketHop, dedicated }

/// One cable run between two devices, routed only horizontally/vertically along
/// walls (and straight across the ceiling to a ceiling lamp).
class Segment {
  Segment({
    required this.id,
    required this.fromId,
    required this.toId,
    required this.circuit,
    required this.circuitIndex,
    required this.purpose,
    required this.cores,
    required this.mm2,
    required this.points,
    required this.terminationM,
  }) : routeLength = _polylineLength(points);

  final String id;
  final String fromId;
  final String toId;
  final CircuitKind circuit;
  final int circuitIndex;
  final SegmentPurpose purpose;
  int cores;
  double mm2;
  final List<Vec3> points;
  final double routeLength;
  final double terminationM;

  /// Cable length including connection tails at both ends.
  double get length => routeLength + 2 * terminationM;

  String get cableKey => cableKeyFor(cores, mm2);

  Map<String, dynamic> toJson() => {
        'id': id,
        'from': fromId,
        'to': toId,
        'circuit': circuit.name,
        'circuit_index': circuitIndex,
        'purpose': purpose.name,
        'cores': cores,
        'mm2': mm2,
        'cable': cableKey,
        'route_m': _r2(routeLength),
        'length_m': _r2(length),
        'points': points.map((p) => p.toList()).toList(),
      };
}

String cableKeyFor(int cores, double mm2) {
  final s = mm2 == mm2.roundToDouble() ? mm2.toInt().toString() : mm2.toString().replaceAll('.', '_');
  return 'cable_${cores}x$s';
}

double _polylineLength(List<Vec3> pts) {
  var sum = 0.0;
  for (var i = 1; i < pts.length; i++) {
    sum += pts[i - 1].distanceTo(pts[i]);
  }
  return sum;
}

double _r2(double v) => (v * 100).roundToDouble() / 100;

class Circuit {
  Circuit({
    required this.kind,
    required this.index,
    required this.powerW,
    required this.cosphi,
    required this.designCurrentA,
    required this.breakerA,
    required this.mm2,
    required this.deviceIds,
    this.applianceKey,
    this.needsPanelWork = false,
  });

  final CircuitKind kind;
  final int index;
  final double powerW;
  final double cosphi;
  final double designCurrentA;
  int breakerA;
  double mm2;
  final List<String> deviceIds;
  final String? applianceKey;

  /// A new line from the distribution board: the panel side must be connected by an electrician.
  final bool needsPanelWork;
  double longestRunM = 0;
  double vdropPct = 0;

  String get id => '${kind.name}_$index';

  Map<String, dynamic> toJson() => {
        'id': id,
        'kind': kind.name,
        'index': index,
        'power_w': powerW.round(),
        'cosphi': cosphi,
        'current_a': _r2(designCurrentA),
        'breaker_a': breakerA,
        'mm2': mm2,
        'devices': deviceIds,
        if (applianceKey != null) 'appliance': applianceKey,
        'needs_panel_work': needsPanelWork,
        'longest_run_m': _r2(longestRunM),
        'vdrop_pct': _r2(vdropPct),
      };
}

class PlanWarning {
  const PlanWarning(this.code, this.severity, [this.params = const {}]);

  final String code;
  final Severity severity;
  final Map<String, Object?> params;

  Map<String, dynamic> toJson() => {'code': code, 'severity': severity.name, if (params.isNotEmpty) 'params': params};

  @override
  String toString() => 'PlanWarning($code, ${severity.name}, $params)';
}

class Plan {
  Plan({
    required this.room,
    required this.devices,
    required this.segments,
    required this.circuits,
    required this.warnings,
    required this.reservePct,
  });

  final RoomGeometry room;
  final List<Device> devices;
  final List<Segment> segments;
  final List<Circuit> circuits;
  final List<PlanWarning> warnings;
  final double reservePct;

  Device? device(String id) {
    for (final d in devices) {
      if (d.id == id) return d;
    }
    return null;
  }

  Iterable<Device> ofType(DeviceType t) => devices.where((d) => d.type == t);

  /// Raw cable metres per cable key (route + connection tails).
  Map<String, double> get cableRaw {
    final m = <String, double>{};
    for (final s in segments) {
      m[s.cableKey] = (m[s.cableKey] ?? 0) + s.length;
    }
    return m;
  }

  /// Metres to buy per cable key (+ reserve, rounded up to 0.5 m).
  Map<String, double> get cableToBuy => cableRaw.map((k, v) => MapEntry(k, withReserve(v, reservePct)));

  double get totalRouteM => segments.fold(0, (a, s) => a + s.routeLength);

  Map<String, dynamic> toJson() => {
        'room': {'length': room.length, 'width': room.width, 'height': room.height},
        'devices': devices.map((d) => d.toJson()..['pos'] = d.position(room).toList()).toList(),
        'segments': segments.map((s) => s.toJson()).toList(),
        'circuits': circuits.map((c) => c.toJson()).toList(),
        'warnings': warnings.map((w) => w.toJson()).toList(),
        'cable_raw_m': cableRaw.map((k, v) => MapEntry(k, _r2(v))),
        'cable_buy_m': cableToBuy,
      };
}

/// Routes cables along the walls: vertical drops at the device, horizontal runs in
/// a band [ceilingOffsetM] below the ceiling (or at socket height for the optional
/// "floor" loop mode), turning only at room corners.
class WallRouter {
  WallRouter(this.room, this.heights);

  final RoomGeometry room;
  final Heights heights;

  double get trunkZ => room.height - heights.ceilingOffsetM;

  List<Vec3> wallToWall(Wall wa, double ua, double za, Wall wb, double ub, double zb, {double? viaZ}) {
    final z = viaZ ?? trunkZ;
    final a = room.wallPoint(wa, ua, za);
    final b = room.wallPoint(wb, ub, zb);
    final sa = room.toS(wa, ua);
    final sb = room.toS(wb, ub);
    final pts = <Vec3>[a];
    final walk = room.perimeterWalk(sa, sb);
    if (walk.distance < 1e-6) {
      pts.add(b);
    } else {
      pts.add(a.withZ(z));
      for (final c in walk.corners) {
        pts.add(room.sPoint(c, z));
      }
      pts.add(b.withZ(z));
      pts.add(b);
    }
    return _dedupe(pts);
  }

  /// From a wall point to a ceiling point: along the walls to the foot of the
  /// perpendicular on the nearest wall, up to the ceiling, then straight across.
  List<Vec3> wallToCeiling(Wall wa, double ua, double za, double cx, double cy) {
    final (wf, uf) = room.nearestWall(cx, cy);
    final pts = wallToWall(wa, ua, za, wf, uf, room.height);
    pts.add(Vec3(cx, cy, room.height));
    return _dedupe(pts);
  }

  static List<Vec3> _dedupe(List<Vec3> pts) {
    final out = <Vec3>[];
    for (final p in pts) {
      if (out.isEmpty || out.last.distanceTo(p) > 1e-6) out.add(p);
    }
    return out;
  }
}

/// Builds the full wiring plan for one room.
class Planner {
  Planner(this.config);

  final CalcConfig config;

  CalcSettings get _c => config.calc;
  Heights get _h => config.heights;

  Plan build({required RoomGeometry room, required List<Device> input, required Answers answers}) {
    final warnings = <PlanWarning>[];
    final devices = input.map((d) => d.copy()).toList();
    final router = WallRouter(room, _h);
    final segments = <Segment>[];
    final circuits = <Circuit>[];
    var segNo = 0;
    String nextSeg() => 's${++segNo}';

    _normalize(room, devices, warnings);

    // ---------------------------------------------------------------- input & junction box
    var inputDev = _first(devices, DeviceType.input);
    if (inputDev == null) {
      inputDev = Device(
        id: 'input_auto',
        type: DeviceType.input,
        wall: Wall.a,
        u: math.min(0.5, room.length / 2),
        z: room.height - 0.3,
      );
      devices.add(inputDev);
      warnings.add(const PlanWarning('input_assumed', Severity.warn));
    }
    final entry = inputDev;

    final lamps = devices.where((d) => d.type == DeviceType.lamp).toList();
    var switches = devices.where((d) => d.type.isSwitch).toList();
    final hasLighting = lamps.isNotEmpty;

    Device? jb = _first(devices, DeviceType.junctionBox);
    if (hasLighting && jb == null) {
      final w = entry.wall ?? Wall.a;
      final len = room.wallLength(w);
      final u = (entry.u + 0.3).clamp(_h.cornerOffsetM, len - _h.cornerOffsetM).toDouble();
      jb = Device(
        id: 'jb_auto',
        type: DeviceType.junctionBox,
        wall: w,
        u: u,
        z: room.height - _h.junctionBoxBelowCeilingM,
      );
      devices.add(jb);
    }

    // ---------------------------------------------------------------- lighting
    if (hasLighting) {
      final box = jb!;
      if (switches.isEmpty) {
        final w = box.wall ?? Wall.a;
        final len = room.wallLength(w);
        final sw = Device(
          id: 'sw_auto',
          type: DeviceType.switchSingle,
          wall: w,
          u: (box.u + 0.3).clamp(_h.cornerOffsetM, len - _h.cornerOffsetM).toDouble(),
          z: _h.switchM,
        );
        devices.add(sw);
        switches = [sw];
        warnings.add(const PlanWarning('switch_auto_added', Severity.warn));
      }

      // Pair pass-through switches in order; a lone one is treated as single-gang.
      final passes = switches.where((s) => s.type == DeviceType.switchPass).toList();
      final pairOf = <String, String>{};
      for (var i = 0; i + 1 < passes.length; i += 2) {
        pairOf[passes[i].id] = passes[i + 1].id;
        pairOf[passes[i + 1].id] = passes[i].id;
      }
      if (passes.length.isOdd) {
        warnings.add(PlanWarning('pass_unpaired', Severity.warn, {'switch': passes.last.id}));
      }
      // Controllers: single/double switches and the first switch of each pass pair.
      final controllers = switches.where((s) {
        if (s.type != DeviceType.switchPass) return true;
        final other = pairOf[s.id];
        return other == null || passes.indexOf(s) < passes.indexWhere((p) => p.id == other);
      }).toList();

      for (final lamp in lamps) {
        final valid = lamp.switchId != null && controllers.any((c) => c.id == lamp.switchId);
        if (!valid) lamp.switchId = _nearestController(room, lamp, controllers).id;
      }
      for (final ctl in controllers.where((c) => c.type == DeviceType.switchDouble)) {
        final mine = lamps.where((l) => l.switchId == ctl.id).toList();
        if (mine.length == 1) {
          mine.first.lampGroup = 2; // a two-group chandelier on both keys
        } else if (mine.every((l) => l.lampGroup == 0)) {
          for (var i = 0; i < mine.length; i++) {
            mine[i].lampGroup = i.isEven ? 0 : 1;
          }
        }
      }

      final lampW = answers.lampPowerW ?? _c.lampDefaultW;
      final power = lampW * lamps.length;
      final current = loadCurrent(powerW: power, voltage: _c.voltage, cosphi: _c.cosphiResistive);
      final choice = chooseCircuit(
        designCurrentA: current,
        settings: _c,
        minMm2: _c.lightingMinMm2,
        defaultBreakerA: _c.lightingBreakerA,
        maxBreakerA: _c.lightingMaxBreakerA,
        hidden: answers.hidden,
      );
      if (choice == null) {
        warnings.add(PlanWarning('lighting_overload', Severity.block, {'power_w': power.round()}));
      }
      if (lamps.length > _c.maxLampsPerGroup) {
        warnings.add(PlanWarning('too_many_lamps', Severity.warn, {'count': lamps.length, 'max': _c.maxLampsPerGroup}));
      }
      final mm2 = choice?.mm2 ?? _c.lightingMinMm2;
      final circuit = Circuit(
        kind: CircuitKind.lighting,
        index: 1,
        powerW: power,
        cosphi: _c.cosphiResistive,
        designCurrentA: current,
        breakerA: choice?.breakerA ?? _c.lightingBreakerA,
        mm2: mm2,
        deviceIds: [box.id, ...switches.map((s) => s.id), ...lamps.map((l) => l.id)],
      );
      circuits.add(circuit);
      final pe = answers.hasPe;

      Segment seg(Device from, Device to, SegmentPurpose p, int cores, List<Vec3> pts) => Segment(
            id: nextSeg(),
            fromId: from.id,
            toId: to.id,
            circuit: CircuitKind.lighting,
            circuitIndex: 1,
            purpose: p,
            cores: cores,
            mm2: mm2,
            points: pts,
            terminationM: _c.terminationAllowanceM,
          );

      // Feed from the room entry to the junction box (L, N, PE).
      if (entry.id != box.id) {
        segments.add(seg(entry, box, SegmentPurpose.feed, 3, _wallRoute(router, entry, box)));
      }
      // Switch drops: single 2 conductors (3-core cable, spare core), double/pass 3 conductors.
      for (final sw in switches) {
        segments.add(seg(box, sw, SegmentPurpose.switchDrop, 3, _wallRoute(router, box, sw)));
      }
      // Lamps: switched line(s) + N (+ PE). A two-group chandelier needs one more core.
      for (final lamp in lamps) {
        final cores = (lamp.lampGroup == 2 ? 3 : 2) + (pe ? 1 : 0);
        final pts = lamp.onCeiling
            ? router.wallToCeiling(box.wall ?? Wall.a, box.u, box.z, lamp.cx ?? room.length / 2, lamp.cy ?? room.width / 2)
            : _wallRoute(router, box, lamp);
        segments.add(seg(box, lamp, SegmentPurpose.lamp, math.max(3, cores), pts));
      }
    } else if (switches.isNotEmpty) {
      warnings.add(const PlanWarning('switch_without_lamp', Severity.warn));
    }

    // ---------------------------------------------------------------- appliances
    final dedicatedApps = <ApplianceChoice>[];
    final generalApps = <ApplianceChoice>[];
    for (final a in answers.appliances) {
      final def = config.appliance(a.key);
      if (def?.outOfScope == true || a.powerW > _c.diyMaxApplianceW) continue; // handled by the scope guard
      if (a.powerW >= _c.separateLineThresholdW) {
        dedicatedApps.add(a);
      } else {
        generalApps.add(a);
      }
    }

    final allSockets = devices.where((d) => d.type == DeviceType.socket).toList();
    final dedicatedSocketIds = <String>{};
    var dedicatedIndex = 0;
    for (final app in dedicatedApps) {
      Device? socket;
      if (app.socketId != null) {
        for (final s in allSockets) {
          if (s.id == app.socketId && !dedicatedSocketIds.contains(s.id)) socket = s;
        }
      }
      if (socket == null) {
        final w = entry.wall ?? Wall.a;
        final len = room.wallLength(w);
        socket = Device(
          id: 'socket_${app.key}_auto',
          type: DeviceType.socket,
          wall: w,
          u: (entry.u + 0.6 + 0.3 * dedicatedIndex).clamp(_h.cornerOffsetM, len - _h.cornerOffsetM).toDouble(),
          z: _h.socketM,
        );
        devices.add(socket);
        warnings.add(PlanWarning('dedicated_socket_auto', Severity.warn, {'appliance': app.key}));
      }
      socket.applianceKey = app.key;
      dedicatedSocketIds.add(socket.id);
      dedicatedIndex++;

      final current = loadCurrent(powerW: app.powerW, voltage: _c.voltage, cosphi: app.cosphi);
      final choice = chooseCircuit(
        designCurrentA: current,
        settings: _c,
        minMm2: _c.socketsMinMm2,
        defaultBreakerA: _c.socketsBreakerA,
        hidden: answers.hidden,
      );
      if (choice == null) {
        warnings.add(PlanWarning('high_power', Severity.block, {'appliance': app.key}));
        continue;
      }
      final circuit = Circuit(
        kind: CircuitKind.dedicated,
        index: dedicatedIndex,
        powerW: app.powerW,
        cosphi: app.cosphi,
        designCurrentA: current,
        breakerA: choice.breakerA,
        mm2: choice.mm2,
        deviceIds: [socket.id],
        applianceKey: app.key,
        needsPanelWork: true,
      );
      circuits.add(circuit);
      warnings.add(PlanWarning('dedicated_line', Severity.warn, {'appliance': app.key, 'breaker_a': choice.breakerA, 'mm2': choice.mm2}));
      segments.add(Segment(
        id: nextSeg(),
        fromId: entry.id,
        toId: socket.id,
        circuit: CircuitKind.dedicated,
        circuitIndex: dedicatedIndex,
        purpose: SegmentPurpose.dedicated,
        cores: 3,
        mm2: choice.mm2,
        points: _wallRoute(router, entry, socket),
        terminationM: _c.terminationAllowanceM,
      ));
    }

    // ---------------------------------------------------------------- general sockets
    final general = allSockets.where((s) => !dedicatedSocketIds.contains(s.id)).toList();
    if (general.isNotEmpty) {
      final appPower = generalApps.fold<double>(0, (a, e) => a + e.powerW);
      final byCount = (general.length / _c.maxSocketsPerGroup).ceil();
      final byPower = (math.max(appPower, general.length * _c.socketDesignLoadW) / _c.socketGroupMaxW).ceil();
      final groups = math.max(1, math.max(byCount, byPower));
      if (byCount > 1) {
        warnings.add(PlanWarning('too_many_sockets', Severity.warn, {'count': general.length, 'max': _c.maxSocketsPerGroup}));
      }
      if (groups > 1) {
        warnings.add(PlanWarning('extra_socket_groups', Severity.warn, {'groups': groups}));
      }
      // Order sockets along the perimeter starting from the entry, then split into contiguous groups.
      final sIn = room.toS(entry.wall ?? Wall.a, entry.u);
      double rel(Device d) => ((room.toS(d.wall ?? Wall.a, d.u) - sIn) % room.perimeter + room.perimeter) % room.perimeter;
      general.sort((a, b) => rel(a).compareTo(rel(b)));
      final per = (general.length / groups).ceil();
      final loopZ = _h.socketLoopMode == SocketLoopMode.floor ? _h.socketM : null;

      for (var g = 0; g < groups; g++) {
        final members = general.skip(g * per).take(per).toList();
        if (members.isEmpty) continue;
        final share = appPower / groups;
        final power = math.max(members.length * _c.socketDesignLoadW, share);
        final current = loadCurrent(powerW: power, voltage: _c.voltage, cosphi: _c.cosphiDefault);
        final choice = chooseCircuit(
          designCurrentA: current,
          settings: _c,
          minMm2: _c.socketsMinMm2,
          defaultBreakerA: _c.socketsBreakerA,
          hidden: answers.hidden,
        );
        if (choice == null) {
          warnings.add(PlanWarning('socket_overload', Severity.block, {'group': g + 1}));
          continue;
        }
        final index = g + 1;
        circuits.add(Circuit(
          kind: CircuitKind.sockets,
          index: index,
          powerW: power,
          cosphi: _c.cosphiDefault,
          designCurrentA: current,
          breakerA: choice.breakerA,
          mm2: choice.mm2,
          deviceIds: members.map((m) => m.id).toList(),
          needsPanelWork: g > 0,
        ));
        var prev = entry;
        for (final s in members) {
          segments.add(Segment(
            id: nextSeg(),
            fromId: prev.id,
            toId: s.id,
            circuit: CircuitKind.sockets,
            circuitIndex: index,
            purpose: SegmentPurpose.socketHop,
            cores: 3,
            mm2: choice.mm2,
            points: _wallRoute(router, prev, s, viaZ: prev.id == entry.id ? null : loopZ),
            terminationM: _c.terminationAllowanceM,
          ));
          prev = s;
        }
      }
    }

    // ---------------------------------------------------------------- voltage drop
    for (final c in circuits) {
      final mine = segments.where((s) => s.circuit == c.kind && s.circuitIndex == c.index).toList();
      c.longestRunM = _longestRun(mine, entry.id);
      final total = c.longestRunM + answers.panelDistanceM;
      double vd(double mm2) => voltageDropPercent(
            lengthM: total,
            currentA: c.designCurrentA,
            mm2: mm2,
            voltage: _c.voltage,
            rho: _c.rhoCopper,
            cosphi: c.cosphi,
          );
      c.vdropPct = vd(c.mm2);
      if (c.vdropPct > _c.vdropMaxPct) {
        // Upsize the cable until the drop is acceptable (breaker stays the same).
        for (final row in _c.crossSections.where((r) => r.mm2 > c.mm2)) {
          if (vd(row.mm2) <= _c.vdropMaxPct) {
            warnings.add(PlanWarning('cable_upsized', Severity.warn, {'circuit': c.id, 'from': c.mm2, 'to': row.mm2}));
            c.mm2 = row.mm2;
            for (final s in mine) {
              s.mm2 = row.mm2;
            }
            c.vdropPct = vd(row.mm2);
            break;
          }
        }
      }
      if (c.vdropPct > _c.vdropWarnPct) {
        warnings.add(PlanWarning('vdrop_high', c.vdropPct > _c.vdropMaxPct ? Severity.block : Severity.warn,
            {'circuit': c.id, 'pct': _r2(c.vdropPct)}));
      }
    }

    if (!answers.hasPe) warnings.add(const PlanWarning('no_pe', Severity.warn));

    return Plan(
      room: room,
      devices: devices,
      segments: segments,
      circuits: circuits,
      warnings: warnings,
      reservePct: _c.cableReservePct,
    );
  }

  /// Snaps devices to standard heights and keeps vertical drops away from corners.
  void _normalize(RoomGeometry room, List<Device> devices, List<PlanWarning> warnings) {
    for (final d in devices) {
      if (d.onCeiling) {
        d.cx = (d.cx ?? room.length / 2).clamp(0.2, room.length - 0.2).toDouble();
        d.cy = (d.cy ?? room.width / 2).clamp(0.2, room.width - 0.2).toDouble();
        d.z = room.height;
        continue;
      }
      final w = d.wall ?? Wall.a;
      d.wall = w;
      final len = room.wallLength(w);
      final lo = math.min(_h.cornerOffsetM, len / 2);
      if (d.u < lo - 1e-9 || d.u > len - lo + 1e-9) {
        warnings.add(PlanWarning('near_corner', Severity.warn, {'device': d.id}));
        d.u = d.u.clamp(lo, len - lo).toDouble();
      }
      switch (d.type) {
        case DeviceType.socket:
          d.z = _h.socketM;
        case DeviceType.switchSingle || DeviceType.switchDouble || DeviceType.switchPass:
          if (d.z < _h.switchMinM || d.z > _h.switchMaxM) d.z = _h.switchM;
        case DeviceType.junctionBox:
          d.z = room.height - _h.junctionBoxBelowCeilingM;
        case DeviceType.lamp:
          d.z = d.z.clamp(1.6, room.height - 0.1).toDouble(); // wall sconce
        case DeviceType.input:
          d.z = d.z.clamp(0.1, room.height).toDouble();
      }
    }
  }

  List<Vec3> _wallRoute(WallRouter r, Device a, Device b, {double? viaZ}) =>
      r.wallToWall(a.wall ?? Wall.a, a.u, a.z, b.wall ?? Wall.a, b.u, b.z, viaZ: viaZ);

  Device _nearestController(RoomGeometry room, Device lamp, List<Device> controllers) {
    final double sLamp;
    if (lamp.onCeiling) {
      final (w, u) = room.nearestWall(lamp.cx ?? room.length / 2, lamp.cy ?? room.width / 2);
      sLamp = room.toS(w, u);
    } else {
      sLamp = room.toS(lamp.wall ?? Wall.a, lamp.u);
    }
    controllers.sort((a, b) => room
        .perimeterWalk(sLamp, room.toS(a.wall ?? Wall.a, a.u))
        .distance
        .compareTo(room.perimeterWalk(sLamp, room.toS(b.wall ?? Wall.a, b.u)).distance));
    return controllers.first;
  }

  /// Longest cable path from [startId] through the segment tree (chain or star).
  double _longestRun(List<Segment> segs, String startId) {
    final children = <String, List<Segment>>{};
    for (final s in segs) {
      children.putIfAbsent(s.fromId, () => []).add(s);
    }
    double walk(String id, Set<String> seen) {
      var best = 0.0;
      for (final s in children[id] ?? const <Segment>[]) {
        if (!seen.add(s.toId)) continue;
        best = math.max(best, s.length + walk(s.toId, seen));
      }
      return best;
    }

    return walk(startId, {startId});
  }

  static Device? _first(List<Device> list, DeviceType t) {
    for (final d in list) {
      if (d.type == t) return d;
    }
    return null;
  }
}
