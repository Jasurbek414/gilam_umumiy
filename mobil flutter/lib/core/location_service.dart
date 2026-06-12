import 'dart:async';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../core/api.dart';
import '../core/constants.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  IO.Socket? _socket;
  StreamSubscription<Position>? _positionStream;
  bool _isOnline = false;
  String? _driverId;
  String? _companyId;
  Position? _lastPosition;
  DateTime? _lastSent;

  bool get isOnline => _isOnline;
  Position? get lastPosition => _lastPosition;

  // ── INITIALIZE ──
  Future<void> init(String driverId, String companyId) async {
    _driverId = driverId;
    _companyId = companyId;
  }

  // ── GPS PERMISSION ──
  Future<bool> checkPermission() async {
    var status = await Permission.locationWhenInUse.status;
    if (!status.isGranted) {
      status = await Permission.locationWhenInUse.request();
    }
    return status.isGranted;
  }

  Future<bool> checkGps() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  // ── GO ONLINE ──
  Future<Map<String, dynamic>> goOnline() async {
    print('[LocationService] goOnline called');
    final hasPermission = await checkPermission();
    if (!hasPermission) {
      print('[LocationService] No permission');
      return {'success': false, 'error': 'GPS ruxsati berilmagan'};
    }

    final gpsEnabled = await checkGps();
    if (!gpsEnabled) {
      print('[LocationService] GPS not enabled');
      return {'success': false, 'error': 'GPS yoqilmagan'};
    }

    try {
      // Joriy lokatsiyani olish
      print('[LocationService] getting current position...');
      try {
        _lastPosition = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 10,
            timeLimit: Duration(seconds: 10), // 10 soniya kutish
          ),
        );
        print('[LocationService] position found: $_lastPosition');
      } catch (e) {
        print('[LocationService] getCurrentPosition error: $e');
        _lastPosition = await Geolocator.getLastKnownPosition();
        if (_lastPosition == null) {
          print('[LocationService] no last known position');
          return {'success': false, 'error': 'GPS signal topilmadi. Iltimos, ochiqroq joyga chiqing!'};
        }
        print('[LocationService] using last known position: $_lastPosition');
      }

      // Backend ga online xabar
      print('[LocationService] sending to backend...');
      await apiRequest('/drivers/go-online', method: 'POST', body: {
        'latitude': _lastPosition!.latitude,
        'longitude': _lastPosition!.longitude,
      });
      print('[LocationService] backend success');

      // WebSocket ulanish
      _connectSocket();

      // Location stream boshlash
      _startLocationStream();

      _isOnline = true;
      return {'success': true};
    } catch (e) {
      print('[LocationService] catch block error: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  // ── GO OFFLINE ──
  Future<void> goOffline({String reason = 'MANUAL'}) async {
    _isOnline = false;
    _positionStream?.cancel();
    _positionStream = null;

    try {
      await apiRequest('/drivers/go-offline', method: 'POST', body: {
        'reason': reason,
        'latitude': _lastPosition?.latitude,
        'longitude': _lastPosition?.longitude,
      });
    } catch (_) {}

    if (_socket != null) {
      _socket!.emit('driver:offline', {
        'driverId': _driverId,
        'reason': reason,
      });
      _socket!.disconnect();
      _socket = null;
    }
  }

  // ── SOCKET CONNECT ──
  void _connectSocket() {
    final base = apiBase.replaceAll('/api', '');
    _socket = IO.io('$base/drivers', <String, dynamic>{
      'transports': ['websocket'],
      'path': '/api/socket.io',
      'autoConnect': true,
    });

    _socket!.onConnect((_) {
      _socket!.emit('driver:online', {
        'driverId': _driverId,
        'companyId': _companyId,
        'latitude': _lastPosition?.latitude,
        'longitude': _lastPosition?.longitude,
      });
    });

    _socket!.onDisconnect((_) {
      // Qayta ulanishga harakat qilish
      if (_isOnline) {
        Future.delayed(const Duration(seconds: 5), () {
          if (_isOnline && _socket?.connected != true) {
            _socket?.connect();
          }
        });
      }
    });
  }

  // ── LOCATION STREAM ──
  void _startLocationStream() {
    _positionStream?.cancel();

    late LocationSettings locationSettings;
    
    if (defaultTargetPlatform == TargetPlatform.android) {
      locationSettings = AndroidSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
        forceLocationManager: true,
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationText: "Gilam ilovasi orqa fonda GPS koordinatalarni yubormoqda...",
          notificationTitle: "GPS kuzatuvi faol",
          enableWakeLock: true,
        ),
      );
    } else {
      locationSettings = const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      );
    }

    _positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      _lastPosition = position;

      // Adaptive interval: harakatlanayotgan bo'lsa tez, to'xtagan bo'lsa sekin
      final now = DateTime.now();
      final interval = position.speed > 5 ? 5 : 15; // sekund
      if (_lastSent != null && now.difference(_lastSent!).inSeconds < interval) return;
      _lastSent = now;

      // Mock location tekshirish
      final isMock = position.isMocked;

      // Socket orqali yuborish
      if (_socket?.connected == true) {
        _socket!.emit('driver:location', {
          'driverId': _driverId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'speed': position.speed * 3.6, // m/s → km/h
          'heading': position.heading,
          'battery': null, // Platform-specific
          'isMock': isMock,
        });
      } else {
        // Offline queue — API orqali yuborish
        _sendViaApi(position);
      }
    });
  }

  Future<void> _sendViaApi(Position pos) async {
    try {
      await apiRequest('/drivers/location', method: 'POST', body: {
        'latitude': pos.latitude,
        'longitude': pos.longitude,
        'accuracy': pos.accuracy,
        'speed': pos.speed * 3.6,
        'heading': pos.heading,
        'isMock': pos.isMocked,
      });
    } catch (_) {}
  }

  void dispose() {
    _positionStream?.cancel();
    _socket?.disconnect();
    _socket = null;
  }
}
