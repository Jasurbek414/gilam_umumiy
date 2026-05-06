import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api.dart';
import '../../core/theme.dart';

class ManagerStaff extends StatefulWidget {
  final Map<String, dynamic> user;
  const ManagerStaff({super.key, required this.user});
  @override
  State<ManagerStaff> createState() => _ManagerStaffState();
}

class _ManagerStaffState extends State<ManagerStaff> {
  List<dynamic> _staff = [];
  bool _loading = true;

  String get _companyId => widget.user['companyId'] ?? widget.user['company']?['id'] ?? '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final data = await apiRequest('/users/company/$_companyId');
      if (mounted) setState(() { _staff = (data as List?) ?? []; _loading = false; });
    } catch (e) { if (mounted) setState(() => _loading = false); }
  }

  void _call(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: kPrimary));

    final drivers = _staff.where((u) => u['role'] == 'DRIVER').toList();
    final workers = _staff.where((u) => u['role'] == 'WORKER').toList();
    final managers = _staff.where((u) => u['role'] == 'MANAGER').toList();

    return RefreshIndicator(
      color: kPrimary,
      onRefresh: () async { setState(() => _loading = true); await _load(); },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: kSurface, borderRadius: BorderRadius.circular(16), border: Border.all(color: kSurface2)),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
              _CountBadge('Haydovchilar', drivers.length, Icons.directions_car, const Color(0xFF3b82f6)),
              _CountBadge('Ishchilar', workers.length, Icons.engineering, const Color(0xFFf59e0b)),
              _CountBadge('Managerlar', managers.length, Icons.admin_panel_settings, const Color(0xFF8b5cf6)),
            ]),
          ),
          const SizedBox(height: 20),

          if (drivers.isNotEmpty) ...[
            _SectionTitle('🚐 Haydovchilar (${drivers.length})'),
            ...drivers.map((u) => _StaffCard(user: u, onCall: () => _call(u['phone'] ?? ''))),
            const SizedBox(height: 16),
          ],
          if (workers.isNotEmpty) ...[
            _SectionTitle('👷 Ishchilar (${workers.length})'),
            ...workers.map((u) => _StaffCard(user: u, onCall: () => _call(u['phone'] ?? ''))),
            const SizedBox(height: 16),
          ],
          if (managers.isNotEmpty) ...[
            _SectionTitle('👔 Managerlar (${managers.length})'),
            ...managers.map((u) => _StaffCard(user: u, onCall: () => _call(u['phone'] ?? ''))),
          ],
          if (_staff.isEmpty)
            const Center(child: Padding(
              padding: EdgeInsets.only(top: 80),
              child: Text('Xodimlar topilmadi', style: TextStyle(color: kTextMuted, fontSize: 16)),
            )),
        ],
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final String label;
  final int count;
  final IconData icon;
  final Color color;
  const _CountBadge(this.label, this.count, this.icon, this.color);
  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: color.withAlpha(25), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: color, size: 24),
      ),
      const SizedBox(height: 6),
      Text('$count', style: const TextStyle(color: kTextPrimary, fontSize: 20, fontWeight: FontWeight.w900)),
      Text(label, style: const TextStyle(color: kTextMuted, fontSize: 10, fontWeight: FontWeight.w600)),
    ]);
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(text, style: const TextStyle(color: kTextPrimary, fontSize: 16, fontWeight: FontWeight.w800)),
    );
  }
}

class _StaffCard extends StatelessWidget {
  final Map<String, dynamic> user;
  final VoidCallback onCall;
  const _StaffCard({required this.user, required this.onCall});

  @override
  Widget build(BuildContext context) {
    final name = user['fullName'] ?? 'Noma\'lum';
    final phone = user['phone'] ?? '';
    final role = user['role'] as String? ?? '';
    final salary = user['salary'];
    final roleLabels = {'DRIVER': '🚐 Haydovchi', 'WORKER': '👷 Ishchi', 'MANAGER': '👔 Manager'};

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(16), border: Border.all(color: kSurface2)),
      child: Row(children: [
        // Avatar
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: kPrimary.withAlpha(20), borderRadius: BorderRadius.circular(14),
            border: Border.all(color: kPrimary.withAlpha(40)),
          ),
          child: Center(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: const TextStyle(color: kPrimary, fontSize: 18, fontWeight: FontWeight.w900))),
        ),
        const SizedBox(width: 12),
        // Info
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name, style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 2),
          Row(children: [
            Text(roleLabels[role] ?? role, style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w600)),
            if (salary != null) ...[
              const SizedBox(width: 8),
              Text('💰 $salary so\'m', style: const TextStyle(color: kPrimary, fontSize: 11, fontWeight: FontWeight.w700)),
            ],
          ]),
          if (phone.isNotEmpty) Text(phone, style: const TextStyle(color: kTextSecondary, fontSize: 12)),
        ])),
        // Call button
        if (phone.isNotEmpty)
          GestureDetector(
            onTap: onCall,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFF10b981).withAlpha(20), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.call, color: Color(0xFF10b981), size: 20),
            ),
          ),
      ]),
    );
  }
}
