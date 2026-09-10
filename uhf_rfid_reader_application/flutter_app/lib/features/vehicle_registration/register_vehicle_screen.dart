import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/state/app_state.dart';
import '../../core/network/api_client.dart';

class RegisterVehicleScreen extends StatefulWidget {
  const RegisterVehicleScreen({super.key});
  @override
  State<RegisterVehicleScreen> createState() => _RegisterVehicleScreenState();
}

class _RegisterVehicleScreenState extends State<RegisterVehicleScreen> {
  final _plateController = TextEditingController();
  final _parkingController = TextEditingController();
  final _uhfController = TextEditingController();
  String _type = '4-wheeler';
  bool _grantAccess = true;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _plateController.dispose();
    _parkingController.dispose();
    _uhfController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final app = context.read<AppState>();
    if (_plateController.text.trim().isEmpty || app.selectedSite == null) {
      setState(() => _error = 'Vehicle number is required.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await app.api.registerVehicle(
        plateNumber: _plateController.text.trim().toUpperCase(),
        type: _type,
        siteId: app.selectedSite!.id,
        gateId: app.selectedGate?.id,
        grantGateAccess: _grantAccess,
        parkingSlot: _parkingController.text.trim(),
        uhfTagNo: _uhfController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Vehicle registered.')));
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = 'Could not register vehicle: $e');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(title: const Text('Register New Vehicle')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InputDecorator(
                  decoration: const InputDecoration(labelText: 'Site / Location *', border: OutlineInputBorder()),
                  child: Text('${app.selectedSite?.name ?? '—'}${app.selectedGate != null ? ' · ${app.selectedGate!.name}' : ''}'),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _plateController,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(labelText: 'Vehicle Number *', hintText: 'GJ01XX0000', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 14),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  decoration: const InputDecoration(labelText: 'Vehicle Type *', border: OutlineInputBorder()),
                  items: const [
                    DropdownMenuItem(value: '4-wheeler', child: Text('Car (4-Wheeler)')),
                    DropdownMenuItem(value: '2-wheeler', child: Text('Bike (2-Wheeler)')),
                    DropdownMenuItem(value: 'other', child: Text('Other')),
                  ],
                  onChanged: (v) => setState(() => _type = v!),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _parkingController,
                  decoration: const InputDecoration(labelText: 'Parking Slot No', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _uhfController,
                  decoration: const InputDecoration(labelText: 'UHF Tag No (optional)', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Gate Access Allowed'),
                  subtitle: Text(
                    app.selectedGate != null
                        ? 'Authorizes ${app.selectedSite?.name} · ${app.selectedGate!.name} only — not company-wide (§7.4).'
                        : 'Authorizes ${app.selectedSite?.name} only — pick a gate for gate-level access too.',
                  ),
                  value: _grantAccess,
                  onChanged: (v) => setState(() => _grantAccess = v),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('REGISTER VEHICLE'),
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
