import 'package:shared_preferences/shared_preferences.dart';

/// Persists theme + site/gate/door selection across app restarts (§8.7 Phase 7 verification).
class LocalStorage {
  static const _kPalette = 'airis.palette';
  static const _kMode = 'airis.mode'; // 'light' | 'dark' | 'system'
  static const _kSiteId = 'airis.siteId';
  static const _kSiteName = 'airis.siteName';
  static const _kGateId = 'airis.gateId';
  static const _kGateName = 'airis.gateName';
  static const _kDoorDirection = 'airis.doorDirection';

  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<void> setString(String key, String value) async => (await _prefs).setString(key, value);
  Future<String?> getString(String key) async => (await _prefs).getString(key);
  Future<void> remove(String key) async => (await _prefs).remove(key);

  String get paletteKey => _kPalette;
  String get modeKey => _kMode;
  String get siteIdKey => _kSiteId;
  String get siteNameKey => _kSiteName;
  String get gateIdKey => _kGateId;
  String get gateNameKey => _kGateName;
  String get doorDirectionKey => _kDoorDirection;

  Future<void> clearSiteGateSelection() async {
    final prefs = await _prefs;
    await prefs.remove(_kSiteId);
    await prefs.remove(_kSiteName);
    await prefs.remove(_kGateId);
    await prefs.remove(_kGateName);
  }
}
