import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/content/content_models.dart';
import '../../../core/services/progress_repository.dart';
import '../../../core/services/voice_service.dart';
import '../../../state/providers.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/safety_gate.dart';

/// Minimum quiz score (percent) for a lesson to count as completed.
const kQuizPassPct = 60;

/// Step-by-step lesson with the safety gate, hands-free voice guide, step
/// checkboxes, progress saved locally after every action, and a short quiz.
class LessonPlayerScreen extends ConsumerStatefulWidget {
  const LessonPlayerScreen({super.key, required this.slug});

  final String slug;

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen> {
  final _pages = PageController();
  Lesson? _lesson;
  late LessonProgress _progress;
  int _page = 0;
  bool _gatePassed = false;
  bool _voiceOn = false;
  bool _listening = false;
  bool _voiceMissing = false;
  StreamSubscription<VoiceCommand>? _cmdSub;
  StreamSubscription<bool>? _listenSub;

  VoiceService get _voice => ref.read(voiceServiceProvider);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  Future<void> _start() async {
    final content = await ref.read(contentProvider.future);
    final lesson = content.lessonBySlug(widget.slug);
    if (!mounted) return;
    if (lesson == null) {
      setState(() => _lesson = null);
      return;
    }
    final all = await ref.read(progressProvider.future);
    _progress = all[lesson.id] ?? LessonProgress(lessonId: lesson.id);
    setState(() => _lesson = lesson);
    if (!mounted) return;
    final ok = await showSafetyGate(context, ref, logContext: {'lesson': lesson.slug});
    if (!mounted) return;
    if (!ok) {
      context.pop();
      return;
    }
    final start = _progress.completed ? 0 : _progress.stepIndex.clamp(0, lesson.steps.length - 1);
    setState(() {
      _gatePassed = true;
      _page = start;
    });
    if (start > 0) _pages.jumpToPage(start);
    if (ref.read(settingsProvider).voiceGuide) await _toggleVoice(true);
  }

  @override
  void dispose() {
    _cmdSub?.cancel();
    _listenSub?.cancel();
    if (_voiceOn) {
      unawaited(_voice.stopHandsFree());
      unawaited(_voice.stopSpeaking());
    }
    _pages.dispose();
    super.dispose();
  }

  String get _lang => ref.read(langProvider);

  Future<void> _toggleVoice(bool on) async {
    if (!on) {
      await _cmdSub?.cancel();
      await _listenSub?.cancel();
      await _voice.stopHandsFree();
      await _voice.stopSpeaking();
      if (mounted) {
        setState(() {
          _voiceOn = false;
          _listening = false;
        });
      }
      return;
    }
    final hasVoice = await _voice.setLanguage(_lang);
    _cmdSub ??= _voice.commands.listen(_onCommand);
    _listenSub ??= _voice.listening.listen((v) {
      if (mounted) setState(() => _listening = v);
    });
    final commands = await _voice.startHandsFree();
    if (!mounted) return;
    setState(() {
      _voiceOn = true;
      _voiceMissing = !hasVoice;
    });
    if (!commands) {
      showSnack(context, context.l.voiceUnavailable);
    } else if (!hasVoice) {
      showSnack(context, context.l.voiceNoLanguage);
    }
    _speakCurrent();
  }

  void _onCommand(VoiceCommand c) {
    switch (c) {
      case VoiceCommand.next:
        _go(_page + 1);
      case VoiceCommand.back:
        _go(_page - 1);
      case VoiceCommand.repeat:
        _speakCurrent();
    }
  }

  void _speakCurrent() {
    final lesson = _lesson;
    if (!_voiceOn || lesson == null) return;
    final l = context.l;
    if (_page >= lesson.steps.length) {
      unawaited(_voice.speak(l.quizTitle));
      return;
    }
    final step = lesson.steps[_page];
    final warning = step.warning(_lang);
    unawaited(_voice.speak([
      l.lessonStepOf(_page + 1, lesson.steps.length),
      step.text(_lang),
      if (warning.isNotEmpty) '${l.warningLabel}. $warning',
    ].join('. ')));
  }

  int get _pageCount => _lesson!.steps.length + (_lesson!.quiz.isEmpty ? 0 : 1);

  void _go(int page) {
    if (page < 0 || page >= _pageCount) return;
    _pages.animateToPage(page, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  void _onPageChanged(int page) {
    setState(() => _page = page);
    if (page < _lesson!.steps.length) {
      _progress.stepIndex = page;
      unawaited(ref.read(progressProvider.notifier).save(_progress));
    }
    _speakCurrent();
  }

  void _toggleChecked(int i, bool v) {
    setState(() => v ? _progress.checked.add(i) : _progress.checked.remove(i));
    unawaited(ref.read(progressProvider.notifier).save(_progress));
  }

  Future<void> _finish({int? score}) async {
    _progress
      ..quizScore = score ?? _progress.quizScore
      ..completedAt = DateTime.now()
      ..stepIndex = 0;
    await ref.read(progressProvider.notifier).save(_progress);
    unawaited(ref.read(syncProvider).run());
    if (mounted) {
      showSnack(context, context.l.lessonCompleted);
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final lesson = _lesson;
    if (lesson == null) {
      return Scaffold(appBar: AppBar(), body: const Skeleton());
    }
    final steps = lesson.steps;
    final onQuiz = _page >= steps.length;
    return Scaffold(
      appBar: AppBar(
        title: Text(lesson.title(lang), maxLines: 2, style: const TextStyle(fontSize: 18)),
        actions: [
          IconButton(
            tooltip: l.voiceGuide,
            onPressed: _gatePassed ? () => _toggleVoice(!_voiceOn) : null,
            icon: Icon(_voiceOn ? Icons.record_voice_over : Icons.voice_over_off),
          ),
          PopupMenuButton<String>(
            onSelected: (_) => showReportDialog(
              context,
              ref,
              type: 'lesson',
              target: onQuiz ? '${lesson.slug}#quiz' : '${lesson.slug}#${steps[_page].id}',
            ),
            itemBuilder: (_) => [PopupMenuItem(value: 'report', child: Text(l.reportMistake))],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(6),
          child: LinearProgressIndicator(value: (_page + 1) / _pageCount, minHeight: 6),
        ),
      ),
      body: !_gatePassed
          ? const Skeleton()
          : Column(children: [
              if (_voiceOn)
                Material(
                  color: Theme.of(context).colorScheme.secondaryContainer,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    child: Row(children: [
                      Icon(_listening ? Icons.mic : Icons.mic_none, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _listening ? '${l.voiceListening} ${l.voiceCommandsHint}' : l.voiceCommandsHint,
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      if (_voiceMissing) const Icon(Icons.translate, size: 16),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: _speakCurrent,
                        icon: const Icon(Icons.replay),
                        tooltip: 'repeat',
                      ),
                    ]),
                  ),
                ),
              Expanded(
                child: PageView.builder(
                  controller: _pages,
                  itemCount: _pageCount,
                  onPageChanged: _onPageChanged,
                  itemBuilder: (_, i) => i < steps.length
                      ? _StepPage(
                          step: steps[i],
                          index: i,
                          total: steps.length,
                          lang: lang,
                          checked: _progress.checked.contains(i),
                          onChecked: (v) => _toggleChecked(i, v),
                        )
                      : _QuizPage(lesson: lesson, lang: lang, onFinish: (score) => _finish(score: score)),
                ),
              ),
            ]),
      bottomNavigationBar: !_gatePassed || onQuiz
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
                child: Row(children: [
                  Expanded(
                    child: SizedBox(
                      height: 56,
                      child: OutlinedButton.icon(
                        onPressed: _page == 0 ? null : () => _go(_page - 1),
                        icon: const Icon(Icons.arrow_back),
                        label: Text(l.prevStep),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: SizedBox(
                      height: 56,
                      child: FilledButton.icon(
                        onPressed: () {
                          if (_page < _pageCount - 1) {
                            _go(_page + 1);
                          } else {
                            _finish();
                          }
                        },
                        icon: Icon(_page == steps.length - 1 && lesson.quiz.isEmpty ? Icons.flag : Icons.arrow_forward),
                        label: Text(_page < steps.length - 1
                            ? l.nextStep
                            : lesson.quiz.isEmpty
                                ? l.quizFinish
                                : l.toQuiz),
                      ),
                    ),
                  ),
                ]),
              ),
            ),
    );
  }
}

class _StepPage extends ConsumerWidget {
  const _StepPage({
    required this.step,
    required this.index,
    required this.total,
    required this.lang,
    required this.checked,
    required this.onChecked,
  });

  final LessonStep step;
  final int index;
  final int total;
  final String lang;
  final bool checked;
  final ValueChanged<bool> onChecked;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final warning = step.warning(lang);
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(l.lessonStepOf(index + 1, total), style: Theme.of(context).textTheme.labelLarge),
      const SizedBox(height: 8),
      Container(
        height: 200,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
        child: _StepImage(step: step),
      ),
      const SizedBox(height: 16),
      Text(step.text(lang), style: const TextStyle(fontSize: 20, height: 1.4)),
      if (warning.isNotEmpty) ...[
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: RiskColors.dangerBg, borderRadius: BorderRadius.circular(12)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(Icons.warning_amber_rounded, color: RiskColors.danger),
            const SizedBox(width: 8),
            Expanded(
              child: Text(warning, style: const TextStyle(color: RiskColors.danger, fontWeight: FontWeight.w600, fontSize: 16)),
            ),
          ]),
        ),
      ],
      if (step.tools.isNotEmpty) ...[
        const SizedBox(height: 14),
        Text(l.toolsNeeded, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        Wrap(spacing: 6, runSpacing: 6, children: [
          for (final t in step.tools) Chip(avatar: const Icon(Icons.build, size: 16), label: Text(_toolName(ref, t, lang))),
        ]),
      ],
      const SizedBox(height: 16),
      Card(
        color: checked ? RiskColors.okBg : null,
        child: CheckboxListTile(
          value: checked,
          onChanged: (v) => onChecked(v ?? false),
          title: Text(l.stepDoneCheck, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
          controlAffinity: ListTileControlAffinity.leading,
        ),
      ),
    ]);
  }

  /// Tools are material keys when they exist in the catalogue; otherwise shown as is.
  String _toolName(WidgetRef ref, String key, String lang) => ref.read(contentProvider).value?.material(key)?.name(lang) ?? key;
}

/// Admin-uploaded picture if it was downloaded for offline use, otherwise the
/// built-in illustration.
class _StepImage extends ConsumerWidget {
  const _StepImage({required this.step});

  final LessonStep step;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final path = step.imagePath;
    if (path == null || path.isEmpty) return Illustration(step.illustration, height: 200);
    return FutureBuilder<File?>(
      future: ref.read(contentRepoProvider).localImage(path),
      builder: (_, snap) {
        final f = snap.data;
        if (f != null) return Image.file(f, fit: BoxFit.contain);
        return Illustration(step.illustration, height: 200);
      },
    );
  }
}

class _QuizPage extends StatefulWidget {
  const _QuizPage({required this.lesson, required this.lang, required this.onFinish});

  final Lesson lesson;
  final String lang;
  final ValueChanged<int> onFinish;

  @override
  State<_QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends State<_QuizPage> {
  final _answers = <int, int>{};

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final quiz = widget.lesson.quiz;
    final allAnswered = _answers.length == quiz.length;
    final correct = quiz.indexed.where((e) => _answers[e.$1] == e.$2.correct).length;
    final score = quiz.isEmpty ? 100 : (correct * 100 / quiz.length).round();
    final passed = score >= kQuizPassPct;
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(l.quizTitle, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 12),
      for (final (qi, q) in quiz.indexed)
        Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${qi + 1}. ${q.question(widget.lang)}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              RadioGroup<int>(
                groupValue: _answers[qi],
                onChanged: (v) {
                  if (_answers.containsKey(qi) || v == null) return;
                  setState(() => _answers[qi] = v);
                },
                child: Column(children: [
                  for (final (oi, o) in q.options(widget.lang).indexed)
                    RadioListTile<int>(
                      value: oi,
                      enabled: !_answers.containsKey(qi),
                      title: Text(o),
                      tileColor: !_answers.containsKey(qi)
                          ? null
                          : oi == q.correct
                              ? RiskColors.okBg
                              : _answers[qi] == oi
                                  ? RiskColors.dangerBg
                                  : null,
                    ),
                ]),
              ),
              if (_answers.containsKey(qi)) ...[
                const SizedBox(height: 4),
                Text(
                  _answers[qi] == q.correct ? l.quizCorrect : l.quizWrong,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: _answers[qi] == q.correct ? RiskColors.ok : RiskColors.danger,
                  ),
                ),
                if (q.explanation(widget.lang).isNotEmpty) Text(q.explanation(widget.lang)),
              ],
            ]),
          ),
        ),
      if (allAnswered) ...[
        Text(l.quizScore(score), style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        if (!passed)
          OutlinedButton.icon(
            onPressed: () => setState(_answers.clear),
            icon: const Icon(Icons.refresh),
            label: Text(l.quizRetry),
          ),
        if (passed)
          SizedBox(
            height: 56,
            child: FilledButton.icon(onPressed: () => widget.onFinish(score), icon: const Icon(Icons.flag), label: Text(l.quizFinish)),
          ),
      ],
      const SizedBox(height: 24),
    ]);
  }
}
