import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/services/ai_service.dart';
import '../../../state/providers.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

final _packageInfoProvider = FutureProvider<PackageInfo>((ref) => PackageInfo.fromPlatform());

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _busy = false;

  Future<void> _signOut() async {
    final l = context.l;
    setState(() => _busy = true);
    try {
      await ref.read(syncProvider).run();
      final unsynced = (await ref.read(dbProvider).dirtyProjects()).isNotEmpty || (await ref.read(dbProvider).pending()).isNotEmpty;
      if (unsynced && mounted) {
        final go = await confirmDialog(context, title: l.signOut, body: l.signOutUnsynced, ok: l.signOut, danger: true);
        if (!go) return;
      }
      // Shared phones: nothing from this account stays on the device.
      await ref.read(projectRepoProvider).wipeLocal();
      await ref.read(authServiceProvider)?.signOut();
      ref.invalidate(projectsProvider);
      ref.invalidate(progressProvider);
    } catch (_) {
      if (mounted) showSnack(context, l.errorGeneric, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _deleteAccount() async {
    final l = context.l;
    final ctrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          icon: const Icon(Icons.delete_forever, color: RiskColors.danger, size: 40),
          title: Text(l.deleteAccount),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(l.deleteAccountBody),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              autofocus: true,
              decoration: InputDecoration(labelText: l.deleteAccountTypeHint),
              onChanged: (_) => setLocal(() {}),
            ),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: RiskColors.danger),
              onPressed: ctrl.text.trim() == 'DELETE' ? () => Navigator.pop(ctx, true) : null,
              child: Text(l.delete),
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(aiServiceProvider)!.deleteMyData();
      await ref.read(projectRepoProvider).wipeLocal();
      await ref.read(authServiceProvider)?.signOut();
      ref.invalidate(projectsProvider);
      ref.invalidate(progressProvider);
      if (mounted) showSnack(context, l.deleteAccountDone);
    } on AiError catch (e) {
      if (mounted) showSnack(context, e.message, error: true);
    } catch (_) {
      if (mounted) showSnack(context, l.errorGeneric, error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final s = ref.watch(settingsProvider);
    final n = ref.read(settingsProvider.notifier);
    final lang = s.locale;
    final content = ref.watch(contentProvider).value;
    final user = ref.watch(currentUserProvider);
    final online = ref.watch(isOnlineProvider);
    final version = ref.watch(_packageInfoProvider).value;

    return Scaffold(
      appBar: AppBar(title: Text(l.settingsTitle)),
      body: AbsorbPointer(
        absorbing: _busy,
        child: ListView(children: [
          if (_busy) const LinearProgressIndicator(),
          _Header(l.language),
          RadioGroup<String>(
            groupValue: s.locale,
            onChanged: (v) {
              if (v != null) n.setLocale(v);
            },
            child: Column(children: [
              for (final (code, name) in [('uz', l.languageUz), ('ru', l.languageRu), ('en', l.languageEn)])
                RadioListTile<String>(value: code, title: Text(name)),
            ]),
          ),
          _Header(l.theme),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedButton<ThemeMode>(
              segments: [
                ButtonSegment(value: ThemeMode.system, label: Text(l.themeSystem), icon: const Icon(Icons.brightness_auto)),
                ButtonSegment(value: ThemeMode.light, label: Text(l.themeLight), icon: const Icon(Icons.light_mode)),
                ButtonSegment(value: ThemeMode.dark, label: Text(l.themeDark), icon: const Icon(Icons.dark_mode)),
              ],
              selected: {s.themeMode},
              onSelectionChanged: (v) => n.setTheme(v.first),
            ),
          ),
          _Header(l.units),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'm', label: Text(l.unitsMeters)),
                ButtonSegment(value: 'cm', label: Text(l.unitsCentimeters)),
              ],
              selected: {s.units},
              onSelectionChanged: (v) => n.setUnits(v.first),
            ),
          ),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.place_outlined),
            title: Text(l.region),
            subtitle: Text(content?.region(s.region)?.name(lang) ?? s.region),
            onTap: content == null
                ? null
                : () async {
                    final code = await showDialog<String>(
                      context: context,
                      builder: (ctx) => SimpleDialog(
                        title: Text(l.region),
                        children: [
                          for (final r in content.regions)
                            SimpleDialogOption(onPressed: () => Navigator.pop(ctx, r.code), child: Text(r.name(lang))),
                        ],
                      ),
                    );
                    if (code != null) await n.setRegion(code);
                  },
          ),
          ListTile(
            leading: const Icon(Icons.payments_outlined),
            title: Text(l.currency),
            trailing: SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'UZS', label: Text(l.currencyUZS)),
                ButtonSegment(value: 'USD', label: Text(l.currencyUSD)),
              ],
              selected: {s.currency},
              onSelectionChanged: (v) => n.setCurrency(v.first),
            ),
          ),
          SwitchListTile(
            secondary: const Icon(Icons.record_voice_over),
            title: Text(l.voiceGuide),
            subtitle: Text(l.voiceGuideAuto),
            value: s.voiceGuide,
            onChanged: n.setVoice,
          ),
          ListTile(
            leading: const Icon(Icons.download_for_offline_outlined),
            title: Text(l.downloadsTitle),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/downloads'),
          ),
          _Header(l.legal),
          for (final kind in ['disclaimer', 'privacy'])
            ListTile(
              leading: Icon(kind == 'privacy' ? Icons.privacy_tip_outlined : Icons.health_and_safety_outlined),
              title: Text(kind == 'privacy' ? l.privacyTitle : l.disclaimerTitle),
              subtitle: s.acceptedAt == null
                  ? null
                  : Text(l.legalAcceptedOn(
                      '${kind == 'privacy' ? s.privacyVersion : s.disclaimerVersion}',
                      DateFormat.yMMMd(lang).format(s.acceptedAt!),
                    )),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/legal/$kind'),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Text(l.privacyNote, style: Theme.of(context).textTheme.bodySmall),
          ),
          _Header(l.account),
          if (user != null) ...[
            ListTile(
              leading: const Icon(Icons.account_circle),
              title: Text(l.signedInAs(user.email ?? '')),
            ),
            ListTile(leading: const Icon(Icons.logout), title: Text(l.signOut), onTap: _signOut),
            ListTile(
              leading: const Icon(Icons.delete_forever, color: RiskColors.danger),
              title: Text(l.deleteAccount, style: const TextStyle(color: RiskColors.danger)),
              subtitle: online ? null : Text(l.needsOnline),
              onTap: online ? _deleteAccount : null,
            ),
          ] else ...[
            ListTile(
              leading: const Icon(Icons.no_accounts),
              title: Text(l.notSignedIn),
              subtitle: s.offlineMode ? Text(l.offlineModeOn) : null,
            ),
            ListTile(
              leading: const Icon(Icons.login),
              title: Text(l.signInGoogle),
              onTap: () => n.setOfflineMode(false),
            ),
          ],
          _Header(l.about),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: Text(l.appTitle),
            subtitle: Text(l.appVersion(version == null ? '…' : '${version.version}+${version.buildNumber}')),
          ),
          if (user != null)
            ListTile(
              leading: const Icon(Icons.report_outlined),
              title: Text(l.reportTitle),
              onTap: () => _report(),
            ),
          const SizedBox(height: 24),
        ]),
      ),
    );
  }

  Future<void> _report() async {
    final ctrl = TextEditingController();
    final l = context.l;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.reportTitle),
        content: TextField(controller: ctrl, maxLines: 5, maxLength: 2000, decoration: InputDecoration(hintText: l.reportText)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim().isNotEmpty), child: Text(l.reportSend)),
        ],
      ),
    );
    if (ok == true) {
      await ref.read(syncProvider).queueReport(type: 'other', target: 'app', text: ctrl.text.trim());
      if (mounted) showSnack(context, l.reportSent);
    }
  }
}

class _Header extends StatelessWidget {
  const _Header(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 6),
        child: Text(text.toUpperCase(),
            style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700, fontSize: 13, letterSpacing: 0.8)),
      );
}
