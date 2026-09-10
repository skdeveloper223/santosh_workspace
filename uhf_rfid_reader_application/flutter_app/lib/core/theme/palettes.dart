import 'package:flutter/material.dart';

/// The 5 palettes from plans/my_hole_project_plan.md §8.4.3 — hex values kept
/// identical to web_app/src/app/globals.css so the two apps' themes actually
/// match, not just resemble each other.
enum AppPalette { ocean, violet, indigo, cobalt, amethyst }

extension AppPaletteLabel on AppPalette {
  String get label => switch (this) {
    AppPalette.ocean => 'Ocean Blue',
    AppPalette.violet => 'Royal Violet',
    AppPalette.indigo => 'Indigo Fusion',
    AppPalette.cobalt => 'Electric Cobalt',
    AppPalette.amethyst => 'Neon Amethyst',
  };

  Color get swatch => switch (this) {
    AppPalette.ocean => const Color(0xFF2563EB),
    AppPalette.violet => const Color(0xFF7C3AED),
    AppPalette.indigo => const Color(0xFF4F46E5),
    AppPalette.cobalt => const Color(0xFF0EA5E9),
    AppPalette.amethyst => const Color(0xFFC026D3),
  };
}

class PaletteAccent {
  final Color primary;
  final Color primaryHover;
  final Color accent;
  const PaletteAccent(this.primary, this.primaryHover, this.accent);
}

// Violet/amethyst lean the light background slightly cool-violet instead of
// the shared slate — "choose neutrals, don't default to them" carried over
// verbatim from the web app's design pass.
class PaletteLightNeutrals {
  final Color bg;
  final Color border;
  const PaletteLightNeutrals(this.bg, this.border);
}

const _lightAccents = <AppPalette, PaletteAccent>{
  AppPalette.ocean: PaletteAccent(Color(0xFF2563EB), Color(0xFF1D4ED8), Color(0xFF3B82F6)),
  AppPalette.violet: PaletteAccent(Color(0xFF7C3AED), Color(0xFF6D28D9), Color(0xFF8B5CF6)),
  AppPalette.indigo: PaletteAccent(Color(0xFF4F46E5), Color(0xFF4338CA), Color(0xFF6366F1)),
  AppPalette.cobalt: PaletteAccent(Color(0xFF1D4ED8), Color(0xFF1E40AF), Color(0xFF0EA5E9)),
  AppPalette.amethyst: PaletteAccent(Color(0xFF9333EA), Color(0xFF7E22CE), Color(0xFFC026D3)),
};

const _darkAccents = <AppPalette, PaletteAccent>{
  AppPalette.ocean: PaletteAccent(Color(0xFF3B82F6), Color(0xFF60A5FA), Color(0xFF38BDF8)),
  AppPalette.violet: PaletteAccent(Color(0xFF8B5CF6), Color(0xFFA78BFA), Color(0xFFA855F7)),
  AppPalette.indigo: PaletteAccent(Color(0xFF6366F1), Color(0xFF818CF8), Color(0xFF818CF8)),
  AppPalette.cobalt: PaletteAccent(Color(0xFF2563EB), Color(0xFF3B82F6), Color(0xFF22D3EE)),
  AppPalette.amethyst: PaletteAccent(Color(0xFFA855F7), Color(0xFFC084FC), Color(0xFFE879F9)),
};

const _lightNeutrals = <AppPalette, PaletteLightNeutrals>{
  AppPalette.ocean: PaletteLightNeutrals(Color(0xFFF8FAFC), Color(0xFFE2E8F0)),
  AppPalette.violet: PaletteLightNeutrals(Color(0xFFFAF8FC), Color(0xFFEAE2F6)),
  AppPalette.indigo: PaletteLightNeutrals(Color(0xFFF8FAFC), Color(0xFFE2E8F0)),
  AppPalette.cobalt: PaletteLightNeutrals(Color(0xFFF8FAFC), Color(0xFFE2E8F0)),
  AppPalette.amethyst: PaletteLightNeutrals(Color(0xFFFAF8FC), Color(0xFFF1E4FA)),
};

// Dark-mode neutrals are shared across every palette — only the accent hue
// shifts (§8.4.3) — so dark mode never feels like a different app per palette.
const darkBg = Color(0xFF05060A);
const darkSurface = Color(0xFF0F1117);
const darkSurfaceRaised = Color(0xFF15171F);
const darkBorder = Color(0xFF23262F);
const darkBorderStrong = Color(0xFF33384A);
const darkText = Color(0xFFF1F5F9);
const darkTextMuted = Color(0xFF8B93A7);
const darkTextFaint = Color(0xFF5C6478);

const lightBorderStrong = Color(0xFFCBD5E1);
const lightText = Color(0xFF0F172A);
const lightTextMuted = Color(0xFF64748B);
const lightTextFaint = Color(0xFF94A3B8);

const successLight = Color(0xFF16A34A);
const warningLight = Color(0xFFD97706);
const dangerLight = Color(0xFFDC2626);
const infoLight = Color(0xFF0284C7);
const successDark = Color(0xFF4ADE80);
const warningDark = Color(0xFFFBBF24);
const dangerDark = Color(0xFFF87171);
const infoDark = Color(0xFF38BDF8);

PaletteAccent accentFor(AppPalette palette, Brightness brightness) =>
    brightness == Brightness.dark ? _darkAccents[palette]! : _lightAccents[palette]!;

PaletteLightNeutrals lightNeutralsFor(AppPalette palette) => _lightNeutrals[palette]!;
