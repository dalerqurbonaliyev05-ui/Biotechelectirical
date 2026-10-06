import 'geometry.dart';

enum DeviceType {
  input,
  junctionBox,
  socket,
  switchSingle,
  switchDouble,
  switchPass,
  lamp;

  bool get isSwitch => this == switchSingle || this == switchDouble || this == switchPass;

  /// Marker type stored in ew_markers.type.
  String get markerType => switch (this) {
        input => 'input',
        junctionBox => 'junction_box',
        socket => 'socket',
        lamp => 'lamp',
        _ => 'switch',
      };

  static DeviceType parse(String s) => DeviceType.values.firstWhere((t) => t.name == s, orElse: () => DeviceType.socket);
}

enum SwitchKind { single, double, pass }

enum WallMaterial { brick, concrete, gypsum, wood }

enum WiringType { hidden, open }

/// A device placed in the room. Wall devices use [wall] + [u] + [z]; ceiling
/// lamps use [cx]/[cy] (z = room height). Positions come from photo markers and
/// can be adjusted by the user on the 2D plan.
class Device {
  Device({
    required this.id,
    required this.type,
    this.wall,
    this.u = 0,
    this.z = 0,
    this.cx,
    this.cy,
    this.switchId,
    this.lampGroup = 0,
    this.applianceKey,
    this.note,
  });

  final String id;
  final DeviceType type;
  Wall? wall;
  double u;
  double z;
  double? cx;
  double? cy;

  /// For lamps: the switch (or first switch of a pass-through pair) that controls it.
  String? switchId;

  /// For lamps on a double-gang switch: 0 = first key, 1 = second key.
  int lampGroup;

  /// For sockets that feed a dedicated appliance line.
  String? applianceKey;
  String? note;

  bool get onCeiling => type == DeviceType.lamp && wall == null;

  Vec3 position(RoomGeometry room) {
    if (onCeiling) return Vec3(cx ?? room.length / 2, cy ?? room.width / 2, room.height);
    return room.wallPoint(wall ?? Wall.a, u, z);
  }

  Device copy() => Device(
        id: id,
        type: type,
        wall: wall,
        u: u,
        z: z,
        cx: cx,
        cy: cy,
        switchId: switchId,
        lampGroup: lampGroup,
        applianceKey: applianceKey,
        note: note,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.name,
        if (wall != null) 'wall': wall!.name,
        'u': u,
        'z': z,
        if (cx != null) 'cx': cx,
        if (cy != null) 'cy': cy,
        if (switchId != null) 'switch_id': switchId,
        'lamp_group': lampGroup,
        if (applianceKey != null) 'appliance': applianceKey,
        if (note != null) 'note': note,
      };

  factory Device.fromJson(Map<String, dynamic> j) => Device(
        id: j['id'] as String,
        type: DeviceType.parse(j['type'] as String),
        wall: j['wall'] == null ? null : Wall.parse(j['wall'] as String),
        u: (j['u'] as num?)?.toDouble() ?? 0,
        z: (j['z'] as num?)?.toDouble() ?? 0,
        cx: (j['cx'] as num?)?.toDouble(),
        cy: (j['cy'] as num?)?.toDouble(),
        switchId: j['switch_id'] as String?,
        lampGroup: (j['lamp_group'] as num?)?.toInt() ?? 0,
        applianceKey: j['appliance'] as String?,
        note: j['note'] as String?,
      );
}

class ApplianceChoice {
  const ApplianceChoice({required this.key, required this.powerW, required this.cosphi, this.socketId});

  final String key;
  final double powerW;
  final double cosphi;

  /// Socket that serves this appliance (only used for dedicated lines).
  final String? socketId;

  Map<String, dynamic> toJson() => {'key': key, 'power_w': powerW, 'cosphi': cosphi, if (socketId != null) 'socket_id': socketId};

  factory ApplianceChoice.fromJson(Map<String, dynamic> j) => ApplianceChoice(
        key: j['key'] as String,
        powerW: (j['power_w'] as num).toDouble(),
        cosphi: (j['cosphi'] as num?)?.toDouble() ?? 0.95,
        socketId: j['socket_id'] as String?,
      );

  ApplianceChoice withSocket(String? id) => ApplianceChoice(key: key, powerW: powerW, cosphi: cosphi, socketId: id);
}

/// Answers from the "Questions" step of the wizard.
class Answers {
  Answers({
    this.wallMaterial = WallMaterial.brick,
    this.wiringType = WiringType.hidden,
    this.hasJunctionBox = false,
    this.hasPe = true,
    this.panelDistanceM = 10,
    this.lampPowerW,
    List<ApplianceChoice>? appliances,
    this.panelWork = false,
    this.groundingWork = false,
    this.threePhase = false,
    this.wetZone = false,
    this.aluminiumWiring = false,
    this.damagedWiring = false,
  }) : appliances = appliances ?? [];

  WallMaterial wallMaterial;
  WiringType wiringType;
  bool hasJunctionBox;
  bool hasPe;
  double panelDistanceM;
  double? lampPowerW;
  List<ApplianceChoice> appliances;
  bool panelWork;
  bool groundingWork;
  bool threePhase;
  bool wetZone;
  bool aluminiumWiring;
  bool damagedWiring;

  bool get hidden => wiringType == WiringType.hidden;

  Map<String, dynamic> toJson() => {
        'wall_material': wallMaterial.name,
        'wiring_type': wiringType.name,
        'has_junction_box': hasJunctionBox,
        'has_pe': hasPe,
        'panel_distance_m': panelDistanceM,
        if (lampPowerW != null) 'lamp_power_w': lampPowerW,
        'appliances': appliances.map((a) => a.toJson()).toList(),
        'panel_work': panelWork,
        'grounding_work': groundingWork,
        'three_phase': threePhase,
        'wet_zone': wetZone,
        'aluminium_wiring': aluminiumWiring,
        'damaged_wiring': damagedWiring,
      };

  factory Answers.fromJson(Map<String, dynamic> j) => Answers(
        wallMaterial: WallMaterial.values.firstWhere((e) => e.name == j['wall_material'], orElse: () => WallMaterial.brick),
        wiringType: j['wiring_type'] == 'open' ? WiringType.open : WiringType.hidden,
        hasJunctionBox: j['has_junction_box'] == true,
        hasPe: j['has_pe'] != false,
        panelDistanceM: (j['panel_distance_m'] as num?)?.toDouble() ?? 10,
        lampPowerW: (j['lamp_power_w'] as num?)?.toDouble(),
        appliances: ((j['appliances'] as List?) ?? const [])
            .map((e) => ApplianceChoice.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        panelWork: j['panel_work'] == true,
        groundingWork: j['grounding_work'] == true,
        threePhase: j['three_phase'] == true,
        wetZone: j['wet_zone'] == true,
        aluminiumWiring: j['aluminium_wiring'] == true,
        damagedWiring: j['damaged_wiring'] == true,
      );
}
