/// Typed view of the admin-editable calculation tables (`ew_app_config` keys
/// `calc`, `heights`, `appliances`, `out_of_scope_rules`). The app ships the same
/// JSON in assets/content/config.json as the offline fallback.
library;

double _d(Object? v, double fallback) => v is num ? v.toDouble() : fallback;
int _i(Object? v, int fallback) => v is num ? v.toInt() : fallback;

class CrossSectionRow {
  const CrossSectionRow({
    required this.mm2,
    required this.maxBreakerA,
    required this.iAllowHiddenA,
    required this.iAllowOpenA,
  });

  final double mm2;
  final int maxBreakerA;
  final double iAllowHiddenA;
  final double iAllowOpenA;

  double allowed({required bool hidden}) => hidden ? iAllowHiddenA : iAllowOpenA;

  factory CrossSectionRow.fromJson(Map<String, dynamic> j) => CrossSectionRow(
        mm2: _d(j['mm2'], 1.5),
        maxBreakerA: _i(j['max_breaker_a'], 10),
        iAllowHiddenA: _d(j['i_allow_hidden_a'], 0),
        iAllowOpenA: _d(j['i_allow_open_a'], 0),
      );
}

class CalcSettings {
  const CalcSettings({
    required this.voltage,
    required this.cosphiDefault,
    required this.cosphiResistive,
    required this.rhoCopper,
    required this.vdropWarnPct,
    required this.vdropMaxPct,
    required this.breakerRatings,
    required this.crossSections,
    required this.lightingMinMm2,
    required this.lightingBreakerA,
    required this.lightingMaxBreakerA,
    required this.socketsMinMm2,
    required this.socketsBreakerA,
    required this.maxSocketsPerGroup,
    required this.maxLampsPerGroup,
    required this.socketDesignLoadW,
    required this.lampDefaultW,
    required this.socketGroupMaxW,
    required this.separateLineThresholdW,
    required this.diyMaxApplianceW,
    required this.maxRoomAreaM2,
    required this.cableReservePct,
    required this.terminationAllowanceM,
    required this.clipSpacingM,
    required this.normsNote,
  });

  final double voltage;
  final double cosphiDefault;
  final double cosphiResistive;
  final double rhoCopper;
  final double vdropWarnPct;
  final double vdropMaxPct;
  final List<int> breakerRatings;
  final List<CrossSectionRow> crossSections;
  final double lightingMinMm2;
  final int lightingBreakerA;
  final int lightingMaxBreakerA;
  final double socketsMinMm2;
  final int socketsBreakerA;
  final int maxSocketsPerGroup;
  final int maxLampsPerGroup;
  final double socketDesignLoadW;
  final double lampDefaultW;
  final double socketGroupMaxW;
  final double separateLineThresholdW;
  final double diyMaxApplianceW;
  final double maxRoomAreaM2;
  final double cableReservePct;
  final double terminationAllowanceM;
  final double clipSpacingM;
  final String normsNote;

  factory CalcSettings.fromJson(Map<String, dynamic> j) {
    final lighting = (j['lighting'] as Map?)?.cast<String, dynamic>() ?? const {};
    final sockets = (j['sockets'] as Map?)?.cast<String, dynamic>() ?? const {};
    final ratings = ((j['breaker_ratings_a'] as List?) ?? const [6, 10, 13, 16, 20, 25, 32])
        .map((e) => (e as num).toInt())
        .toList()
      ..sort();
    final rows = ((j['cross_sections'] as List?) ?? const [])
        .map((e) => CrossSectionRow.fromJson((e as Map).cast<String, dynamic>()))
        .toList()
      ..sort((a, b) => a.mm2.compareTo(b.mm2));
    return CalcSettings(
      voltage: _d(j['voltage_v'], 220),
      cosphiDefault: _d(j['cosphi_default'], 0.95),
      cosphiResistive: _d(j['cosphi_resistive'], 1.0),
      rhoCopper: _d(j['rho_copper'], 0.0175),
      vdropWarnPct: _d(j['vdrop_warn_pct'], 3),
      vdropMaxPct: _d(j['vdrop_max_pct'], 5),
      breakerRatings: ratings,
      crossSections: rows,
      lightingMinMm2: _d(lighting['min_mm2'], 1.5),
      lightingBreakerA: _i(lighting['breaker_a'], 10),
      lightingMaxBreakerA: _i(lighting['max_breaker_a'], 16),
      socketsMinMm2: _d(sockets['min_mm2'], 2.5),
      socketsBreakerA: _i(sockets['breaker_a'], 16),
      maxSocketsPerGroup: _i(j['max_sockets_per_group'], 6),
      maxLampsPerGroup: _i(j['max_lamps_per_group'], 10),
      socketDesignLoadW: _d(j['socket_design_load_w'], 300),
      lampDefaultW: _d(j['lamp_default_w'], 60),
      socketGroupMaxW: _d(j['socket_group_max_w'], 3500),
      separateLineThresholdW: _d(j['separate_line_threshold_w'], 2000),
      diyMaxApplianceW: _d(j['diy_max_appliance_w'], 3500),
      maxRoomAreaM2: _d(j['max_room_area_m2'], 30),
      cableReservePct: _d(j['cable_reserve_pct'], 12),
      terminationAllowanceM: _d(j['termination_allowance_m'], 0.2),
      clipSpacingM: _d(j['clip_spacing_m'], 0.45),
      normsNote: (j['norms_note'] as String?) ?? 'ShNK / KMK / PUE',
    );
  }
}

enum SocketLoopMode { ceiling, floor }

class Heights {
  const Heights({
    required this.socketM,
    required this.switchM,
    required this.switchMinM,
    required this.switchMaxM,
    required this.ceilingOffsetM,
    required this.cornerOffsetM,
    required this.junctionBoxBelowCeilingM,
    required this.socketLoopMode,
  });

  final double socketM;
  final double switchM;
  final double switchMinM;
  final double switchMaxM;
  final double ceilingOffsetM;
  final double cornerOffsetM;
  final double junctionBoxBelowCeilingM;
  final SocketLoopMode socketLoopMode;

  factory Heights.fromJson(Map<String, dynamic> j) => Heights(
        socketM: _d(j['socket_m'], 0.3),
        switchM: _d(j['switch_m'], 1.0),
        switchMinM: _d(j['switch_min_m'], 0.9),
        switchMaxM: _d(j['switch_max_m'], 1.1),
        ceilingOffsetM: _d(j['ceiling_offset_m'], 0.15),
        cornerOffsetM: _d(j['corner_offset_m'], 0.15),
        junctionBoxBelowCeilingM: _d(j['junction_box_below_ceiling_m'], 0.2),
        socketLoopMode: j['socket_loop_mode'] == 'floor' ? SocketLoopMode.floor : SocketLoopMode.ceiling,
      );
}

class ApplianceDef {
  const ApplianceDef({
    required this.key,
    required this.powerW,
    required this.cosphi,
    required this.outOfScope,
    required this.names,
  });

  final String key;
  final double powerW;
  final double cosphi;
  final bool outOfScope;
  final Map<String, String> names;

  String name(String lang) => names[lang] ?? names['en'] ?? key;

  factory ApplianceDef.fromJson(Map<String, dynamic> j) => ApplianceDef(
        key: j['key'] as String,
        powerW: _d(j['power_w'], 0),
        cosphi: _d(j['cosphi'], 0.95),
        outOfScope: j['out_of_scope'] == true,
        names: ((j['t'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, v as String)),
      );
}

enum Severity { block, warn }

class ScopeRuleDef {
  const ScopeRuleDef({required this.code, required this.severity, required this.texts});

  final String code;
  final Severity severity;
  final Map<String, String> texts;

  String text(String lang) => texts[lang] ?? texts['en'] ?? code;

  factory ScopeRuleDef.fromJson(Map<String, dynamic> j) => ScopeRuleDef(
        code: j['code'] as String,
        severity: j['severity'] == 'block' ? Severity.block : Severity.warn,
        texts: ((j['t'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, v as String)),
      );
}

/// Everything the planner needs, built from the config JSON map.
class CalcConfig {
  const CalcConfig({required this.calc, required this.heights, required this.appliances, required this.rules});

  final CalcSettings calc;
  final Heights heights;
  final List<ApplianceDef> appliances;
  final List<ScopeRuleDef> rules;

  ApplianceDef? appliance(String key) {
    for (final a in appliances) {
      if (a.key == key) return a;
    }
    return null;
  }

  ScopeRuleDef? rule(String code) {
    for (final r in rules) {
      if (r.code == code) return r;
    }
    return null;
  }

  factory CalcConfig.fromJson(Map<String, dynamic> j) => CalcConfig(
        calc: CalcSettings.fromJson((j['calc'] as Map?)?.cast<String, dynamic>() ?? const {}),
        heights: Heights.fromJson((j['heights'] as Map?)?.cast<String, dynamic>() ?? const {}),
        appliances: ((j['appliances'] as List?) ?? const [])
            .map((e) => ApplianceDef.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        rules: ((j['out_of_scope_rules'] as List?) ?? const [])
            .map((e) => ScopeRuleDef.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}
