import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../state/providers.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

/// Offline content: everything ships inside the APK; this screen refreshes it
/// from Supabase and optionally downloads admin-uploaded lesson pictures.
class DownloadsScreen extends ConsumerStatefulWidget {
  const DownloadsScreen({super.key});

  @override
  ConsumerState<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends ConsumerState<DownloadsScreen> {
  bool _busy = false;

  Future<void> _run(Future<void> Function() job) async {
    setState(() => _busy = true);
    try {
      await job();
    } catch (_) {
      if (mounted) showSnack(context, context.l.errorGeneric, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final lang = ref.watch(langProvider);
    final content = ref.watch(contentProvider).value;
    final online = ref.watch(isOnlineProvider);
    final synced = content?.syncedAt;

    return Scaffold(
      appBar: AppBar(title: Text(l.downloadsTitle)),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const OfflineBanner(),
        Text(l.downloadsBody),
        const SizedBox(height: 16),
        Card(
          child: ListTile(
            leading: const Icon(Icons.offline_pin, color: RiskColors.ok, size: 32),
            title: Text(synced == null ? l.neverSynced : l.lastSync(DateFormat.yMMMd(lang).add_Hm().format(synced.toLocal()))),
            subtitle: content == null ? null : Text(l.cachedItems(content.lessons.length, content.materials.length)),
          ),
        ),
        const SizedBox(height: 12),
        if (_busy) const LinearProgressIndicator(),
        const SizedBox(height: 12),
        SizedBox(
          height: 52,
          child: FilledButton.icon(
            onPressed: _busy || !online
                ? null
                : () => _run(() async {
                      final ok = await ref.read(contentProvider.notifier).refresh();
                      if (context.mounted) showSnack(context, ok ? l.contentUpdated : l.errorNetwork, error: !ok);
                    }),
            icon: const Icon(Icons.sync),
            label: Text(l.syncNow),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 52,
          child: OutlinedButton.icon(
            onPressed: _busy || !online
                ? null
                : () => _run(() async {
                      final n = await ref.read(contentProvider.notifier).downloadImages();
                      if (context.mounted) showSnack(context, l.imagesDownloaded(n));
                    }),
            icon: const Icon(Icons.image_outlined),
            label: Text(l.downloadImages),
          ),
        ),
        const SizedBox(height: 10),
        TextButton.icon(
          onPressed: _busy
              ? null
              : () async {
                  if (await confirmDialog(context, title: l.clearCache, ok: l.delete, danger: true)) {
                    await _run(() => ref.read(contentProvider.notifier).reset());
                  }
                },
          icon: const Icon(Icons.delete_outline),
          label: Text(l.clearCache),
        ),
      ]),
    );
  }
}
