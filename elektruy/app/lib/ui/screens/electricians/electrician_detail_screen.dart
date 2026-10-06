import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/services/electricians_service.dart';
import '../../../state/providers.dart';
import '../../widgets/common.dart';
import '../../widgets/safety_gate.dart';
import 'electricians_screen.dart';

class ElectricianDetailScreen extends ConsumerStatefulWidget {
  const ElectricianDetailScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<ElectricianDetailScreen> createState() => _ElectricianDetailScreenState();
}

class _ElectricianDetailScreenState extends ConsumerState<ElectricianDetailScreen> {
  Electrician? _e;
  List<Review> _reviews = const [];
  bool _loading = true;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final svc = ref.read(electriciansServiceProvider);
    if (svc == null) return;
    setState(() {
      _loading = true;
      _failed = false;
    });
    try {
      final e = await svc.get(widget.id);
      final r = e == null ? <Review>[] : await svc.reviews(widget.id);
      if (mounted) {
        setState(() {
          _e = e;
          _reviews = r;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _failed = true;
        });
      }
    }
  }

  Future<void> _open(Uri uri) async {
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      showSnack(context, context.l.errorGeneric, error: true);
    }
  }

  Future<void> _writeReview(Review? mine) async {
    final l = context.l;
    var rating = mine?.rating ?? 5;
    final text = TextEditingController(text: mine?.text ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: Text(mine == null ? l.writeReview : l.editReview),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(l.yourRating),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              for (var i = 1; i <= 5; i++)
                IconButton(
                  onPressed: () => setLocal(() => rating = i),
                  icon: Icon(i <= rating ? Icons.star : Icons.star_border, color: Colors.amber, size: 32),
                ),
            ]),
            TextField(controller: text, maxLines: 4, maxLength: 1000, decoration: InputDecoration(labelText: l.reviewText)),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l.save)),
          ],
        ),
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(electriciansServiceProvider)!.saveReview(electricianId: widget.id, rating: rating, text: text.text);
      if (mounted) showSnack(context, l.reviewSaved);
      await _load();
    } catch (e) {
      if (mounted) showSnack(context, l.errorGeneric, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final uid = ref.watch(currentUserProvider)?.id;
    final e = _e;
    Review? mine;
    for (final r in _reviews) {
      if (r.userId == uid) mine = r;
    }
    final isSelf = e?.userId != null && e?.userId == uid;

    return Scaffold(
      appBar: AppBar(
        title: Text(e?.name ?? l.electriciansTitle),
        actions: [
          if (e != null && !isSelf)
            PopupMenuButton<String>(
              onSelected: (_) => showReportDialog(context, ref, type: 'electrician', target: e.id),
              itemBuilder: (_) => [PopupMenuItem(value: 'report', child: Text(l.reportElectrician))],
            ),
        ],
      ),
      body: RequiresAccount(
        child: _loading
            ? const Skeleton()
            : _failed || e == null
                ? ErrorView(message: l.errorGeneric, onRetry: _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(padding: const EdgeInsets.all(16), children: [
                      Row(children: [
                        CircleAvatar(radius: 34, child: Text(e.name[0].toUpperCase(), style: const TextStyle(fontSize: 28))),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text(e.name, style: Theme.of(context).textTheme.titleLarge),
                            Text([
                              ref.read(contentProvider).value?.region(e.city)?.name(lang) ?? e.city,
                              if (e.district != null && e.district!.isNotEmpty) e.district,
                            ].join(', ')),
                            Text(l.ratingLabel(e.rating.toStringAsFixed(1), e.ratingCount)),
                          ]),
                        ),
                      ]),
                      const SizedBox(height: 12),
                      Text(l.experienceYears(e.experience)),
                      if (priceText(context, e, lang).isNotEmpty)
                        Text(priceText(context, e, lang), style: const TextStyle(fontWeight: FontWeight.w700)),
                      if (e.bio.isNotEmpty) ...[const SizedBox(height: 10), Text(e.bio)],
                      if (e.services.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Wrap(spacing: 6, runSpacing: 6, children: [for (final s in e.services) Chip(label: Text(serviceLabel(context, s)))]),
                      ],
                      const SizedBox(height: 16),
                      Row(children: [
                        Expanded(
                          child: SizedBox(
                            height: 56,
                            child: FilledButton.icon(
                              onPressed: () => _open(Uri(scheme: 'tel', path: e.phone.replaceAll(RegExp(r'[^0-9+]'), ''))),
                              icon: const Icon(Icons.call),
                              label: Text(l.call),
                            ),
                          ),
                        ),
                        if (e.telegram != null && e.telegram!.isNotEmpty) ...[
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 56,
                              child: OutlinedButton.icon(
                                onPressed: () => _open(Uri.https('t.me', '/${e.telegram!.replaceAll('@', '')}')),
                                icon: const Icon(Icons.send),
                                label: Text(l.telegram),
                              ),
                            ),
                          ),
                        ],
                      ]),
                      SectionTitle(l.reviews),
                      if (!isSelf)
                        OutlinedButton.icon(
                          onPressed: () => _writeReview(mine),
                          icon: const Icon(Icons.rate_review),
                          label: Text(mine == null ? l.writeReview : l.editReview),
                        ),
                      const SizedBox(height: 8),
                      if (_reviews.isEmpty) Padding(padding: const EdgeInsets.all(12), child: Text(l.noReviews)),
                      for (final r in _reviews)
                        Card(
                          child: ListTile(
                            title: Row(children: [
                              for (var i = 1; i <= 5; i++) Icon(i <= r.rating ? Icons.star : Icons.star_border, size: 18, color: Colors.amber),
                              const Spacer(),
                              Text(DateFormat.yMMMd(lang).format(r.createdAt.toLocal()), style: Theme.of(context).textTheme.bodySmall),
                            ]),
                            subtitle: r.text.isEmpty ? null : Text(r.text),
                            trailing: r.userId == uid
                                ? null
                                : IconButton(
                                    icon: const Icon(Icons.flag_outlined, size: 18),
                                    tooltip: l.reportTitle,
                                    onPressed: () => showReportDialog(context, ref, type: 'review', target: r.id),
                                  ),
                          ),
                        ),
                    ]),
                  ),
      ),
    );
  }
}
