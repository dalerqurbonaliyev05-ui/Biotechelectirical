import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../core/services/ai_service.dart';
import '../../state/providers.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/safety_gate.dart';

const _maxPhotos = 4;

/// "Check my work": 1–4 photos are reviewed by Claude via the check-work Edge
/// Function. The result is advisory only and always shown with a disclaimer.
class CheckWorkScreen extends ConsumerStatefulWidget {
  const CheckWorkScreen({super.key, this.projectId});

  final String? projectId;

  @override
  ConsumerState<CheckWorkScreen> createState() => _CheckWorkScreenState();
}

class _CheckWorkScreenState extends ConsumerState<CheckWorkScreen> {
  final _photos = <File>[];
  final _context = TextEditingController();
  final _picker = ImagePicker();
  bool _busy = false;
  Map<String, dynamic>? _result;
  bool _flagged = false;
  Future<List<Map<String, dynamic>>>? _history;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  void _loadHistory() {
    final ai = ref.read(aiServiceProvider);
    if (ai == null || ref.read(currentUserProvider) == null) return;
    _history = ai.workCheckHistory();
  }

  Future<void> _add(ImageSource source) async {
    final x = await _picker.pickImage(source: source, maxWidth: 2400, maxHeight: 2400, imageQuality: 90);
    if (x == null) return;
    final dir = await getTemporaryDirectory();
    final target = p.join(dir.path, 'check_${DateTime.now().microsecondsSinceEpoch}.jpg');
    // Re-encode: smaller upload and no EXIF (location) metadata.
    final out = await FlutterImageCompress.compressAndGetFile(x.path, target, minWidth: 1600, minHeight: 1600, quality: 80, keepExif: false);
    if (out == null || !mounted) return;
    setState(() => _photos.add(File(out.path)));
  }

  Future<void> _send() async {
    final ai = ref.read(aiServiceProvider);
    if (ai == null || _photos.isEmpty) return;
    setState(() {
      _busy = true;
      _result = null;
      _flagged = false;
    });
    try {
      final r = await ai.checkWork(
        photos: _photos,
        lang: ref.read(langProvider),
        projectId: widget.projectId,
        context: _context.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _result = r;
        _loadHistory();
      });
    } on AiError catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } catch (e) {
      if (mounted) showSnack(context, context.l.errorGeneric, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _flag() async {
    final id = _result?['id'] as String?;
    if (id == null) return;
    try {
      await ref.read(aiServiceProvider)!.flagWorkCheck(id);
      if (mounted) {
        setState(() => _flagged = true);
        showSnack(context, context.l.checkFlagged);
      }
    } catch (_) {
      if (mounted) showSnack(context, context.l.errorGeneric, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final enabled = ref.watch(contentProvider).value?.feature('ai_check') ?? true;
    return Scaffold(
      appBar: AppBar(title: Text(l.checkTitle)),
      body: RequiresAccount(
        child: !enabled
            ? EmptyState(icon: Icons.pause_circle_outline, title: l.errorGeneric)
            : ListView(padding: const EdgeInsets.all(16), children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: RiskColors.warnBg, borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [
                    const Icon(Icons.info_outline, color: Color(0xFF8D6E00)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(l.aiDisclaimerShort, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF5D4600)))),
                  ]),
                ),
                const SizedBox(height: 12),
                Text(l.checkIntro),
                const SizedBox(height: 12),
                SizedBox(
                  height: 110,
                  child: ListView(scrollDirection: Axis.horizontal, children: [
                    for (final (i, f) in _photos.indexed)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Stack(children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.file(f, width: 110, height: 110, fit: BoxFit.cover, cacheWidth: 300),
                          ),
                          Positioned(
                            right: 0,
                            top: 0,
                            child: IconButton.filledTonal(
                              visualDensity: VisualDensity.compact,
                              onPressed: _busy ? null : () => setState(() => _photos.removeAt(i)),
                              icon: const Icon(Icons.close, size: 18),
                            ),
                          ),
                        ]),
                      ),
                    if (_photos.length < _maxPhotos) ...[
                      _AddTile(icon: Icons.photo_camera, label: l.takePhoto, onTap: _busy ? null : () => _add(ImageSource.camera)),
                      _AddTile(icon: Icons.photo_library, label: l.pickFromGallery, onTap: _busy ? null : () => _add(ImageSource.gallery)),
                    ],
                  ]),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _context,
                  maxLines: 2,
                  maxLength: 500,
                  decoration: InputDecoration(labelText: l.checkContext),
                ),
                SizedBox(
                  height: 56,
                  child: FilledButton.icon(
                    onPressed: _busy || _photos.isEmpty ? null : _send,
                    icon: _busy
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.auto_awesome),
                    label: Text(_busy ? l.checkChecking : l.checkSend),
                  ),
                ),
                if (_result != null) ...[
                  const SizedBox(height: 16),
                  CheckResultView(result: _result!),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _flagged ? null : _flag,
                    icon: const Icon(Icons.flag_outlined),
                    label: Text(_flagged ? l.checkFlagged : l.checkFlagWrong),
                  ),
                  TextButton.icon(
                    onPressed: () => showReportDialog(context, ref, type: 'ai_check', target: _result!['id'] as String? ?? ''),
                    icon: const Icon(Icons.report_outlined),
                    label: Text(l.reportTitle),
                  ),
                ],
                SectionTitle(l.checkHistory),
                FutureBuilder<List<Map<String, dynamic>>>(
                  future: _history,
                  builder: (context, snap) {
                    if (_history == null) return const SizedBox.shrink();
                    if (snap.connectionState != ConnectionState.done) return const LinearProgressIndicator();
                    final rows = snap.data ?? const [];
                    if (rows.isEmpty) return Text('—', style: Theme.of(context).textTheme.bodySmall);
                    final lang = ref.read(langProvider);
                    return Column(children: [
                      for (final r in rows)
                        Card(
                          child: ListTile(
                            leading: _overallIcon(r['overall'] as String?),
                            title: Text(((r['result'] as Map?)?['summary'] as String?) ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                            subtitle: Text(DateFormat.yMMMd(lang).add_Hm().format(DateTime.parse(r['created_at'] as String).toLocal())),
                            trailing: r['flagged_wrong'] == true ? const Icon(Icons.flag, color: RiskColors.danger) : null,
                            onTap: () => showModalBottomSheet<void>(
                              context: context,
                              isScrollControlled: true,
                              useSafeArea: true,
                              builder: (_) => DraggableScrollableSheet(
                                expand: false,
                                initialChildSize: 0.8,
                                builder: (_, sc) => ListView(
                                  controller: sc,
                                  padding: const EdgeInsets.all(16),
                                  children: [CheckResultView(result: {...((r['result'] as Map?) ?? {}).cast<String, dynamic>()})],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ]);
                  },
                ),
                const SizedBox(height: 24),
              ]),
      ),
    );
  }
}

Widget _overallIcon(String? overall) => switch (overall) {
      'ok' => const Icon(Icons.check_circle, color: RiskColors.ok),
      'warning' => const Icon(Icons.warning_amber_rounded, color: Color(0xFFF9A825)),
      'critical' => const Icon(Icons.dangerous, color: RiskColors.danger),
      _ => const Icon(Icons.help_outline),
    };

class _AddTile extends StatelessWidget {
  const _AddTile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(right: 8),
        child: SizedBox(
          width: 110,
          child: OutlinedButton(
            style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            onPressed: onTap,
            child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 30), Text(label, textAlign: TextAlign.center)]),
          ),
        ),
      );
}

/// Renders a check-work result (also used for history entries).
class CheckResultView extends StatelessWidget {
  const CheckResultView({super.key, required this.result});

  final Map<String, dynamic> result;

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final overall = result['overall'] as String?;
    final (risk, title) = switch (overall) {
      'ok' => (Risk.ok, l.checkOk),
      'warning' => (Risk.warn, l.checkWarning),
      'critical' => (Risk.danger, l.checkCritical),
      _ => (Risk.warn, l.checkUnclear),
    };
    final issues = ((result['issues'] as List?) ?? const []).cast<Map>();
    final positives = ((result['positives'] as List?) ?? const []).map((e) => e.toString()).toList();
    final disclaimer = (result['disclaimer'] as String?) ?? l.aiDisclaimerShort;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      RiskChip(risk: risk, label: title),
      if (result['call_electrician'] == true) ...[
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: RiskColors.danger, borderRadius: BorderRadius.circular(12)),
          child: Row(children: [
            const Icon(Icons.power_off, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(l.checkCallElectrician, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16))),
          ]),
        ),
        TextButton.icon(onPressed: () => context.push('/electricians'), icon: const Icon(Icons.engineering), label: Text(l.oosFindElectrician)),
      ],
      const SizedBox(height: 10),
      if ((result['summary'] as String?)?.isNotEmpty == true) Text(result['summary'] as String, style: const TextStyle(fontSize: 16)),
      const SizedBox(height: 8),
      for (final i in issues)
        Card(
          color: switch (i['severity']) { 'critical' => RiskColors.dangerBg, 'warning' => RiskColors.warnBg, _ => null },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(
                  switch (i['severity']) { 'critical' => Icons.dangerous, 'warning' => Icons.warning_amber_rounded, _ => Icons.info_outline },
                  size: 20,
                ),
                const SizedBox(width: 6),
                Text(switch (i['severity']) { 'critical' => l.severityCritical, 'warning' => l.severityWarning, _ => l.severityInfo },
                    style: const TextStyle(fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 4),
              Text((i['title'] as String?) ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              if ((i['detail'] as String?)?.isNotEmpty == true) Text(i['detail'] as String),
              if ((i['location_hint'] as String?)?.isNotEmpty == true)
                Text('📍 ${i['location_hint']}', style: Theme.of(context).textTheme.bodySmall),
              if ((i['lesson_slug'] as String?)?.isNotEmpty == true && i['lesson_slug'] != 'none')
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: () => context.push('/lessons/${i['lesson_slug']}'),
                    icon: const Icon(Icons.school, size: 18),
                    label: Text(l.openLesson),
                  ),
                ),
            ]),
          ),
        ),
      if (positives.isNotEmpty) ...[
        SectionTitle(l.checkPositives),
        for (final s in positives)
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Icon(Icons.check, size: 18, color: RiskColors.ok),
              const SizedBox(width: 6),
              Expanded(child: Text(s)),
            ]),
          ),
      ],
      const SizedBox(height: 10),
      Text(disclaimer, style: Theme.of(context).textTheme.bodySmall?.copyWith(fontStyle: FontStyle.italic)),
    ]);
  }
}
