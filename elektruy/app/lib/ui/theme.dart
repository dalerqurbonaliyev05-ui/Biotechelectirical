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

/// Light, clean look: white cards on a soft grey-blue background, one strong
/// blue for actions and a yellow accent, large rounded shapes and big tap targets.
class AppTheme {
  static const seed = Color(0xFF1E66F5);
  static const accent = Color(0xFFFFB300);
  static const radius = 20.0;

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness b) {
    final isDark = b == Brightness.dark;
    final scheme = ColorScheme.fromSeed(
      seedColor: seed,
      brightness: b,
      primary: isDark ? const Color(0xFF8AB4FF) : seed,
      secondary: accent,
      onSecondary: const Color(0xFF2B1D00),
      surface: isDark ? const Color(0xFF161B22) : Colors.white,
    );
    final background = isDark ? const Color(0xFF0E1116) : const Color(0xFFF4F6FA);
    final base = ThemeData(colorScheme: scheme, useMaterial3: true, brightness: b, fontFamily: 'NotoSans');
    final text = base.textTheme.copyWith(
      headlineSmall: base.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
      titleLarge: base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      titleMedium: base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(fontSize: 16, height: 1.4),
    );
    // Large tap targets: the user may wear gloves or have dirty hands.
    const minSize = Size(64, 56);
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(16));
    return base.copyWith(
      scaffoldBackgroundColor: background,
      textTheme: text,
      visualDensity: VisualDensity.standard,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: minSize, shape: shape, textStyle: text.labelLarge?.copyWith(fontSize: 17, fontWeight: FontWeight.w700)),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: minSize,
          shape: shape,
          side: BorderSide(color: scheme.outlineVariant),
          textStyle: text.labelLarge?.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(minimumSize: const Size(48, 48), textStyle: text.labelLarge?.copyWith(fontSize: 15, fontWeight: FontWeight.w700))),
      cardTheme: CardThemeData(
        elevation: 0,
        color: scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
          side: BorderSide(color: isDark ? const Color(0xFF242B35) : const Color(0xFFE6EAF1)),
        ),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: scheme.outlineVariant)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      checkboxTheme: CheckboxThemeData(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6))),
      chipTheme: base.chipTheme.copyWith(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)), side: BorderSide.none),
      listTileTheme: const ListTileThemeData(minVerticalPadding: 12, contentPadding: EdgeInsets.symmetric(horizontal: 16)),
      appBarTheme: AppBarTheme(
        centerTitle: false,
        backgroundColor: background,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        titleTextStyle: text.titleLarge?.copyWith(color: scheme.onSurface, fontWeight: FontWeight.w800),
      ),
      tabBarTheme: TabBarThemeData(
        dividerColor: Colors.transparent,
        indicatorSize: TabBarIndicatorSize.tab,
        indicator: BoxDecoration(color: scheme.primary, borderRadius: BorderRadius.circular(14)),
        labelColor: scheme.onPrimary,
        unselectedLabelColor: scheme.onSurfaceVariant,
        labelStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w700, fontSize: 14),
        unselectedLabelStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600, fontSize: 14),
        labelPadding: const EdgeInsets.symmetric(horizontal: 4),
        splashBorderRadius: BorderRadius.circular(14),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        showDragHandle: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      ),
      dialogTheme: DialogThemeData(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
      snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
      progressIndicatorTheme: ProgressIndicatorThemeData(linearTrackColor: scheme.primaryContainer),
    );
  }
}
