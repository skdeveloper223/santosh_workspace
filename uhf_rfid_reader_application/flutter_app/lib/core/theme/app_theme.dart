import 'package:flutter/material.dart';
import 'palettes.dart';

/// Tokens Flutter's ColorScheme has no slot for (§8.4.2's --color-text-faint,
/// --color-success-bg, etc.) — a ThemeExtension so `Theme.of(context).extension<AppColors>()!`
/// reads exactly like the web app's CSS custom properties.
class AppColors extends ThemeExtension<AppColors> {
  final Color textFaint;
  final Color borderStrong;
  final Color success;
  final Color successBg;
  final Color warning;
  final Color warningBg;
  final Color danger;
  final Color dangerBg;
  final Color info;
  final Color infoBg;
  final Color surfaceRaised;

  const AppColors({
    required this.textFaint,
    required this.borderStrong,
    required this.success,
    required this.successBg,
    required this.warning,
    required this.warningBg,
    required this.danger,
    required this.dangerBg,
    required this.info,
    required this.infoBg,
    required this.surfaceRaised,
  });

  @override
  AppColors copyWith({
    Color? textFaint,
    Color? borderStrong,
    Color? success,
    Color? successBg,
    Color? warning,
    Color? warningBg,
    Color? danger,
    Color? dangerBg,
    Color? info,
    Color? infoBg,
    Color? surfaceRaised,
  }) {
    return AppColors(
      textFaint: textFaint ?? this.textFaint,
      borderStrong: borderStrong ?? this.borderStrong,
      success: success ?? this.success,
      successBg: successBg ?? this.successBg,
      warning: warning ?? this.warning,
      warningBg: warningBg ?? this.warningBg,
      danger: danger ?? this.danger,
      dangerBg: dangerBg ?? this.dangerBg,
      info: info ?? this.info,
      infoBg: infoBg ?? this.infoBg,
      surfaceRaised: surfaceRaised ?? this.surfaceRaised,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    return AppColors(
      textFaint: Color.lerp(textFaint, other.textFaint, t)!,
      borderStrong: Color.lerp(borderStrong, other.borderStrong, t)!,
      success: Color.lerp(success, other.success, t)!,
      successBg: Color.lerp(successBg, other.successBg, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      warningBg: Color.lerp(warningBg, other.warningBg, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      dangerBg: Color.lerp(dangerBg, other.dangerBg, t)!,
      info: Color.lerp(info, other.info, t)!,
      infoBg: Color.lerp(infoBg, other.infoBg, t)!,
      surfaceRaised: Color.lerp(surfaceRaised, other.surfaceRaised, t)!,
    );
  }
}

ThemeData buildAppTheme(AppPalette palette, Brightness brightness) {
  final accent = accentFor(palette, brightness);
  final isDark = brightness == Brightness.dark;

  final bg = isDark ? darkBg : lightNeutralsFor(palette).bg;
  final surface = isDark ? darkSurface : Colors.white;
  final surfaceRaised = isDark ? darkSurfaceRaised : Colors.white;
  final border = isDark ? darkBorder : lightNeutralsFor(palette).border;
  final borderStrong = isDark ? darkBorderStrong : lightBorderStrong;
  final text = isDark ? darkText : lightText;
  final textMuted = isDark ? darkTextMuted : lightTextMuted;
  final textFaint = isDark ? darkTextFaint : lightTextFaint;
  final onPrimary = isDark ? const Color(0xFF04101F) : Colors.white;

  final colorScheme = ColorScheme(
    brightness: brightness,
    primary: accent.primary,
    onPrimary: onPrimary,
    secondary: accent.accent,
    onSecondary: onPrimary,
    error: isDark ? dangerDark : dangerLight,
    onError: Colors.white,
    surface: surface,
    onSurface: text,
    outline: border,
    outlineVariant: borderStrong,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: bg,
    colorScheme: colorScheme,
    fontFamily: 'Roboto',
    appBarTheme: AppBarTheme(backgroundColor: surface, foregroundColor: text, elevation: 0, surfaceTintColor: Colors.transparent),
    cardTheme: CardThemeData(
      color: surface,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: border)),
    ),
    dividerColor: border,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      hintStyle: TextStyle(color: textFaint),
      labelStyle: TextStyle(color: textMuted),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: accent.primary, width: 1.5)),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: accent.primary,
        foregroundColor: onPrimary,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: text,
        side: BorderSide(color: border),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    ),
    textTheme: TextTheme(
      headlineMedium: TextStyle(color: text, fontWeight: FontWeight.w800),
      titleLarge: TextStyle(color: text, fontWeight: FontWeight.w800),
      titleMedium: TextStyle(color: text, fontWeight: FontWeight.w700),
      bodyLarge: TextStyle(color: text),
      bodyMedium: TextStyle(color: textMuted),
      labelSmall: TextStyle(color: textFaint),
    ),
    extensions: [
      AppColors(
        textFaint: textFaint,
        borderStrong: borderStrong,
        success: isDark ? successDark : successLight,
        successBg: (isDark ? successDark : successLight).withValues(alpha: isDark ? 0.14 : 0.12),
        warning: isDark ? warningDark : warningLight,
        warningBg: (isDark ? warningDark : warningLight).withValues(alpha: isDark ? 0.14 : 0.12),
        danger: isDark ? dangerDark : dangerLight,
        dangerBg: (isDark ? dangerDark : dangerLight).withValues(alpha: isDark ? 0.14 : 0.12),
        info: isDark ? infoDark : infoLight,
        infoBg: (isDark ? infoDark : infoLight).withValues(alpha: isDark ? 0.14 : 0.12),
        surfaceRaised: surfaceRaised,
      ),
    ],
  );
}
