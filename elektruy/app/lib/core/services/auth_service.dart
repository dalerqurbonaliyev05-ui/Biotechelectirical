import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../env.dart';

class AuthNotConfigured implements Exception {
  @override
  String toString() => 'GOOGLE_WEB_CLIENT_ID is not set for this build';
}

class AuthCancelled implements Exception {}

/// Google-only sign-in: the native Google account picker returns an ID token that
/// Supabase verifies (signInWithIdToken). A per-session nonce is passed hashed to
/// Google and raw to Supabase so the token cannot be replayed elsewhere.
class AuthService {
  AuthService(this.client);

  final SupabaseClient client;
  bool _initialized = false;
  late final String _rawNonce = _randomNonce();

  static String _randomNonce([int length = 32]) {
    final r = Random.secure();
    return base64Url.encode(List<int>.generate(length, (_) => r.nextInt(256))).replaceAll('=', '');
  }

  Future<void> _init() async {
    if (_initialized) return;
    if (Env.googleWebClientId.isEmpty) throw AuthNotConfigured();
    await GoogleSignIn.instance.initialize(
      serverClientId: Env.googleWebClientId,
      nonce: sha256.convert(utf8.encode(_rawNonce)).toString(),
    );
    _initialized = true;
  }

  Future<AuthResponse> signInWithGoogle() async {
    await _init();
    final GoogleSignInAccount account;
    try {
      account = await GoogleSignIn.instance.authenticate(scopeHint: const ['email', 'profile']);
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) throw AuthCancelled();
      rethrow;
    }
    final idToken = account.authentication.idToken;
    if (idToken == null) throw const AuthException('Google did not return an ID token');
    return client.auth.signInWithIdToken(provider: OAuthProvider.google, idToken: idToken, nonce: _rawNonce);
  }

  Future<void> signOut() async {
    try {
      if (_initialized) await GoogleSignIn.instance.signOut();
    } catch (_) {
      // The Google session may already be gone; the Supabase sign-out below is what matters.
    }
    await client.auth.signOut();
  }
}
