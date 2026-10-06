import 'dart:math' as math;

import '../calc/calc.dart';

enum MarkerKind {
  input,
  socket,
  switchKey,
  lamp,
  junction;

  String get dbType => switch (this) {
        input => 'input',
        socket => 'socket',
        switchKey => 'switch',
        lamp => 'lamp',
        junction => 'junction_box',
      };

  static MarkerKind fromDb(String s) => switch (s) {
        'input' => input,
        'switch' => switchKey,
        'lamp' => lamp,
        'junction_box' => junction,
        _ => socket,
      };
}

enum ProjectStatus { draft, planned, inProgress, done }

extension ProjectStatusDb on ProjectStatus {
  String get db => switch (this) {
        ProjectStatus.draft => 'draft',
        ProjectStatus.planned => 'planned',
        ProjectStatus.inProgress => 'in_progress',
        ProjectStatus.done => 'done',
      };

  static ProjectStatus parse(String? s) => switch (s) {
        'planned' => ProjectStatus.planned,
        'in_progress' => ProjectStatus.inProgress,
        'done' => ProjectStatus.done,
        _ => ProjectStatus.draft,
      };
}

class PhotoDoc {
  PhotoDoc({required this.id, this.localPath, this.remotePath, this.wall, this.width, this.height});

  final String id;
  String? localPath;
  String? remotePath;
  Wall? wall;
  int? width;
  int? height;

  Map<String, dynamic> toJson() => {
        'id': id,
        if (localPath != null) 'local': localPath,
        if (remotePath != null) 'remote': remotePath,
        if (wall != null) 'wall': wall!.name,
        if (width != null) 'w': width,
        if (height != null) 'h': height,
      };

  factory PhotoDoc.fromJson(Map<String, dynamic> j) => PhotoDoc(
        id: j['id'] as String,
        localPath: j['local'] as String?,
        remotePath: j['remote'] as String?,
        wall: j['wall'] == null ? null : Wall.parse(j['wall'] as String),
        width: (j['w'] as num?)?.toInt(),
        height: (j['h'] as num?)?.toInt(),
      );
}

class MarkerDoc {
  MarkerDoc({
    required this.id,
    required this.photoId,
    required this.kind,
    required this.x,
    required this.y,
    this.note,
    this.linkKey,
    this.switchKind = SwitchKind.single,
    this.onCeiling = true,
  });

  final String id;
  final String photoId;
  MarkerKind kind;

  /// Normalized photo coordinates (0..1, origin top-left).
  double x;
  double y;
  String? note;

  /// Markers with the same link key are the same physical point seen on two photos.
  String? linkKey;
  SwitchKind switchKind;
  bool onCeiling;

  String get deviceId => linkKey ?? id;

  Map<String, dynamic> toJson() => {
        'id': id,
        'photo': photoId,
        'kind': kind.name,
        'x': x,
        'y': y,
        if (note != null) 'note': note,
        if (linkKey != null) 'link': linkKey,
        'switch': switchKind.name,
        'ceiling': onCeiling,
      };

  factory MarkerDoc.fromJson(Map<String, dynamic> j) => MarkerDoc(
        id: j['id'] as String,
        photoId: j['photo'] as String,
        kind: MarkerKind.values.firstWhere((k) => k.name == j['kind'], orElse: () => MarkerKind.socket),
        x: (j['x'] as num).toDouble(),
        y: (j['y'] as num).toDouble(),
        note: j['note'] as String?,
        linkKey: j['link'] as String?,
        switchKind: SwitchKind.values.firstWhere((k) => k.name == j['switch'], orElse: () => SwitchKind.single),
        onCeiling: j['ceiling'] != false,
      );
}

/// User adjustment of a device position on the 2D plan.
class Placement {
  Placement({this.wall, this.u, this.cx, this.cy});

  Wall? wall;
  double? u;
  double? cx;
  double? cy;

  Map<String, dynamic> toJson() => {
        if (wall != null) 'wall': wall!.name,
        if (u != null) 'u': u,
        if (cx != null) 'cx': cx,
        if (cy != null) 'cy': cy,
      };

  factory Placement.fromJson(Map<String, dynamic> j) => Placement(
        wall: j['wall'] == null ? null : Wall.parse(j['wall'] as String),
        u: (j['u'] as num?)?.toDouble(),
        cx: (j['cx'] as num?)?.toDouble(),
        cy: (j['cy'] as num?)?.toDouble(),
      );
}

class ProjectDoc {
  ProjectDoc({
    required this.id,
    this.title = '',
    this.length,
    this.width,
    this.height,
    List<PhotoDoc>? photos,
    List<MarkerDoc>? markers,
    Answers? answers,
    Map<String, Placement>? placements,
    List<Device>? extraDevices,
    Map<String, String>? lampSwitch,
    this.dimsSource = 'manual',
    this.aiEstimate,
    this.result,
    this.status = ProjectStatus.draft,
    this.outOfScope = false,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : photos = photos ?? [],
        markers = markers ?? [],
        answers = answers ?? Answers(),
        placements = placements ?? {},
        extraDevices = extraDevices ?? [],
        lampSwitch = lampSwitch ?? {},
        createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  final String id;
  String title;
  double? length;
  double? width;
  double? height;
  final List<PhotoDoc> photos;
  final List<MarkerDoc> markers;
  Answers answers;
  final Map<String, Placement> placements;
  final List<Device> extraDevices;

  /// Lamp device id -> controlling switch device id (chosen by the user).
  final Map<String, String> lampSwitch;
  String dimsSource;
  Map<String, dynamic>? aiEstimate;

  /// {plan, materials, scope, built_at}
  Map<String, dynamic>? result;
  ProjectStatus status;
  bool outOfScope;
  final DateTime createdAt;
  DateTime updatedAt;

  bool get hasDimensions => (length ?? 0) > 0 && (width ?? 0) > 0 && (height ?? 0) > 0;

  RoomGeometry? get room => hasDimensions ? RoomGeometry(length: length!, width: width!, height: height!) : null;

  PhotoDoc? photo(String id) {
    for (final p in photos) {
      if (p.id == id) return p;
    }
    return null;
  }

  int count(MarkerKind kind) => markers.where((m) => m.kind == kind).map((m) => m.deviceId).toSet().length;

  /// Turns photo markers (+ user placements and devices added on the plan) into
  /// devices in room coordinates. A marker at photo x on wall W sits at
  /// u = (1 - x) · |W| (walls are walked so that, facing a wall, it runs right to left).
  List<Device> devices(RoomGeometry room) {
    final out = <Device>[];
    final seen = <String>{};
    final lampsOnCeiling = <Device>[];
    for (final m in markers) {
      if (!seen.add(m.deviceId)) continue;
      final wall = photo(m.photoId)?.wall ?? Wall.a;
      final len = room.wallLength(wall);
      final u = (1 - m.x).clamp(0.0, 1.0) * len;
      final z = ((1 - m.y).clamp(0.0, 1.0) * room.height).toDouble();
      final type = switch (m.kind) {
        MarkerKind.input => DeviceType.input,
        MarkerKind.socket => DeviceType.socket,
        MarkerKind.junction => DeviceType.junctionBox,
        MarkerKind.lamp => DeviceType.lamp,
        MarkerKind.switchKey => switch (m.switchKind) {
            SwitchKind.single => DeviceType.switchSingle,
            SwitchKind.double => DeviceType.switchDouble,
            SwitchKind.pass => DeviceType.switchPass,
          },
      };
      if (type == DeviceType.lamp && m.onCeiling) {
        // On the line through the room centre perpendicular to the photographed wall.
        final foot = room.wallPoint(wall, u, room.height);
        final (cx, cy) = switch (wall) {
          Wall.a || Wall.c => (foot.x, room.width / 2),
          Wall.b || Wall.d => (room.length / 2, foot.y),
        };
        final d = Device(id: m.deviceId, type: type, cx: cx, cy: cy, note: m.note);
        lampsOnCeiling.add(d);
        out.add(d);
      } else {
        out.add(Device(id: m.deviceId, type: type, wall: wall, u: u, z: z, note: m.note));
      }
    }
    // Spread ceiling lamps that landed on the same spot.
    for (var i = 1; i < lampsOnCeiling.length; i++) {
      for (var j = 0; j < i; j++) {
        final a = lampsOnCeiling[i], b = lampsOnCeiling[j];
        if (((a.cx! - b.cx!).abs() + (a.cy! - b.cy!).abs()) < 0.3) {
          a.cx = math.min(room.length - 0.3, a.cx! + 0.6);
        }
      }
    }
    out.addAll(extraDevices.map((d) => d.copy()));
    for (final d in out) {
      final p = placements[d.id];
      if (p == null) continue;
      if (d.onCeiling) {
        d.cx = p.cx ?? d.cx;
        d.cy = p.cy ?? d.cy;
      } else {
        d.wall = p.wall ?? d.wall;
        d.u = p.u ?? d.u;
      }
    }
    // Remember the switch a lamp belongs to across rebuilds.
    for (final d in out.where((d) => d.type == DeviceType.lamp)) {
      d.switchId = lampSwitch[d.id];
    }
    return out;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'length': length,
        'width': width,
        'height': height,
        'photos': photos.map((p) => p.toJson()).toList(),
        'markers': markers.map((m) => m.toJson()).toList(),
        'answers': answers.toJson(),
        'placements': placements.map((k, v) => MapEntry(k, v.toJson())),
        'extra_devices': extraDevices.map((d) => d.toJson()).toList(),
        'lamp_switch': lampSwitch,
        'dims_source': dimsSource,
        if (aiEstimate != null) 'ai_estimate': aiEstimate,
        if (result != null) 'result': result,
        'status': status.db,
        'out_of_scope': outOfScope,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };

  factory ProjectDoc.fromJson(Map<String, dynamic> j) => ProjectDoc(
        id: j['id'] as String,
        title: (j['title'] as String?) ?? '',
        length: (j['length'] as num?)?.toDouble(),
        width: (j['width'] as num?)?.toDouble(),
        height: (j['height'] as num?)?.toDouble(),
        photos: ((j['photos'] as List?) ?? const []).map((e) => PhotoDoc.fromJson((e as Map).cast<String, dynamic>())).toList(),
        markers: ((j['markers'] as List?) ?? const []).map((e) => MarkerDoc.fromJson((e as Map).cast<String, dynamic>())).toList(),
        answers: Answers.fromJson(((j['answers'] as Map?) ?? const {}).cast<String, dynamic>()),
        placements: ((j['placements'] as Map?) ?? const {})
            .map((k, v) => MapEntry(k as String, Placement.fromJson((v as Map).cast<String, dynamic>()))),
        extraDevices:
            ((j['extra_devices'] as List?) ?? const []).map((e) => Device.fromJson((e as Map).cast<String, dynamic>())).toList(),
        lampSwitch: ((j['lamp_switch'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, v as String)),
        dimsSource: (j['dims_source'] as String?) ?? 'manual',
        aiEstimate: (j['ai_estimate'] as Map?)?.cast<String, dynamic>(),
        result: (j['result'] as Map?)?.cast<String, dynamic>(),
        status: ProjectStatusDb.parse(j['status'] as String?),
        outOfScope: j['out_of_scope'] == true,
        createdAt: DateTime.tryParse((j['created_at'] as String?) ?? ''),
        updatedAt: DateTime.tryParse((j['updated_at'] as String?) ?? ''),
      );

  ProjectDoc copy() => ProjectDoc.fromJson(toJson());
}
