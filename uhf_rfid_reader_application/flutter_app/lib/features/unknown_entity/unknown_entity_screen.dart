import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/state/app_state.dart';
import '../../core/models/models.dart';
import '../../core/network/api_client.dart';

class UnknownEntityScreen extends StatefulWidget {
  const UnknownEntityScreen({super.key});
  @override
  State<UnknownEntityScreen> createState() => _UnknownEntityScreenState();
}

class _UnknownEntityScreenState extends State<UnknownEntityScreen> {
  late Future<List<UnknownEntityEvent>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final gateId = context.read<AppState>().selectedGate?.id;
    setState(() => _future = context.read<AppState>().api.getUnknownEntities(gateId: gateId));
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Unknown Entities')),
      body: FutureBuilder<List<UnknownEntityEvent>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load: ${snapshot.error}', style: TextStyle(color: colors.error)));
          }
          final events = (snapshot.data ?? []).where((e) => e.status == 'pending').toList();
          if (events.isEmpty) {
            return const Center(
              child: Padding(padding: EdgeInsets.all(24), child: Text('No unidentified detections at this gate right now.')),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: events.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final event = events[i];
              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: colors.tertiaryContainer,
                    child: Icon(_iconFor(event.entityKind), color: colors.primary),
                  ),
                  title: Text('Unidentified ${event.entityKind}'),
                  subtitle: Text(event.placeholderRef ?? '—'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () async {
                    final identified = await Navigator.of(
                      context,
                    ).push<bool>(MaterialPageRoute(builder: (_) => _IdentifyForm(event: event)));
                    if (identified == true) _reload();
                  },
                ),
              );
            },
          );
        },
      ),
    );
  }

  IconData _iconFor(String kind) => switch (kind) {
    'vehicle' => Icons.directions_car,
    'employee' => Icons.badge_outlined,
    'material' => Icons.inventory_2_outlined,
    _ => Icons.token_outlined,
  };
}

class _IdentifyForm extends StatefulWidget {
  final UnknownEntityEvent event;
  const _IdentifyForm({required this.event});

  @override
  State<_IdentifyForm> createState() => _IdentifyFormState();
}

class _IdentifyFormState extends State<_IdentifyForm> {
  // Vehicle path
  final _plateController = TextEditingController();
  String _vehicleType = '4-wheeler';

  // Employee/accessory/material path — search-and-link to a real record.
  final _searchController = TextEditingController();
  List<SearchResult> _results = [];
  SearchResult? _picked;

  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.event.entityKind == 'vehicle') _plateController.text = widget.event.placeholderRef ?? '';
  }

  @override
  void dispose() {
    _plateController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _runSearch(String query) async {
    final results = await context.read<AppState>().api.search(query);
    if (mounted) setState(() => _results = results);
  }

  Future<void> _submit() async {
    final app = context.read<AppState>();
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      String identifiedAsId;
      if (widget.event.entityKind == 'vehicle') {
        if (_plateController.text.trim().isEmpty || app.selectedSite == null) {
          throw Exception('Plate and site are required.');
        }
        identifiedAsId = await app.api.registerVehicle(
          plateNumber: _plateController.text.trim().toUpperCase(),
          type: _vehicleType,
          siteId: app.selectedSite!.id,
          gateId: app.selectedGate?.id,
          grantGateAccess: true,
        );
      } else {
        if (_picked == null) throw Exception('Search for and select the matching record first.');
        identifiedAsId = _picked!.id;
      }
      await app.api.identifyUnknownEntity(widget.event.id, identifiedAsId);
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Identify Entity')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  readOnly: true,
                  controller: TextEditingController(text: widget.event.placeholderRef ?? '—'),
                  decoration: const InputDecoration(labelText: 'Captured tag / plate', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),
                if (widget.event.entityKind == 'vehicle') ...[
                  TextField(
                    controller: _plateController,
                    textCapitalization: TextCapitalization.characters,
                    decoration: const InputDecoration(labelText: 'Plate Number', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: _vehicleType,
                    decoration: const InputDecoration(labelText: 'Vehicle Type', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: '4-wheeler', child: Text('Car (4-Wheeler)')),
                      DropdownMenuItem(value: '2-wheeler', child: Text('Bike (2-Wheeler)')),
                    ],
                    onChanged: (v) => setState(() => _vehicleType = v!),
                  ),
                ] else ...[
                  TextField(
                    controller: _searchController,
                    onChanged: _runSearch,
                    decoration: const InputDecoration(
                      labelText: 'Search directory to link this tag',
                      hintText: 'Employee name/code or asset name',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (_results.isNotEmpty)
                    Card(
                      child: Column(
                        children: _results
                            .map(
                              (r) => ListTile(
                                dense: true,
                                title: Text(r.label),
                                subtitle: Text(r.kind),
                                selected: _picked?.id == r.id,
                                onTap: () => setState(() {
                                  _picked = r;
                                  _searchController.text = r.label;
                                  _results = [];
                                }),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  if (_picked != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('Linking to: ${_picked!.label}')),
                ],
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: colors.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(10)),
                  child: const Text(
                    'Gate access is decoupled — you can still operate this gate while this record is pending (§7.7 point 4).',
                    style: TextStyle(fontSize: 12.5),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Text(_error!, style: TextStyle(color: colors.error)),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('SAVE & IDENTIFY'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
