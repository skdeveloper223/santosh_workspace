import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide LocalStorage, RealtimeClient;
import '../../core/state/app_state.dart';
import '../../core/theme/palettes.dart';
import '../auth/login_screen.dart';
import '../vehicle_registration/register_vehicle_screen.dart';

/// The context drawer (§7.7 point 2, mockup 4) — shared between the mobile
/// Drawer and the desktop persistent rail (§8.4.5) so both stay in sync.
class ContextDrawerContent extends StatelessWidget {
  final VoidCallback? onNavigate;
  const ContextDrawerContent({super.key, this.onNavigate});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    final colors = Theme.of(context).colorScheme;
    final email = Supabase.instance.client.auth.currentUser?.email ?? '';

    return SafeArea(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.outline))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(radius: 26, backgroundColor: colors.primary.withValues(alpha: 0.15), child: Icon(Icons.person, color: colors.primary)),
                const SizedBox(height: 10),
                Text('Guard', style: Theme.of(context).textTheme.titleMedium),
                Text(email, style: Theme.of(context).textTheme.labelSmall),
              ],
            ),
          ),
          _InfoRow(icon: Icons.location_city, label: 'Site', value: app.selectedSite?.name ?? '—'),
          _InfoRow(icon: Icons.sensor_door_outlined, label: 'Gate', value: app.selectedGate?.name ?? '—'),
          _DoorDirectionRow(current: app.doorDirection),
          const Padding(
            padding: EdgeInsets.fromLTRB(18, 16, 18, 6),
            child: Text('THEME', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11, letterSpacing: 1)),
          ),
          _ThemeModeRadio(label: 'Light', mode: ThemeMode.light),
          _ThemeModeRadio(label: 'Dark', mode: ThemeMode.dark),
          _ThemeModeRadio(label: 'System', mode: ThemeMode.system),
          const Padding(
            padding: EdgeInsets.fromLTRB(18, 16, 18, 6),
            child: Text('PALETTE', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 11, letterSpacing: 1)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Wrap(
              spacing: 10,
              runSpacing: 10,
              children: AppPalette.values
                  .map(
                    (p) => GestureDetector(
                      onTap: () => context.read<AppState>().setPalette(p),
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: p.swatch,
                          shape: BoxShape.circle,
                          border: Border.all(color: app.palette == p ? colors.onSurface : Colors.transparent, width: 2),
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 10),
          Divider(color: colors.outline),
          ListTile(
            leading: const Icon(Icons.add_road),
            title: const Text('Add Vehicle'),
            onTap: () {
              onNavigate?.call();
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const RegisterVehicleScreen()));
            },
          ),
          ListTile(
            leading: Icon(Icons.logout, color: colors.error),
            title: Text('Logout', style: TextStyle(color: colors.error)),
            onTap: () async {
              await context.read<AppState>().signOut();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
            },
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.outline))),
      child: Row(
        children: [
          Icon(icon, size: 18, color: colors.onSurface.withValues(alpha: 0.5)),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              Text(value, style: Theme.of(context).textTheme.labelSmall),
            ],
          ),
        ],
      ),
    );
  }
}

class _DoorDirectionRow extends StatelessWidget {
  final String current;
  const _DoorDirectionRow({required this.current});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.outline))),
      child: Row(
        children: [
          Icon(Icons.swap_vert, size: 18, color: colors.onSurface.withValues(alpha: 0.5)),
          const SizedBox(width: 12),
          const Text('Door / Direction', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          const Spacer(),
          ToggleButtons(
            isSelected: [current == 'IN', current == 'OUT'],
            constraints: const BoxConstraints(minWidth: 44, minHeight: 30),
            onPressed: (i) => context.read<AppState>().setDoorDirection(i == 0 ? 'IN' : 'OUT'),
            children: const [Text('IN'), Text('OUT')],
          ),
        ],
      ),
    );
  }
}

class _ThemeModeRadio extends StatelessWidget {
  final String label;
  final ThemeMode mode;
  const _ThemeModeRadio({required this.label, required this.mode});

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return RadioListTile<ThemeMode>(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18),
      title: Text(label),
      value: mode,
      groupValue: app.themeMode,
      onChanged: (v) => context.read<AppState>().setThemeMode(v!),
    );
  }
}
