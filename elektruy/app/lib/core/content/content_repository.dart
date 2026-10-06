import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart' show rootBundle;
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../db/local_db.dart';
import '../env.dart';
import 'content_models.dart';

const _cacheKey = 'content.bundle.v1';

/// Loads content in three layers: assets bundled in the APK (always available),
/// the last server copy cached in the local DB, and a fresh pull from Supabase.
class ContentRepository {
  ContentRepository(this.db, this.client);

  final LocalDb db;
  final SupabaseClient? client;

  Future<ContentBundle> loadBundled() async {
    Future<Map<String, dynamic>> read(String name) async =>
        jsonDecode(await rootBundle.loadString('assets/content/$name.json')) as Map<String, dynamic>;
    return bundleFromAssets(
      lessons: await read('lessons'),
      materials: await read('materials'),
      config: await read('config'),
      legal: await read('legal'),
    );
  }

  /// Builds a bundle from the four generated asset files (also used by tests).
  static ContentBundle bundleFromAssets({
    required Map<String, dynamic> lessons,
    required Map<String, dynamic> materials,
    required Map<String, dynamic> config,
    required Map<String, dynamic> legal,
  }) =>
      ContentBundle.fromJson({
        'lessons': lessons['lessons'],
        'materials': materials['materials'],
        'regions': materials['regions'],
        'prices': const <String, dynamic>{},
        'config': config,
        'legal': _legalFromBundle(legal),
      });

  static Map<String, dynamic> _legalFromBundle(Map<String, dynamic> j) {
    final out = <String, dynamic>{};
    for (final t in (j['texts'] as List)) {
      final m = (t as Map).cast<String, dynamic>();
      out[m['kind'] as String] = {'version': m['version'], 'texts': m['t']};
    }
    return out;
  }

  Future<ContentBundle> loadCachedOrBundled() async {
    final cached = await db.getKv(_cacheKey);
    if (cached != null) {
      try {
        return ContentBundle.fromJson(jsonDecode(cached) as Map<String, dynamic>);
      } catch (_) {
        await db.deleteKv(_cacheKey);
      }
    }
    return loadBundled();
  }

  Future<void> clearCache() => db.deleteKv(_cacheKey);

  /// Pulls published content from Supabase (requires a signed-in user because the
  /// ew_ tables are not readable by anon). Returns the new bundle and caches it.
  Future<ContentBundle> sync(ContentBundle fallback) async {
    final c = client;
    if (c == null || c.auth.currentSession == null) return fallback;

    final lessonsRows = await c
        .from('ew_lessons')
        .select('id, slug, sort_order, difficulty, est_minutes, icon, published, '
            'ew_lesson_translations(lang, title, summary), '
            'ew_lesson_steps(id, sort_order, image_path, illustration, tools, ew_lesson_step_translations(lang, text, warning)), '
            'ew_quiz_questions(id, sort_order, correct_index, ew_quiz_question_translations(lang, question, options, explanation))')
        .eq('published', true)
        .order('sort_order');

    final lessons = <Map<String, dynamic>>[];
    for (final row in lessonsRows) {
      final r = row;
      lessons.add({
        'id': r['id'],
        'slug': r['slug'],
        'sort_order': r['sort_order'],
        'difficulty': r['difficulty'],
        'est_minutes': r['est_minutes'],
        'icon': r['icon'],
        't': {
          for (final t in (r['ew_lesson_translations'] as List))
            (t as Map)['lang']: {'title': t['title'], 'summary': t['summary']},
        },
        'steps': [
          for (final s in (r['ew_lesson_steps'] as List))
            {
              'id': (s as Map)['id'],
              'sort_order': s['sort_order'],
              'image_path': s['image_path'],
              'illustration': s['illustration'],
              'tools': s['tools'],
              't': {
                for (final t in (s['ew_lesson_step_translations'] as List))
                  (t as Map)['lang']: {'text': t['text'], 'warning': t['warning']},
              },
            },
        ],
        'quiz': [
          for (final q in (r['ew_quiz_questions'] as List))
            {
              'id': (q as Map)['id'],
              'sort_order': q['sort_order'],
              'correct_index': q['correct_index'],
              't': {
                for (final t in (q['ew_quiz_question_translations'] as List))
                  (t as Map)['lang']: {'q': t['question'], 'options': t['options'], 'explanation': t['explanation']},
              },
            },
        ],
      });
    }

    final matRows = await c
        .from('ew_materials')
        .select('id, key, category, unit, default_price, currency, sort_order, active, ew_material_translations(lang, name)')
        .eq('active', true)
        .order('sort_order');
    final materials = [
      for (final m in matRows)
        {
          ...m,
          't': {for (final t in (m['ew_material_translations'] as List)) (t as Map)['lang']: t['name']},
        },
    ];
    final idToKey = {for (final m in matRows) m['id'] as String: m['key'] as String};

    final priceRows = await c.from('ew_material_prices').select('material_id, region, price');
    final prices = <String, Map<String, double>>{};
    for (final pr in priceRows) {
      final key = idToKey[pr['material_id']];
      if (key == null) continue;
      prices.putIfAbsent(key, () => {})[pr['region'] as String] = (pr['price'] as num).toDouble();
    }

    final regionRows = await c.from('ew_regions').select('code, name_uz, name_ru, name_en').order('sort_order');
    final regions = [
      for (final r in regionRows)
        {
          'code': r['code'],
          't': {'uz': r['name_uz'], 'ru': r['name_ru'], 'en': r['name_en']},
        },
    ];

    final cfgRows = await c.from('ew_app_config').select('key, value');
    final config = Map<String, dynamic>.from(fallback.config);
    for (final r in cfgRows) {
      config[r['key'] as String] = r['value'];
    }

    final legalRows = await c.from('ew_legal_texts').select('kind, version, lang, body').eq('published', true);
    final legal = <String, Map<String, dynamic>>{};
    for (final r in legalRows) {
      final kind = r['kind'] as String;
      final version = (r['version'] as num).toInt();
      final cur = legal[kind];
      if (cur == null || (cur['version'] as int) < version) {
        legal[kind] = {'version': version, 'texts': <String, dynamic>{}};
      }
      if (legal[kind]!['version'] == version) {
        (legal[kind]!['texts'] as Map<String, dynamic>)[r['lang'] as String] = r['body'];
      }
    }

    final bundle = ContentBundle.fromJson({
      'lessons': lessons.isEmpty ? fallback.lessons.map((l) => l.toJson()).toList() : lessons,
      'materials': materials.isEmpty ? fallback.materials.map((m) => m.toJson()).toList() : materials,
      'regions': regions.isEmpty ? fallback.regions.map((r) => r.toJson()).toList() : regions,
      'prices': prices,
      'config': config,
      'legal': legal.isEmpty ? fallback.legal : legal,
      'synced_at': DateTime.now().toIso8601String(),
    });
    await db.putKv(_cacheKey, jsonEncode(bundle.toJson()));
    return bundle;
  }

  // ---------------------------------------------------------------- lesson images
  Future<Directory> _mediaDir() async {
    final dir = Directory(p.join((await getApplicationSupportDirectory()).path, 'lesson_media'));
    if (!dir.existsSync()) dir.createSync(recursive: true);
    return dir;
  }

  Future<File?> localImage(String imagePath) async {
    final f = File(p.join((await _mediaDir()).path, imagePath.replaceAll('/', '_')));
    return f.existsSync() ? f : null;
  }

  /// Downloads all admin-uploaded lesson pictures for offline use. Returns the count.
  Future<int> downloadImages(ContentBundle bundle, HttpClient http) async {
    final dir = await _mediaDir();
    var n = 0;
    for (final l in bundle.lessons) {
      for (final s in l.steps) {
        final path = s.imagePath;
        if (path == null || path.isEmpty) continue;
        final f = File(p.join(dir.path, path.replaceAll('/', '_')));
        if (f.existsSync()) {
          n++;
          continue;
        }
        final req = await http.getUrl(Uri.parse(Env.publicMediaUrl(path)));
        final res = await req.close();
        if (res.statusCode == 200) {
          await res.pipe(f.openWrite());
          n++;
        } else {
          await res.drain<void>();
        }
      }
    }
    return n;
  }

  Future<void> clearImages() async {
    final dir = await _mediaDir();
    if (dir.existsSync()) dir.deleteSync(recursive: true);
  }
}
