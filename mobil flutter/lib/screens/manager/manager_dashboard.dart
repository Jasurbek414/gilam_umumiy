import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/theme.dart';

class ManagerDashboard extends StatefulWidget {
  final Map<String, dynamic> user;
  const ManagerDashboard({super.key, required this.user});
  @override
  State<ManagerDashboard> createState() => _ManagerDashboardState();
}

class _ManagerDashboardState extends State<ManagerDashboard> {
  Map<String, dynamic> _stats = {};
  List<dynamic> _orders = [];
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final companyId = widget.user['companyId'] ?? widget.user['company']?['id'];
      if (companyId == null) return;
      final results = await Future.wait([
        apiRequest('/orders/company/$companyId/stats'),
        getFacilityOrders(companyId),
      ]);
      if (mounted) setState(() {
        _stats = results[0] as Map<String, dynamic>? ?? {};
        _orders = results[1] as List<dynamic>? ?? [];
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: kPrimary));

    final statCards = [
      _StatData('Jami', '${_stats['totalOrders'] ?? 0}', Icons.inventory_2_outlined, const Color(0xFF3b82f6)),
      _StatData('Yangi', '${_stats['newOrders'] ?? 0}', Icons.fiber_new_outlined, const Color(0xFFf59e0b)),
      _StatData('Jarayonda', '${_stats['inProgress'] ?? 0}', Icons.sync_outlined, const Color(0xFF8b5cf6)),
      _StatData('Tayyor', '${_stats['completed'] ?? 0}', Icons.check_circle_outline, const Color(0xFF10b981)),
    ];

    // Status breakdown
    final statusCounts = <String, int>{};
    for (final o in _orders) {
      final s = o['status'] as String? ?? 'UNKNOWN';
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    }

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: () async { setState(() => _loading = true); await _load(); },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Greeting
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF3b82f6), Color(0xFF8b5cf6)]),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Salom, ${widget.user['fullName'] ?? 'Manager'} 👋',
                  style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Bugun ${DateTime.now().day}.${DateTime.now().month}.${DateTime.now().year}',
                  style: TextStyle(color: Colors.white.withAlpha(180), fontSize: 13)),
              const SizedBox(height: 16),
              Row(children: [
                const Icon(Icons.attach_money, color: Colors.white, size: 28),
                const SizedBox(width: 8),
                Text('${((_stats['totalRevenue'] ?? 0) as num).toStringAsFixed(0)} so\'m',
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
              ]),
              Text('Jami tushum', style: TextStyle(color: Colors.white.withAlpha(160), fontSize: 12)),
            ]),
          ),
          const SizedBox(height: 16),

          // Stat cards grid
          GridView.count(
            crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.15,
            children: statCards.map((s) => Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: kSurface, borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kSurface2),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: s.color.withAlpha(25), borderRadius: BorderRadius.circular(10)),
                  child: Icon(s.icon, color: s.color, size: 20),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s.value, style: const TextStyle(color: kTextPrimary, fontSize: 22, fontWeight: FontWeight.w900)),
                  Text(s.label, style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w600)),
                ]),
              ]),
            )).toList(),
          ),
          const SizedBox(height: 20),

          // Pipeline summary
          const Text('📊 Sexdagi buyurtmalar holati', style: TextStyle(color: kTextPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          ...statusCounts.entries.map((e) {
            final total = _orders.length;
            final pct = total > 0 ? e.value / total : 0.0;
            final labels = {'AT_FACILITY':'🏭 Sexda','WASHING':'🧼 Yuvilmoqda','DRYING':'☀️ Quritilmoqda','FINISHED':'✨ Pardozda'};
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(14), border: Border.all(color: kSurface2)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(labels[e.key] ?? e.key, style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w700, fontSize: 14)),
                    Text('${e.value} ta', style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w800)),
                  ]),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: pct, backgroundColor: kSurface2, color: kPrimary, minHeight: 6),
                  ),
                ]),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _StatData {
  final String label, value;
  final IconData icon;
  final Color color;
  _StatData(this.label, this.value, this.icon, this.color);
}
