import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../l10n/gen/app_localizations.dart';
import '../../state/providers.dart';
import '../theme.dart';

extension L10nX on BuildContext {
  AppLocalizations get l => AppLocalizations.of(this);
}

void showSnack(BuildContext context, String text, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(text),
      backgroundColor: error ? Theme.of(context).colorScheme.error : null,
    ));
}

/// Persistent short disclaimer shown on result screens (text is admin-managed).
class DisclaimerBanner extends ConsumerWidget {
  const DisclaimerBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lang = ref.watch(langProvider);
    final text = ref.watch(contentProvider).value?.legalText('disclaimer_short', lang) ?? '';
    if (text.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: RiskColors.warnBg,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      child: Row(children: [
        const Icon(Icons.info_outline, size: 18, color: Color(0xFF8D6E00)),
        const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF5D4600)))),
      ]),
    );
  }
}

class OfflineBanner extends ConsumerWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(isOnlineProvider)) return const SizedBox.shrink();
    return Material(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Row(children: [
          const Icon(Icons.cloud_off, size: 16),
          const SizedBox(width: 8),
          Expanded(child: Text(context.l.offlineBanner, style: const TextStyle(fontSize: 12))),
        ]),
      ),
    );
  }
}

enum Risk { ok, warn, danger }

class RiskChip extends StatelessWidget {
  const RiskChip({super.key, required this.risk, required this.label});

  final Risk risk;
  final String label;

  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon) = switch (risk) {
      Risk.ok => (RiskColors.okBg, RiskColors.ok, Icons.check_circle),
      Risk.warn => (RiskColors.warnBg, const Color(0xFF8D6E00), Icons.warning_amber_rounded),
      Risk.danger => (RiskColors.dangerBg, RiskColors.danger, Icons.dangerous),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 18, color: fg),
        const SizedBox(width: 6),
        Flexible(child: Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w600))),
      ]),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.body, this.action});

  final IconData icon;
  final String title;
  final String? body;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 64, color: t.colorScheme.primary.withValues(alpha: 0.5)),
          const SizedBox(height: 12),
          Text(title, style: t.textTheme.titleMedium, textAlign: TextAlign.center),
          if (body != null) ...[
            const SizedBox(height: 6),
            Text(body!, style: t.textTheme.bodyMedium?.copyWith(color: t.colorScheme.onSurfaceVariant), textAlign: TextAlign.center),
          ],
          if (action != null) ...[const SizedBox(height: 16), action!],
        ]),
      ),
    );
  }
}

/// Loading placeholder blocks (shimmer-free to stay light on old phones).
class Skeleton extends StatelessWidget {
  const Skeleton({super.key, this.lines = 4});

  final int lines;

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme.surfaceContainerHighest;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        for (var i = 0; i < lines; i++)
          Container(
            height: i == 0 ? 120 : 64,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(16)),
          ),
      ]),
    );
  }
}

class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) => EmptyState(
        icon: Icons.error_outline,
        title: message,
        action: onRetry == null ? null : OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: Text(context.l.retry)),
      );
}

/// Big primary action pinned at the bottom (thumb reach, gloves).
class BottomAction extends StatelessWidget {
  const BottomAction({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Padding(padding: const EdgeInsets.fromLTRB(16, 8, 16, 12), child: SizedBox(width: double.infinity, child: child)),
      );
}

/// Built-in SVG illustration for a lesson step (offline default).
class Illustration extends StatelessWidget {
  const Illustration(this.name, {super.key, this.height = 180});

  final String? name;
  final double height;

  @override
  Widget build(BuildContext context) {
    final n = (name == null || name!.isEmpty) ? 'electrician' : name!;
    return SvgPicture.asset('assets/illustrations/$n.svg', height: height, fit: BoxFit.contain);
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(4, 16, 4, 8),
        child: Text(text, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
      );
}

Future<bool> confirmDialog(BuildContext context, {required String title, String? body, String? ok, bool danger = false}) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: body == null ? null : Text(body),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(ctx.l.cancel)),
        FilledButton(
          style: danger ? FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error) : null,
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(ok ?? ctx.l.ok),
        ),
      ],
    ),
  );
  return r == true;
}

String formatMoney(double v, String lang) {
  final s = v.round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
    buf.write(s[i]);
  }
  return buf.toString();
}

/// Wraps features that need a Google account and internet (marketplace, AI checks).
/// Offline-mode users get a button that leaves offline mode, which sends them to sign-in.
class RequiresAccount extends ConsumerWidget {
  const RequiresAccount({super.key, required this.child, this.needsOnline = true});

  final Widget child;
  final bool needsOnline;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    if (ref.watch(currentUserProvider) == null) {
      return EmptyState(
        icon: Icons.lock_outline,
        title: l.needsSignIn,
        action: FilledButton.icon(
          onPressed: () => ref.read(settingsProvider.notifier).setOfflineMode(false),
          icon: const Icon(Icons.login),
          label: Text(l.signInTitle),
        ),
      );
    }
    if (needsOnline && !ref.watch(isOnlineProvider)) {
      return EmptyState(icon: Icons.cloud_off, title: l.needsOnline);
    }
    return child;
  }
}
