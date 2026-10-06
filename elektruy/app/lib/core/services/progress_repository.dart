import 'dart:convert';

import 'package:drift/drift.dart' show Value;
import 'package:supabase_flutter/supabase_flutter.dart';

import '../db/local_db.dart';

class LessonProgress {
  LessonProgress({required this.lessonId, this.stepIndex = 0, Set<int>? checked, this.quizScore, this.completedAt})
      : checked = checked ?? {};

  final String lessonId;
  int stepIndex;
  final Set<int> checked;
  int? quizScore;
  DateTime? completedAt;

  bool get completed => completedAt != null;
}

/// Lesson progress: saved locally at every step, pushed to ew_lesson_progress when online.
class ProgressRepository {
  ProgressRepository(this.db, this.client);

  final LocalDb db;
  final SupabaseClient? client;

  Future<Map<String, LessonProgress>> all() async {
    final rows = await db.allProgress();
    return {
      for (final r in rows)
        r.lessonId: LessonProgress(
          lessonId: r.lessonId,
          stepIndex: r.stepIndex,
          checked: (jsonDecode(r.checkedSteps) as List).map((e) => (e as num).toInt()).toSet(),
          quizScore: r.quizScore,
          completedAt: r.completedAt == null ? null : DateTime.fromMillisecondsSinceEpoch(r.completedAt!),
        ),
    };
  }

  Future<void> save(LessonProgress p) => db.saveProgress(LessonProgressRowsCompanion.insert(
        lessonId: p.lessonId,
        stepIndex: Value(p.stepIndex),
        checkedSteps: Value(jsonEncode(p.checked.toList()..sort())),
        quizScore: Value(p.quizScore),
        completedAt: Value(p.completedAt?.millisecondsSinceEpoch),
        updatedAt: DateTime.now().millisecondsSinceEpoch,
        dirty: const Value(true),
      ));

  Future<int> sync() async {
    final c = client;
    if (c == null || c.auth.currentUser == null) return 0;
    final rows = (await db.allProgress()).where((r) => r.dirty).toList();
    for (final r in rows) {
      await c.from('ew_lesson_progress').upsert({
        'user_id': c.auth.currentUser!.id,
        'lesson_id': r.lessonId,
        'step_index': r.stepIndex,
        'checked_steps': jsonDecode(r.checkedSteps),
        'quiz_score': r.quizScore,
        'completed_at': r.completedAt == null ? null : DateTime.fromMillisecondsSinceEpoch(r.completedAt!).toUtc().toIso8601String(),
      });
      await db.markProgressClean(r.lessonId);
    }
    // Pull progress made on other devices for lessons not started here.
    final local = {for (final r in await db.allProgress()) r.lessonId};
    final remote = await c.from('ew_lesson_progress').select('lesson_id, step_index, checked_steps, quiz_score, completed_at');
    for (final r in remote) {
      if (local.contains(r['lesson_id'])) continue;
      await db.saveProgress(LessonProgressRowsCompanion.insert(
        lessonId: r['lesson_id'] as String,
        stepIndex: Value((r['step_index'] as num).toInt()),
        checkedSteps: Value(jsonEncode(r['checked_steps'] ?? [])),
        quizScore: Value((r['quiz_score'] as num?)?.toInt()),
        completedAt: Value(r['completed_at'] == null ? null : DateTime.parse(r['completed_at'] as String).millisecondsSinceEpoch),
        updatedAt: DateTime.now().millisecondsSinceEpoch,
        dirty: const Value(false),
      ));
    }
    return rows.length;
  }
}
