import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:supabase_flutter/supabase_flutter.dart' show Supabase;
import '../config/app_config.dart';

/// Client for the standalone Realtime Gateway (§7.9, §8.1) — joins the room
/// hierarchy (site/gate) so this device only receives events relevant to
/// wherever the guard currently is, never a global firehose.
class RealtimeClient {
  io.Socket? _socket;

  void connect() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return;

    _socket = io.io(
      AppConfig.realtimeUrl,
      io.OptionBuilder().setTransports(['websocket']).disableAutoConnect().setAuth({'token': token}).build(),
    );
    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  Future<bool> joinRoom(String scope, String id) {
    final socket = _socket;
    if (socket == null) return Future.value(false);
    final completer = Completer<bool>();
    socket.emitWithAck('subscribe', {'scope': scope, 'id': id}, ack: (dynamic allowed) => completer.complete(allowed == true));
    return completer.future;
  }

  void leaveRoom(String scope, String id) => _socket?.emit('unsubscribe', {'scope': scope, 'id': id});

  void on(String event, void Function(dynamic data) handler) => _socket?.on(event, handler);

  void off(String event) => _socket?.off(event);
}
