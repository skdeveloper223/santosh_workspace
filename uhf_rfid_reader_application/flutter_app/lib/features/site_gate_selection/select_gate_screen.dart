import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/state/app_state.dart';
import '../../core/models/models.dart';
import '../gate_terminal/gate_terminal_screen.dart';

class SelectGateScreen extends StatefulWidget {
  const SelectGateScreen({super.key});
  @override
  State<SelectGateScreen> createState() => _SelectGateScreenState();
}

class _SelectGateScreenState extends State<SelectGateScreen> {
  late Future<List<GateOption>> _future;

  @override
  void initState() {
    super.initState();
    final site = context.read<AppState>().selectedSite!;
    _future = context.read<AppState>().api.getGatesForSite(site.id);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final site = context.watch<AppState>().selectedSite;
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
                  Icon(Icons.sensor_door_outlined, color: colors.secondary, size: 44),
                  const SizedBox(height: 12),
                  Text('SELECT GATE', style: Theme.of(context).textTheme.headlineMedium?.copyWith(letterSpacing: 2)),
                  const SizedBox(height: 4),
                  Text('Site: ${site?.name.toUpperCase() ?? ''}', style: Theme.of(context).textTheme.bodyMedium),
                  const SizedBox(height: 24),
                  FutureBuilder<List<GateOption>>(
                    future: _future,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState != ConnectionState.done) {
                        return const Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator());
                      }
                      if (snapshot.hasError) {
                        return Text('Could not load gates: ${snapshot.error}', style: TextStyle(color: colors.error));
                      }
                      final gates = snapshot.data ?? [];
                      if (gates.isEmpty) {
                        return const Text('No gates configured for this site yet.');
                      }
                      return Column(
                        children: gates
                            .map(
                              (gate) => Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _GateRow(
                                  gate: gate,
                                  onTap: () async {
                                    await context.read<AppState>().selectGate(gate);
                                    if (!context.mounted) return;
                                    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const GateTerminalScreen()));
                                  },
                                ),
                              ),
                            )
                            .toList(),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  TextButton.icon(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back, size: 16),
                    label: const Text('BACK TO SITES'),
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

class _GateRow extends StatelessWidget {
  final GateOption gate;
  final VoidCallback onTap;
  const _GateRow({required this.gate, required this.onTap});

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
            Expanded(child: Text(gate.name, style: const TextStyle(fontWeight: FontWeight.w700))),
            Icon(Icons.chevron_right, color: colors.secondary),
          ],
        ),
      ),
    );
  }
}
