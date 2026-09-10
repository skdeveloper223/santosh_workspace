import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart' show Supabase;
import '../config/app_config.dart';
import '../models/models.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Talks to web_app's Next.js API only — never Supabase tables directly
/// (§7.7 point 1). Every request carries the Supabase access token so
/// withApiMiddleware's auth + permission guard (§8.3.2) can identify the caller.
class ApiClient {
  final http.Client _client;
  ApiClient({http.Client? client}) : _client = client ?? http.Client();

  Map<String, String> get _headers {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    return {'Content-Type': 'application/json', if (token != null) 'Authorization': 'Bearer $token'};
  }

  Uri _uri(String path, [Map<String, String>? query]) => Uri.parse('${AppConfig.apiBaseUrl}$path').replace(queryParameters: query);

  Future<dynamic> _get(String path, [Map<String, String>? query]) async {
    final res = await _client.get(_uri(path, query), headers: _headers);
    return _decode(res);
  }

  Future<dynamic> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final req = http.Request(method, _uri(path))
      ..headers.addAll(_headers)
      ..body = jsonEncode(body ?? {});
    final streamed = await _client.send(req);
    final res = await http.Response.fromStream(streamed);
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    final body = res.body.isEmpty ? {} : jsonDecode(res.body);
    if (res.statusCode >= 200 && res.statusCode < 300) return body['data'];
    final message = (body is Map && body['error'] is Map) ? (body['error']['message'] as String? ?? 'Request failed') : 'Request failed';
    throw ApiException(res.statusCode, message);
  }

  Future<List<SiteOption>> getSites() async {
    final data = await _get('/api/sites') as List;
    return data.map((e) => SiteOption.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<GateOption>> getGatesForSite(String siteId) async {
    final data = await _get('/api/sites/$siteId/gates') as List;
    return data.map((e) => GateOption.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<GateStatusInfo> getGateStatus(String gateId) async {
    final data = await _get('/api/gates/$gateId/status') as Map<String, dynamic>;
    return GateStatusInfo.fromJson(data);
  }

  Future<bool> openGate(String gateId) async {
    final data = await _send('POST', '/api/gates/$gateId/open') as Map<String, dynamic>;
    return data['opened'] as bool;
  }

  Future<void> closeGate(String gateId) => _send('POST', '/api/gates/$gateId/close');

  Future<String> registerVehicle({
    required String plateNumber,
    required String type,
    required String siteId,
    String? gateId,
    required bool grantGateAccess,
    String? parkingSlot,
    String? uhfTagNo,
  }) async {
    final data = await _send('POST', '/api/vehicles', {
      'plateNumber': plateNumber,
      'type': type,
      'siteId': siteId,
      if (gateId != null) 'gateId': gateId,
      'grantGateAccess': grantGateAccess,
      if (parkingSlot != null && parkingSlot.isNotEmpty) 'parkingSlot': parkingSlot,
      if (uhfTagNo != null && uhfTagNo.isNotEmpty) 'uhfTagNo': uhfTagNo,
    }) as Map<String, dynamic>;
    return data['id'] as String;
  }

  Future<List<UnknownEntityEvent>> getUnknownEntities({String? gateId}) async {
    final data = await _get('/api/unknown-entities', gateId != null ? {'gateId': gateId} : null) as List;
    return data.map((e) => UnknownEntityEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> identifyUnknownEntity(String id, String identifiedAsId) =>
      _send('PATCH', '/api/unknown-entities/$id', {'identifiedAsId': identifiedAsId});

  Future<List<SearchResult>> search(String query) async {
    if (query.trim().length < 2) return [];
    final data = await _get('/api/search', {'q': query}) as List;
    return data.map((e) => SearchResult.fromJson(e as Map<String, dynamic>)).toList();
  }
}
