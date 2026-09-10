class SiteOption {
  final String id;
  final String name;
  const SiteOption({required this.id, required this.name});
  factory SiteOption.fromJson(Map<String, dynamic> json) => SiteOption(id: json['id'] as String, name: json['name'] as String);
}

class GateOption {
  final String id;
  final String name;
  final String siteId;
  const GateOption({required this.id, required this.name, required this.siteId});
  factory GateOption.fromJson(Map<String, dynamic> json) =>
      GateOption(id: json['id'] as String, name: json['name'] as String, siteId: json['siteId'] as String);
}

class GateStatusInfo {
  final String gateId;
  final String status; // 'available' | 'busy'
  const GateStatusInfo({required this.gateId, required this.status});
  factory GateStatusInfo.fromJson(Map<String, dynamic> json) =>
      GateStatusInfo(gateId: json['gateId'] as String, status: json['status'] as String);

  bool get isBusy => status == 'busy';
}

/// One match from GET /api/search (§7.9 task 5) — `id` is the real row id
/// this identification flow needs to link an unknown detection to.
class SearchResult {
  final String kind; // 'employee' | 'accessory' | 'material' | 'vehicle'
  final String id;
  final String label;
  const SearchResult({required this.kind, required this.id, required this.label});
  factory SearchResult.fromJson(Map<String, dynamic> json) =>
      SearchResult(kind: json['kind'] as String, id: json['id'] as String, label: json['label'] as String);
}

class UnknownEntityEvent {
  final String id;
  final String entityKind; // 'employee' | 'accessory' | 'material' | 'vehicle'
  final String? placeholderRef;
  final String status; // 'pending' | 'identified'
  final String createdAt;

  const UnknownEntityEvent({
    required this.id,
    required this.entityKind,
    required this.placeholderRef,
    required this.status,
    required this.createdAt,
  });

  factory UnknownEntityEvent.fromJson(Map<String, dynamic> json) => UnknownEntityEvent(
    id: json['id'] as String,
    entityKind: json['entityKind'] as String,
    placeholderRef: json['placeholderRef'] as String?,
    status: json['status'] as String,
    createdAt: json['createdAt'] as String,
  );
}
