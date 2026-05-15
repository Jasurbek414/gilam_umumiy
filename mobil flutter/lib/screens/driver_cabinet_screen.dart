import 'package:flutter/material.dart';
import '../core/location_service.dart';
import '../core/api.dart';

class DriverCabinetScreen extends StatefulWidget {
  const DriverCabinetScreen({super.key});

  @override
  State<DriverCabinetScreen> createState() => _DriverCabinetScreenState();
}

class _DriverCabinetScreenState extends State<DriverCabinetScreen> {
  final _locationService = LocationService();
  bool _isOnline = false;
  bool _isLoading = false;
  String? _error;
  Map<String, dynamic>? _todaySession;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    final user = await getSavedUser();
    if (user != null) {
      setState(() => _user = user);
      await _locationService.init(user['id'], user['companyId'] ?? '');
      _loadTodaySession();
    }
  }

  Future<void> _loadTodaySession() async {
    try {
      final session = await apiRequest('/drivers/work-session/today');
      setState(() => _todaySession = session as Map<String, dynamic>?);
    } catch (_) {}
  }

  Future<void> _toggleOnline() async {
    setState(() { _isLoading = true; _error = null; });

    if (_isOnline) {
      // Offline dialog
      final reason = await _showOfflineDialog();
      if (reason != null) {
        await _locationService.goOffline(reason: reason);
        setState(() { _isOnline = false; _isLoading = false; });
        _loadTodaySession();
      } else {
        setState(() => _isLoading = false);
      }
    } else {
      final result = await _locationService.goOnline();
      if (result['success'] == true) {
        setState(() { _isOnline = true; _isLoading = false; });
        _loadTodaySession();
      } else {
        setState(() { _error = result['error']; _isLoading = false; });
      }
    }
  }

  Future<String?> _showOfflineDialog() async {
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Ishni tugatish', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Sababni tanlang:', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 16),
            ...[
              {'value': 'SHIFT_END', 'label': '🕐 Ish vaqti tugadi', 'color': Colors.blue},
              {'value': 'BREAK', 'label': '☕ Tanaffus', 'color': Colors.amber},
              {'value': 'TECHNICAL', 'label': '🔧 Texnik muammo', 'color': Colors.orange},
              {'value': 'PERSONAL', 'label': '👤 Shaxsiy sabab', 'color': Colors.purple},
              {'value': 'OTHER', 'label': '📝 Boshqa', 'color': Colors.grey},
            ].map((r) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, r['value'] as String),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: (r['color'] as Color).withValues(alpha: 0.1),
                    foregroundColor: r['color'] as Color,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(r['label'] as String, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            )),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _locationService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final totalMinutes = _todaySession != null ? (_todaySession!['totalOnlineMinutes'] ?? 0) : 0;
    final hours = totalMinutes ~/ 60;
    final mins = totalMinutes % 60;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Ish Kabineti', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Status karta
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: _isOnline
                    ? [const Color(0xFF10B981), const Color(0xFF059669)]
                    : [const Color(0xFF64748B), const Color(0xFF475569)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: (_isOnline ? const Color(0xFF10B981) : const Color(0xFF64748B)).withValues(alpha: 0.3),
                    blurRadius: 20, offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Icon(_isOnline ? Icons.wifi : Icons.wifi_off, size: 48, color: Colors.white),
                  const SizedBox(height: 12),
                  Text(
                    _isOnline ? 'ONLINE' : 'OFFLINE',
                    style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: 3),
                  ),
                  if (_isOnline) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Lokatsiya yuborilmoqda...',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _toggleOnline,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: _isOnline ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: _isLoading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))
                        : Text(
                            _isOnline ? '⏹ Ishni Tugatish' : '▶ Ishni Boshlash',
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                          ),
                    ),
                  ),
                ],
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 20),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w600, fontSize: 13))),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Statistika kartalari
            Row(
              children: [
                _statCard('Bugungi ish', '$hours s $mins d', Icons.access_time, const Color(0xFF3B82F6)),
                const SizedBox(width: 12),
                _statCard('GPS', _locationService.lastPosition != null ? '${_locationService.lastPosition!.accuracy.toStringAsFixed(0)}m' : '—', Icons.gps_fixed, const Color(0xFF10B981)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _statCard('Tezlik', _locationService.lastPosition != null ? '${(_locationService.lastPosition!.speed * 3.6).toStringAsFixed(0)} km/s' : '—', Icons.speed, const Color(0xFFF59E0B)),
                const SizedBox(width: 12),
                _statCard('Status', _isOnline ? 'Faol' : "To'xtatilgan", _isOnline ? Icons.check_circle : Icons.pause_circle, _isOnline ? const Color(0xFF10B981) : const Color(0xFF94A3B8)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(value, style: const TextStyle(color: Color(0xFF1E293B), fontSize: 16, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
