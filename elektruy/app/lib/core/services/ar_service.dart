import 'package:flutter/services.dart';

enum ArAvailability { supported, notInstalled, unsupported }

/// Two-tap distance measuring with ARCore (native Kotlin activity, see
/// android/app/src/main/kotlin/.../ArMeasureActivity.kt). On phones without
/// ARCore the feature is hidden and the user types the size instead.
class ArService {
  static const _channel = MethodChannel('elektruy/ar');

  Future<ArAvailability> availability() async {
    try {
      final r = await _channel.invokeMethod<String>('availability');
      return switch (r) {
        'supported' => ArAvailability.supported,
        'not_installed' => ArAvailability.notInstalled,
        _ => ArAvailability.unsupported,
      };
    } on PlatformException {
      return ArAvailability.unsupported;
    } on MissingPluginException {
      return ArAvailability.unsupported;
    }
  }

  /// Opens the AR screen; returns the measured distance in metres or null if cancelled.
  Future<double?> measure({
    required String scanHint,
    required String tapFirst,
    required String tapSecond,
    required String useLabel,
    required String resetLabel,
  }) async {
    try {
      final r = await _channel.invokeMethod<double>('measure', {
        'scanHint': scanHint,
        'tapFirst': tapFirst,
        'tapSecond': tapSecond,
        'use': useLabel,
        'reset': resetLabel,
      });
      return r;
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }
}
