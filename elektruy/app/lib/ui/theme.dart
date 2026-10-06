import 'package:flutter/material.dart';

/// Risk colours used across the app (green = fine, amber = check, red = stop).
class RiskColors {
  static const ok = Color(0xFF2E7D32);
  static const warn = Color(0xFFF9A825);
  static const danger = Color(0xFFC62828);
  static const okBg = Color(0xFFE8F5E9);
  static const warnBg = Color(0xFFFFF8E1);
  static const dangerBg = Color(0xFFFFEBEE);
}

class AppTheme {
  static const seed = Color(0xFF1565C0);

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness b) {
    final scheme = ColorScheme.fromSeed(seedColor: seed, brightness: b, secondary: const Color(0xFFFFB300));
    final base = ThemeData(colorScheme: scheme, useMaterial3: true, brightness: b);
    // Large tap targets: the user may wear gloves or have dirty hands.
    const minSize = Size(64, 56);
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(16));
    return base.copyWith(
      visualDensity: VisualDensity.standard,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: minSize, shape: shape, textStyle: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600)),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(minimumSize: minSize, shape: shape, textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      ),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(minimumSize: const Size(48, 48))),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide(color: scheme.outlineVariant)),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      checkboxTheme: CheckboxThemeData(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6))),
      listTileTheme: const ListTileThemeData(minVerticalPadding: 12, contentPadding: EdgeInsets.symmetric(horizontal: 16)),
      appBarTheme: AppBarTheme(centerTitle: false, backgroundColor: scheme.surface, scrolledUnderElevation: 1),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}
