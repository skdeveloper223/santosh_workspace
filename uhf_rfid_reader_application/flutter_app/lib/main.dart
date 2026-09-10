import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide LocalStorage, RealtimeClient;
import 'core/config/app_config.dart';
import 'core/state/app_state.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/site_gate_selection/select_site_screen.dart';
import 'features/site_gate_selection/select_gate_screen.dart';
import 'features/gate_terminal/gate_terminal_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: AppConfig.supabaseUrl, publishableKey: AppConfig.supabaseAnonKey);

  final appState = AppState();
  await appState.loadPersisted();

  runApp(ChangeNotifierProvider.value(value: appState, child: const AirisGuardApp()));
}

class AirisGuardApp extends StatelessWidget {
  const AirisGuardApp({super.key});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return MaterialApp(
      title: 'AE Security',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(app.palette, Brightness.light),
      darkTheme: buildAppTheme(app.palette, Brightness.dark),
      themeMode: app.themeMode,
      home: const _RootGate(),
    );
  }
}

/// Resumes wherever the guard left off — signed in + site/gate already
/// selected goes straight to the terminal (§8.7 Phase 7: persists across restart).
class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    if (!app.isSignedIn) return const LoginScreen();
    if (app.selectedSite == null) return const SelectSiteScreen();
    if (app.selectedGate == null) return const SelectGateScreen();
    return const GateTerminalScreen();
  }
}
