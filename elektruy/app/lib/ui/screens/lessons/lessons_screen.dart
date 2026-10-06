import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/content/content_models.dart';
import '../../../core/services/progress_repository.dart';
import '../../../state/providers.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

class LessonsScreen extends ConsumerWidget {
  const LessonsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider);
    final progress = ref.watch(progressProvider).value ?? const {};

    return Scaffold(
      appBar: AppBar(title: Text(l.lessonsTitle)),
      body: Column(children: [
        const OfflineBanner(),
        Expanded(
          child: content.when(
            loading: () => const Skeleton(),
            error: (e, _) => ErrorView(message: l.errorGeneric, onRetry: () => ref.invalidate(contentProvider)),
            data: (c) {
              final lessons = [...c.lessons]..sort((a, b) => a.order.compareTo(b.order));
              final done = lessons.where((x) => progress[x.id]?.completed == true).length;
              return ListView(padding: const EdgeInsets.all(16), children: [
                Row(children: [
                  const Icon(Icons.offline_pin, color: RiskColors.ok, size: 18),
                  const SizedBox(width: 6),
                  Expanded(child: Text(l.lessonsOfflineReady, style: Theme.of(context).textTheme.bodySmall)),
                  Text('$done / ${lessons.length}', style: const TextStyle(fontWeight: FontWeight.w700)),
                ]),
                const SizedBox(height: 6),
                LinearProgressIndicator(value: lessons.isEmpty ? 0 : done / lessons.length, minHeight: 6, borderRadius: BorderRadius.circular(3)),
                const SizedBox(height: 12),
                for (final (i, lesson) in lessons.indexed) _LessonCard(index: i + 1, lesson: lesson, lang: lang, progress: progress[lesson.id]),
              ]);
            },
          ),
        ),
      ]),
    );
  }
}

class _LessonCard extends StatelessWidget {
  const _LessonCard({required this.index, required this.lesson, required this.lang, required this.progress});

  final int index;
  final Lesson lesson;
  final String lang;
  final LessonProgress? progress;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final completed = progress?.completed == true;
    final started = progress != null && !completed;
    final total = lesson.steps.isEmpty ? 1 : lesson.steps.length;
    final checked = progress?.checked.length ?? 0;
    final difficulty = switch (lesson.difficulty) { 1 => l.difficulty1, 2 => l.difficulty2, _ => l.difficulty3 };
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/lessons/${lesson.slug}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Stack(alignment: Alignment.bottomRight, children: [
              Container(
                width: 72,
                height: 72,
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Illustration(lesson.steps.isEmpty ? null : lesson.steps.first.illustration, height: 60),
              ),
              if (completed) const CircleAvatar(radius: 11, backgroundColor: RiskColors.ok, child: Icon(Icons.check, size: 14, color: Colors.white)),
            ]),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('$index. ${lesson.title(lang)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 4),
                Text(lesson.summary(lang), maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 6),
                Wrap(spacing: 10, children: [
                  Text('⏱ ${l.lessonMinutes(lesson.minutes)}', style: Theme.of(context).textTheme.labelMedium),
                  Text('● $difficulty', style: Theme.of(context).textTheme.labelMedium),
                  if (completed) Text(l.lessonCompleted, style: const TextStyle(color: RiskColors.ok, fontWeight: FontWeight.w600)),
                ]),
                if (started) ...[
                  const SizedBox(height: 6),
                  LinearProgressIndicator(value: checked / total, borderRadius: BorderRadius.circular(3)),
                ],
              ]),
            ),
          ]),
        ),
      ),
    );
  }
}
