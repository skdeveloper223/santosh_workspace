import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/state/app_state.dart';
import '../../core/models/models.dart';
import 'select_gate_screen.dart';

class SelectSiteScreen extends StatefulWidget {
  const SelectSiteScreen({super.key});
  @override
  State<SelectSiteScreen> createState() => _SelectSiteScreenState();
}

class _SelectSiteScreenState extends State<SelectSiteScreen> {
  late Future<List<SiteOption>> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<AppState>().api.getSites();
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.apartment, color: colors.primary, size: 44),
                  const SizedBox(height: 12),
                  Text('SELECT SITE', style: Theme.of(context).textTheme.headlineMedium?.copyWith(letterSpacing: 2)),
                  const SizedBox(height: 4),
                  Text('Choose your operational location', style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 24),
                  FutureBuilder<List<SiteOption>>(
                    future: _future,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState != ConnectionState.done) {
                        return const Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator());
                      }
                      if (snapshot.hasError) {
                        return Text('Could not load sites: ${snapshot.error}', style: TextStyle(color: colors.error));
                      }
                      final sites = snapshot.data ?? [];
                      if (sites.isEmpty) {
                        return const Text('No sites found for your company yet.');
                      }
                      return Column(
                        children: sites
                            .map(
                              (site) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _SiteRow(
                                  site: site,
                                  onTap: () async {
                                    await context.read<AppState>().selectSite(site);
                                    if (!context.mounted) return;
                                    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SelectGateScreen()));
                                  },
                                ),
                              ),
                            )
                            .toList(),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SiteRow extends StatelessWidget {
  final SiteOption site;
  final VoidCallback onTap;
  const _SiteRow({required this.site, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
        decoration: BoxDecoration(border: Border.all(color: colors.outline), borderRadius: BorderRadius.circular(10)),
        child: Row(
          children: [
            Expanded(
              child: Text(
                site.name.toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1),
              ),
            ),
            Icon(Icons.chevron_right, color: colors.primary),
          ],
        ),
      ),
    );
  }
}
