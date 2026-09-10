import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/state/app_state.dart';
import '../../core/models/models.dart';
import '../../core/network/api_client.dart';
import '../unknown_entity/unknown_entity_screen.dart';
import 'context_drawer_content.dart';

/// Live gate terminal (§7.7 point 2, mockup 3) — phone/tablet get the
/// standard Scaffold+Drawer; ≥1024dp gets the persistent master-detail rail
/// from §8.4.5 so a fixed gate-house terminal never needs to re-open a drawer.
class GateTerminalScreen extends StatefulWidget {
  const GateTerminalScreen({super.key});
  @override
  State<GateTerminalScreen> createState() => _GateTerminalScreenState();
}

class _GateTerminalScreenState extends State<GateTerminalScreen> {
  GateStatusInfo? _status;
  bool _loadingStatus = true;
  bool _actionInFlight = false;
  String? _actionError;

  @override
  void initState() {
    super.initState();
    _loadStatus();
    final app = context.read<AppState>();
    app.realtime.on('gate:status', _onGateStatusEvent);
    app.refreshUnknownEntityCount();
  }

  @override
  void dispose() {
    context.read<AppState>().realtime.off('gate:status');
    super.dispose();
  }

  void _onGateStatusEvent(dynamic data) {
    final gateId = context.read<AppState>().selectedGate?.id;
    if (data is Map && data['gateId'] == gateId && mounted) {
      setState(() => _status = GateStatusInfo(gateId: data['gateId'] as String, status: data['status'] as String));
    }
  }

  Future<void> _loadStatus() async {
    final gate = context.read<AppState>().selectedGate;
    if (gate == null) return;
    try {
      final status = await context.read<AppState>().api.getGateStatus(gate.id);
      if (mounted) setState(() => _status = status);
    } catch (_) {
      // Best-effort — the UI just falls back to "unknown" styling below.
    } finally {
      if (mounted) setState(() => _loadingStatus = false);
    }
  }

  Future<void> _open() async {
    final gate = context.read<AppState>().selectedGate!;
    setState(() {
      _actionInFlight = true;
      _actionError = null;
    });
    try {
      final opened = await context.read<AppState>().api.openGate(gate.id);
      if (!opened && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Gate is already busy — request queued, not auto-opened.')));
      }
    } on ApiException catch (e) {
      setState(() => _actionError = e.message);
    } finally {
      if (mounted) setState(() => _actionInFlight = false);
    }
  }

  Future<void> _close() async {
    final gate = context.read<AppState>().selectedGate!;
    setState(() => _actionInFlight = true);
    try {
      await context.read<AppState>().api.closeGate(gate.id);
    } on ApiException catch (e) {
      setState(() => _actionError = e.message);
    } finally {
      if (mounted) setState(() => _actionInFlight = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth > 1024;
        if (isDesktop) return _buildDesktop(context);
        return _buildMobile(context);
      },
    );
  }

  Widget _buildMobile(BuildContext context) {
    final app = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('AE Security', style: TextStyle(fontWeight: FontWeight.w800)),
            Text(
              '${app.selectedSite?.name.toUpperCase() ?? ''} · ${app.selectedGate?.name ?? ''}',
              style: const TextStyle(fontSize: 11),
            ),
          ],
        ),
        actions: [_BellButton(count: app.unknownEntityCount)],
      ),
      drawer: Drawer(child: ContextDrawerContent(onNavigate: () => Navigator.of(context).pop())),
      body: _TerminalBody(
        status: _status,
        loadingStatus: _loadingStatus,
        actionInFlight: _actionInFlight,
        actionError: _actionError,
        onOpen: _open,
        onClose: _close,
      ),
    );
  }

  Widget _buildDesktop(BuildContext context) {
    final app = context.watch<AppState>();
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      body: Row(
        children: [
          SizedBox(
            width: 280,
            child: Container(
              decoration: BoxDecoration(border: Border(right: BorderSide(color: colors.outline))),
              child: const ContextDrawerContent(),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  decoration: BoxDecoration(border: Border(bottom: BorderSide(color: colors.outline))),
                  child: Row(
                    children: [
                      const Text('AE Security', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(width: 10),
                      Text(
                        '${app.selectedSite?.name.toUpperCase() ?? ''} · ${app.selectedGate?.name ?? ''}',
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                      const Spacer(),
                      _BellButton(count: app.unknownEntityCount),
                    ],
                  ),
                ),
                Expanded(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 560),
                      child: _TerminalBody(
                        status: _status,
                        loadingStatus: _loadingStatus,
                        actionInFlight: _actionInFlight,
                        actionError: _actionError,
                        onOpen: _open,
                        onClose: _close,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BellButton extends StatelessWidget {
  final int count;
  const _BellButton({required this.count});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const UnknownEntityScreen())),
        ),
        if (count > 0)
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              width: 9,
              height: 9,
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.error, shape: BoxShape.circle),
            ),
          ),
      ],
    );
  }
}

class _TerminalBody extends StatelessWidget {
  final GateStatusInfo? status;
  final bool loadingStatus;
  final bool actionInFlight;
  final String? actionError;
  final VoidCallback onOpen;
  final VoidCallback onClose;

  const _TerminalBody({
    required this.status,
    required this.loadingStatus,
    required this.actionInFlight,
    required this.actionError,
    required this.onOpen,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final isBusy = status?.isBusy ?? false;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: 16 / 10,
            child: Container(
              decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(10)),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.videocam_off_outlined, color: Colors.white.withValues(alpha: 0.4), size: 30),
                  const SizedBox(height: 8),
                  Text(
                    'Camera stream unavailable',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Text('GATE STATUS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: colors.onSurface.withValues(alpha: 0.5))),
              const Spacer(),
              if (loadingStatus)
                const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
              else
                Chip(
                  label: Text(isBusy ? 'BUSY' : 'AVAILABLE', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
                  backgroundColor: (isBusy ? colors.error : Colors.green).withValues(alpha: 0.15),
                  labelStyle: TextStyle(color: isBusy ? colors.error : Colors.green.shade700),
                  side: BorderSide.none,
                ),
            ],
          ),
          const SizedBox(height: 16),
          const Text('No vehicle currently detected at this gate.', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(
            'Live detections will appear here automatically once hardware-engine (Phase 3) is wired up.',
            style: Theme.of(context).textTheme.labelSmall,
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: actionInFlight ? null : onOpen,
            style: FilledButton.styleFrom(backgroundColor: Colors.green.shade600, minimumSize: const Size.fromHeight(48)),
            icon: const Icon(Icons.lock_open),
            label: const Text('OPEN GATE'),
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: actionInFlight ? null : onClose,
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            icon: const Icon(Icons.lock_outline),
            label: const Text('CLOSE GATE'),
          ),
          if (actionError != null) ...[
            const SizedBox(height: 10),
            Text(actionError!, style: TextStyle(color: colors.error)),
          ],
        ],
      ),
    );
  }
}
