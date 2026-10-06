import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/auth_service.dart';
import '../../../state/providers.dart';
import '../../widgets/common.dart';

/// Google is the only sign-in method. "Continue offline" keeps lessons,
/// calculators and local projects available without an account.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  bool _busy = false;

  Future<void> _signIn() async {
    final auth = ref.read(authServiceProvider);
    final l = context.l;
    if (auth == null) {
      showSnack(context, l.errorNetwork, error: true);
      return;
    }
    setState(() => _busy = true);
    try {
      await auth.signInWithGoogle();
      await ref.read(settingsProvider.notifier).setOfflineMode(false);
    } on AuthCancelled {
      // user closed the account picker
    } on AuthNotConfigured {
      if (mounted) showSnack(context, l.signInNotConfigured, error: true);
    } catch (e) {
      if (mounted) showSnack(context, l.signInError(e.toString()), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l;
    final t = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(children: [
            const Spacer(),
            const Illustration('electrician', height: 180),
            const SizedBox(height: 24),
            Text(l.signInTitle, style: t.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Text(l.signInBody, textAlign: TextAlign.center, style: t.textTheme.bodyLarge),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _busy ? null : _signIn,
                icon: _busy
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                    : const Icon(Icons.login),
                label: Text(l.signInGoogle),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _busy ? null : () => ref.read(settingsProvider.notifier).setOfflineMode(true),
                child: Text(l.continueOffline, textAlign: TextAlign.center),
              ),
            ),
            const SizedBox(height: 16),
          ]),
        ),
      ),
    );
  }
}
