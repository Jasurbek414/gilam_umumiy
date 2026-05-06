import 'package:flutter/material.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';

class ManagerOrders extends StatefulWidget {
  final Map<String, dynamic> user;
  const ManagerOrders({super.key, required this.user});
  @override
  State<ManagerOrders> createState() => _ManagerOrdersState();
}

class _ManagerOrdersState extends State<ManagerOrders> {
  List<dynamic> _orders = [];
  List<dynamic> _stages = [];
  bool _loading = true;
  String _filter = 'ALL';
  String? _updatingId;

  String get _companyId => widget.user['companyId'] ?? widget.user['company']?['id'] ?? '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final data = await getFacilityOrders(_companyId);
      final stages = await getFacilityStages(_companyId);
      if (mounted) setState(() { _orders = data; _stages = stages; _loading = false; });
    } catch (e) { if (mounted) setState(() => _loading = false); }
  }

  List<dynamic> get _filtered {
    if (_filter == 'ALL') return _orders;
    return _orders.where((o) => o['status'] == _filter).toList();
  }

  Future<void> _nextStage(Map<String, dynamic> order) async {
    final status = order['status'] as String? ?? '';
    final config = statusConfig[status];
    final next = config?['next'] as String?;
    if (next == null) return;

    final ok = await _confirm('Buyurtmani "${config?['nextLabel'] ?? next}" bosqichiga o\'tkazasizmi?');
    if (!ok) return;

    setState(() => _updatingId = order['id']);
    try {
      await updateOrderStatus(order['id'], next);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('✅ Buyurtma "$next" bosqichiga o\'tkazildi'),
          backgroundColor: const Color(0xFF059669),
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceFirst('Exception: ', '')), backgroundColor: Colors.red.shade900));
    } finally {
      if (mounted) setState(() => _updatingId = null);
    }
  }

  Future<bool> _confirm(String msg) async {
    final res = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
      backgroundColor: kSurface,
      title: const Text('Tasdiqlash', style: TextStyle(color: kTextPrimary, fontWeight: FontWeight.w800)),
      content: Text(msg, style: const TextStyle(color: kTextSecondary)),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Bekor', style: TextStyle(color: kTextMuted))),
        ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Tasdiqlayman')),
      ],
    ));
    return res == true;
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: kPrimary));

    final filters = [
      {'key': 'ALL', 'label': 'Barchasi'},
      {'key': 'AT_FACILITY', 'label': '🏭 Sexda'},
      {'key': 'WASHING', 'label': '🧼 Yuvish'},
      {'key': 'DRYING', 'label': '☀️ Quritish'},
      {'key': 'FINISHED', 'label': '✨ Pardoz'},
      {'key': 'READY_FOR_DELIVERY', 'label': '✅ Tayyor'},
    ];

    return Column(children: [
      // Filter chips
      SizedBox(
        height: 50,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          itemCount: filters.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final f = filters[i];
            final active = _filter == f['key'];
            return GestureDetector(
              onTap: () => setState(() => _filter = f['key']!),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: active ? kPrimary : kSurface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: active ? kPrimary : kBorder),
                ),
                child: Text(f['label']!, style: TextStyle(
                  color: active ? kBackground : kTextSecondary, fontWeight: FontWeight.w700, fontSize: 13)),
              ),
            );
          },
        ),
      ),
      // Orders list
      Expanded(
        child: RefreshIndicator(
          color: kPrimary,
          onRefresh: () async { setState(() => _loading = true); await _load(); },
          child: _filtered.isEmpty
              ? ListView(children: const [
                  SizedBox(height: 80),
                  Icon(Icons.inbox_outlined, size: 64, color: Color(0xFF27272a)),
                  SizedBox(height: 16),
                  Center(child: Text('Buyurtmalar yo\'q', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800))),
                ])
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                  itemCount: _filtered.length,
                  itemBuilder: (_, i) => _OrderPipelineCard(
                    order: _filtered[i],
                    isUpdating: _updatingId == _filtered[i]['id'],
                    onNextStage: () => _nextStage(_filtered[i]),
                  ),
                ),
        ),
      ),
    ]);
  }
}

class _OrderPipelineCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final bool isUpdating;
  final VoidCallback onNextStage;
  const _OrderPipelineCard({required this.order, required this.isUpdating, required this.onNextStage});

  @override
  Widget build(BuildContext context) {
    final config = statusConfig[order['status']] ?? {'label': order['status'], 'emoji': '📦', 'color': 0xFF71717a};
    final customer = order['customer'] as Map<String, dynamic>?;
    final items = order['items'] as List<dynamic>?;
    final hasNext = config['next'] != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(20), border: Border.all(color: kSurface2)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(
            '${customer?['fullName'] ?? "Noma\'lum"} #${order['id'].toString().substring(0, 5)}',
            style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w800, fontSize: 15),
            overflow: TextOverflow.ellipsis,
          )),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Color(config['color'] as int).withAlpha(38),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text('${config['emoji']} ${config['label']}',
                style: TextStyle(color: Color(config['color'] as int), fontWeight: FontWeight.w700, fontSize: 12)),
          ),
        ]),
        if (items != null && items.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(items.map((i) => '${i['service']?['name']} (${i['quantity']})').join(', '),
              style: const TextStyle(color: kTextSecondary, fontSize: 12), overflow: TextOverflow.ellipsis),
        ],
        if (order['totalAmount'] != null) ...[
          const SizedBox(height: 6),
          Text('💰 ${order['totalAmount']} so\'m', style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w800, fontSize: 14)),
        ],
        if (hasNext) ...[
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: isUpdating ? null : onNextStage,
              icon: isUpdating
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.arrow_forward_rounded, size: 18),
              label: Text(config['nextLabel'] as String? ?? 'Keyingi',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary, foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ],
      ]),
    );
  }
}
