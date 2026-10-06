import '../calc/calc_config.dart';

typedef Tr = Map<String, Map<String, dynamic>>;

String _pick(Map<String, dynamic>? m, String lang, String field) {
  if (m == null) return '';
  final byLang = (m[lang] ?? m['uz'] ?? m['en'] ?? (m.values.isEmpty ? null : m.values.first)) as Map?;
  return (byLang?[field] as String?) ?? '';
}

class LessonStep {
  LessonStep({required this.id, required this.order, required this.illustration, required this.imagePath, required this.tools, required this.t});

  final String id;
  final int order;
  final String? illustration;
  final String? imagePath;
  final List<String> tools;
  final Map<String, dynamic> t;

  String text(String lang) => _pick(t, lang, 'text');
  String warning(String lang) => _pick(t, lang, 'warning');

  factory LessonStep.fromJson(Map<String, dynamic> j) => LessonStep(
        id: j['id'] as String,
        order: (j['sort_order'] as num?)?.toInt() ?? 0,
        illustration: j['illustration'] as String?,
        imagePath: j['image_path'] as String?,
        tools: ((j['tools'] as List?) ?? const []).cast<String>(),
        t: (j['t'] as Map).cast<String, dynamic>(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'sort_order': order,
        'illustration': illustration,
        'image_path': imagePath,
        'tools': tools,
        't': t,
      };
}

class QuizQuestion {
  QuizQuestion({required this.id, required this.order, required this.correct, required this.t});

  final String id;
  final int order;
  final int correct;
  final Map<String, dynamic> t;

  String question(String lang) => _pick(t, lang, 'q');
  String explanation(String lang) => _pick(t, lang, 'explanation');
  List<String> options(String lang) {
    final m = (t[lang] ?? t['uz'] ?? t['en']) as Map?;
    return ((m?['options'] as List?) ?? const []).map((e) => e.toString()).toList();
  }

  factory QuizQuestion.fromJson(Map<String, dynamic> j) => QuizQuestion(
        id: j['id'] as String,
        order: (j['sort_order'] as num?)?.toInt() ?? 0,
        correct: (j['correct_index'] as num?)?.toInt() ?? 0,
        t: (j['t'] as Map).cast<String, dynamic>(),
      );

  Map<String, dynamic> toJson() => {'id': id, 'sort_order': order, 'correct_index': correct, 't': t};
}

class Lesson {
  Lesson({
    required this.id,
    required this.slug,
    required this.order,
    required this.difficulty,
    required this.minutes,
    required this.icon,
    required this.t,
    required this.steps,
    required this.quiz,
  });

  final String id;
  final String slug;
  final int order;
  final int difficulty;
  final int minutes;
  final String? icon;
  final Map<String, dynamic> t;
  final List<LessonStep> steps;
  final List<QuizQuestion> quiz;

  String title(String lang) => _pick(t, lang, 'title');
  String summary(String lang) => _pick(t, lang, 'summary');

  factory Lesson.fromJson(Map<String, dynamic> j) => Lesson(
        id: j['id'] as String,
        slug: j['slug'] as String,
        order: (j['sort_order'] as num?)?.toInt() ?? 0,
        difficulty: (j['difficulty'] as num?)?.toInt() ?? 1,
        minutes: (j['est_minutes'] as num?)?.toInt() ?? 10,
        icon: j['icon'] as String?,
        t: (j['t'] as Map).cast<String, dynamic>(),
        steps: ((j['steps'] as List?) ?? const []).map((e) => LessonStep.fromJson((e as Map).cast<String, dynamic>())).toList()
          ..sort((a, b) => a.order.compareTo(b.order)),
        quiz: ((j['quiz'] as List?) ?? const []).map((e) => QuizQuestion.fromJson((e as Map).cast<String, dynamic>())).toList()
          ..sort((a, b) => a.order.compareTo(b.order)),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'slug': slug,
        'sort_order': order,
        'difficulty': difficulty,
        'est_minutes': minutes,
        'icon': icon,
        't': t,
        'steps': steps.map((s) => s.toJson()).toList(),
        'quiz': quiz.map((q) => q.toJson()).toList(),
      };
}

class MaterialItem {
  MaterialItem({
    required this.id,
    required this.key,
    required this.category,
    required this.unit,
    required this.defaultPrice,
    required this.currency,
    required this.order,
    required this.t,
  });

  final String id;
  final String key;
  final String category;
  final String unit;
  final double defaultPrice;
  final String currency;
  final int order;
  final Map<String, dynamic> t;

  String name(String lang) => (t[lang] ?? t['uz'] ?? t['en'] ?? key).toString();

  factory MaterialItem.fromJson(Map<String, dynamic> j) => MaterialItem(
        id: j['id'] as String,
        key: j['key'] as String,
        category: (j['category'] as String?) ?? 'other',
        unit: (j['unit'] as String?) ?? 'pcs',
        defaultPrice: (j['default_price'] as num?)?.toDouble() ?? 0,
        currency: (j['currency'] as String?) ?? 'UZS',
        order: (j['sort_order'] as num?)?.toInt() ?? 0,
        t: (j['t'] as Map).cast<String, dynamic>(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'key': key,
        'category': category,
        'unit': unit,
        'default_price': defaultPrice,
        'currency': currency,
        'sort_order': order,
        't': t,
      };
}

class Region {
  Region({required this.code, required this.t});

  final String code;
  final Map<String, dynamic> t;

  String name(String lang) => (t[lang] ?? t['uz'] ?? code).toString();

  factory Region.fromJson(Map<String, dynamic> j) => Region(code: j['code'] as String, t: (j['t'] as Map).cast<String, dynamic>());

  Map<String, dynamic> toJson() => {'code': code, 't': t};
}

class ChecklistItem {
  ChecklistItem({required this.key, required this.t});

  final String key;
  final Map<String, dynamic> t;

  String text(String lang) => (t[lang] ?? t['uz'] ?? t['en'] ?? key).toString();
}

/// Everything the app shows offline. Built from the bundled assets and replaced by
/// the server version after a successful sync.
class ContentBundle {
  ContentBundle({
    required this.lessons,
    required this.materials,
    required this.regions,
    required this.prices,
    required this.config,
    required this.legal,
    this.syncedAt,
  }) : calc = CalcConfig.fromJson(config);

  final List<Lesson> lessons;
  final List<MaterialItem> materials;
  final List<Region> regions;

  /// material key -> region code -> price.
  final Map<String, Map<String, double>> prices;
  final Map<String, dynamic> config;

  /// kind -> {version, texts: {lang: body}}.
  final Map<String, Map<String, dynamic>> legal;
  final DateTime? syncedAt;
  final CalcConfig calc;

  Lesson? lessonBySlug(String slug) {
    for (final l in lessons) {
      if (l.slug == slug) return l;
    }
    return null;
  }

  Lesson? lessonById(String id) {
    for (final l in lessons) {
      if (l.id == id) return l;
    }
    return null;
  }

  MaterialItem? material(String key) {
    for (final m in materials) {
      if (m.key == key) return m;
    }
    return null;
  }

  double price(String key, String region) => prices[key]?[region] ?? material(key)?.defaultPrice ?? 0;

  List<ChecklistItem> get safetyChecklist => ((config['safety_checklist'] as List?) ?? const [])
      .map((e) => ChecklistItem(key: (e as Map)['key'] as String, t: (e['t'] as Map).cast<String, dynamic>()))
      .toList();

  bool feature(String flag) => (config['feature_flags'] as Map?)?[flag] != false;

  double usdRate() => ((config['currency'] as Map?)?['rates_to_uzs'] as Map?)?['USD'] is num
      ? (((config['currency'] as Map)['rates_to_uzs'] as Map)['USD'] as num).toDouble()
      : 12700;

  Map<String, String> get wireColors =>
      ((config['wire_colors'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, v.toString()));

  int legalVersion(String kind) => (legal[kind]?['version'] as num?)?.toInt() ?? 1;

  String legalText(String kind, String lang) {
    final texts = (legal[kind]?['texts'] as Map?)?.cast<String, dynamic>() ?? const {};
    return (texts[lang] ?? texts['uz'] ?? texts['en'] ?? '').toString();
  }

  Region? region(String code) {
    for (final r in regions) {
      if (r.code == code) return r;
    }
    return null;
  }

  Map<String, dynamic> toJson() => {
        'lessons': lessons.map((l) => l.toJson()).toList(),
        'materials': materials.map((m) => m.toJson()).toList(),
        'regions': regions.map((r) => r.toJson()).toList(),
        'prices': prices,
        'config': config,
        'legal': legal,
        'synced_at': syncedAt?.toIso8601String(),
      };

  factory ContentBundle.fromJson(Map<String, dynamic> j) => ContentBundle(
        lessons: ((j['lessons'] as List?) ?? const []).map((e) => Lesson.fromJson((e as Map).cast<String, dynamic>())).toList(),
        materials:
            ((j['materials'] as List?) ?? const []).map((e) => MaterialItem.fromJson((e as Map).cast<String, dynamic>())).toList(),
        regions: ((j['regions'] as List?) ?? const []).map((e) => Region.fromJson((e as Map).cast<String, dynamic>())).toList(),
        prices: ((j['prices'] as Map?) ?? const {}).map((k, v) => MapEntry(
              k as String,
              (v as Map).map((r, p) => MapEntry(r as String, (p as num).toDouble())),
            )),
        config: ((j['config'] as Map?) ?? const {}).cast<String, dynamic>(),
        legal: ((j['legal'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, (v as Map).cast<String, dynamic>())),
        syncedAt: j['synced_at'] == null ? null : DateTime.tryParse(j['synced_at'] as String),
      );
}
