import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide LocalStorage, RealtimeClient;
import '../theme/palettes.dart';
import '../storage/local_storage.dart';
import '../network/api_client.dart';
import '../network/realtime_client.dart';
import '../models/models.dart';

/// App-wide session/selection/theme state (§7.7 point 2, §8.4.4). One
/// instance, provided at the root — screens read it via `context.watch<AppState>()`.
class AppState extends ChangeNotifier {
  final LocalStorage storage;
  final ApiClient api;
  final RealtimeClient realtime;

  AppState({LocalStorage? storage, ApiClient? api, RealtimeClient? realtime})
    : storage = storage ?? LocalStorage(),
      api = api ?? ApiClient(),
      realtime = realtime ?? RealtimeClient();

  // ---- theme (defaults to Neon Amethyst / dark, matching the studied mobile mockups — §8.4.4) ----
  AppPalette palette = AppPalette.amethyst;
  ThemeMode themeMode = ThemeMode.dark;

  // ---- selection ----
  SiteOption? selectedSite;
  GateOption? selectedGate;
  String doorDirection = 'IN';

  // ---- unknown-entity badge ----
  int unknownEntityCount = 0;

  bool get isSignedIn => Supabase.instance.client.auth.currentSession != null;

  Future<void> loadPersisted() async {
    final paletteName = await storage.getString(storage.paletteKey);
    if (paletteName != null) {
      palette = AppPalette.values.firstWhere((p) => p.name == paletteName, orElse: () => AppPalette.amethyst);
    }
    final modeName = await storage.getString(storage.modeKey);
    themeMode = switch (modeName) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };

    final siteId = await storage.getString(storage.siteIdKey);
    final siteName = await storage.getString(storage.siteNameKey);
    if (siteId != null && siteName != null) selectedSite = SiteOption(id: siteId, name: siteName);

    final gateId = await storage.getString(storage.gateIdKey);
    final gateName = await storage.getString(storage.gateNameKey);
    if (gateId != null && gateName != null && selectedSite != null) {
      selectedGate = GateOption(id: gateId, name: gateName, siteId: selectedSite!.id);
    }

    final door = await storage.getString(storage.doorDirectionKey);
    if (door != null) doorDirection = door;

    notifyListeners();
  }

  Future<void> setPalette(AppPalette next) async {
    palette = next;
    await storage.setString(storage.paletteKey, next.name);
    notifyListeners();
  }

  Future<void> setThemeMode(ThemeMode next) async {
    themeMode = next;
    await storage.setString(storage.modeKey, switch (next) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    });
    notifyListeners();
  }

  Future<void> selectSite(SiteOption site) async {
    selectedSite = site;
    selectedGate = null;
    await storage.clearSiteGateSelection();
    await storage.setString(storage.siteIdKey, site.id);
    await storage.setString(storage.siteNameKey, site.name);
    notifyListeners();
  }

  Future<void> selectGate(GateOption gate) async {
    selectedGate = gate;
    await storage.setString(storage.gateIdKey, gate.id);
    await storage.setString(storage.gateNameKey, gate.name);
    realtime.connect();
    await realtime.joinRoom('gate', gate.id);
    await refreshUnknownEntityCount();
    notifyListeners();
  }

  Future<void> setDoorDirection(String direction) async {
    doorDirection = direction;
    await storage.setString(storage.doorDirectionKey, direction);
    notifyListeners();
  }

  Future<void> refreshUnknownEntityCount() async {
    if (selectedGate == null) return;
    try {
      final events = await api.getUnknownEntities(gateId: selectedGate!.id);
      unknownEntityCount = events.where((e) => e.status == 'pending').length;
      notifyListeners();
    } catch (_) {
      // Best-effort — the badge just stays at its last known value.
    }
  }

  Future<void> signOut() async {
    realtime.disconnect();
    await Supabase.instance.client.auth.signOut();
    selectedSite = null;
    selectedGate = null;
    await storage.clearSiteGateSelection();
    notifyListeners();
  }
}
