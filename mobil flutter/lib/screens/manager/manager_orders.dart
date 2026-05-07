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
  List<dynamic> _services = [];
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
      final services = await getCompanyServices(_companyId);
      if (mounted) setState(() { _orders = data; _stages = stages; _services = services; _loading = false; });
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

  Future<void> _openEditDialog(Map<String, dynamic> order) async {
    final items = (order['items'] as List<dynamic>?) ?? [];
    
    // Build editable items list
    final editItems = items.map<Map<String, dynamic>>((it) {
      return {
        'serviceId': it['service']?['id'] ?? it['serviceId'] ?? '',
        'serviceName': it['service']?['name'] ?? 'Xizmat',
        'width': it['width']?.toString() ?? '',
        'length': it['length']?.toString() ?? '',
        'quantity': it['quantity']?.toString() ?? '1',
      };
    }).toList();

    final notesCtrl = TextEditingController(text: order['notes'] ?? '');
    
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _EditOrderSheet(
        order: order,
        items: editItems,
        services: _services,
        notesController: notesCtrl,
      ),
    );

    if (result == null) return;

    // Send update
    try {
      await updateOrder(order['id'], result);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('✅ Buyurtma tahrirlandi!'),
          backgroundColor: Color(0xFF059669),
        ));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Xatolik: ${e.toString().replaceFirst("Exception: ", "")}'),
        backgroundColor: Colors.red.shade900,
      ));
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
                    onEdit: () => _openEditDialog(_filtered[i]),
                  ),
                ),
        ),
      ),
    ]);
  }
}

// ─── Order Card ───────────────────────────────────────────────────────────────

class _OrderPipelineCard extends StatelessWidget {
  final Map<String, dynamic> order;
  final bool isUpdating;
  final VoidCallback onNextStage;
  final VoidCallback onEdit;
  const _OrderPipelineCard({required this.order, required this.isUpdating, required this.onNextStage, required this.onEdit});

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
        const SizedBox(height: 12),
        Row(children: [
          // Edit button
          Expanded(
            child: OutlinedButton.icon(
              onPressed: onEdit,
              icon: const Icon(Icons.edit_outlined, size: 16),
              label: const Text('Tahrirlash', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFf59e0b),
                side: const BorderSide(color: Color(0xFFf59e0b), width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          if (hasNext) ...[
            const SizedBox(width: 8),
            Expanded(
              flex: 2,
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
      ]),
    );
  }
}

// ─── Edit Order Bottom Sheet ──────────────────────────────────────────────────

class _EditOrderSheet extends StatefulWidget {
  final Map<String, dynamic> order;
  final List<Map<String, dynamic>> items;
  final List<dynamic> services;
  final TextEditingController notesController;

  const _EditOrderSheet({
    required this.order,
    required this.items,
    required this.services,
    required this.notesController,
  });

  @override
  State<_EditOrderSheet> createState() => _EditOrderSheetState();
}

class _EditOrderSheetState extends State<_EditOrderSheet> {
  late List<Map<String, dynamic>> _items;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _items = widget.items.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  void _addItem() {
    setState(() {
      _items.add({
        'serviceId': '',
        'serviceName': '',
        'width': '',
        'length': '',
        'quantity': '1',
      });
    });
  }

  void _removeItem(int index) {
    if (_items.length <= 1) return;
    setState(() => _items.removeAt(index));
  }

  void _save() {
    final validItems = _items.where((it) => (it['serviceId'] ?? '').toString().isNotEmpty).toList();
    if (validItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Kamida bitta xizmat tanlang!'), backgroundColor: Colors.red,
      ));
      return;
    }

    final result = {
      'customerId': widget.order['customer']?['id'] ?? widget.order['customerId'],
      'notes': widget.notesController.text.trim().isEmpty ? null : widget.notesController.text.trim(),
      'items': validItems.map((it) {
        final m = <String, dynamic>{
          'serviceId': it['serviceId'],
          'quantity': num.tryParse(it['quantity']?.toString() ?? '1') ?? 1,
        };
        if ((it['width'] ?? '').toString().isNotEmpty) m['width'] = num.tryParse(it['width'].toString());
        if ((it['length'] ?? '').toString().isNotEmpty) m['length'] = num.tryParse(it['length'].toString());
        return m;
      }).toList(),
    };

    Navigator.pop(context, result);
  }

  @override
  Widget build(BuildContext context) {
    final orderId = widget.order['id']?.toString().substring(0, 8) ?? '';

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: const BoxDecoration(
        color: kBackground,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(children: [
        // Handle bar
        Container(
          margin: const EdgeInsets.only(top: 12),
          width: 40, height: 4,
          decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(2)),
        ),
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFf59e0b).withAlpha(30),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.edit_note_rounded, color: Color(0xFFf59e0b), size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Buyurtmani Tahrirlash', style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w800, fontSize: 18)),
              Text('#$orderId', style: const TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.w600)),
            ])),
            IconButton(
              icon: const Icon(Icons.close, color: kTextMuted),
              onPressed: () => Navigator.pop(context),
            ),
          ]),
        ),
        const Divider(color: kBorder, height: 1),
        // Content
        Expanded(child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Items
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('XIZMATLAR', style: TextStyle(color: kTextMuted, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.5)),
              GestureDetector(
                onTap: _addItem,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: kPrimary.withAlpha(25), borderRadius: BorderRadius.circular(10)),
                  child: const Text('+ Qo\'shish', style: TextStyle(color: kPrimary, fontWeight: FontWeight.w700, fontSize: 12)),
                ),
              ),
            ]),
            const SizedBox(height: 12),
            ...List.generate(_items.length, (i) => _buildItemEditor(i)),
            
            const SizedBox(height: 20),
            // Notes
            const Text('IZOH', style: TextStyle(color: kTextMuted, fontWeight: FontWeight.w800, fontSize: 11, letterSpacing: 1.5)),
            const SizedBox(height: 8),
            TextField(
              controller: widget.notesController,
              maxLines: 3,
              style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w600, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Qo\'shimcha izoh...',
                hintStyle: const TextStyle(color: kTextMuted),
                filled: true,
                fillColor: kSurface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kBorder)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kPrimary, width: 2)),
              ),
            ),
          ]),
        )),
        // Save button
        Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: kBorder)),
          ),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _saving ? null : _save,
              icon: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.check_circle_outline, size: 20),
              label: Text(_saving ? 'Saqlanmoqda...' : 'Saqlash', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              style: ElevatedButton.styleFrom(
                backgroundColor: kPrimary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _buildItemEditor(int index) {
    final item = _items[index];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kBorder),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Service selector + remove
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              value: widget.services.any((s) => s['id'] == item['serviceId']) ? item['serviceId'] : null,
              items: widget.services.map<DropdownMenuItem<String>>((s) => DropdownMenuItem(
                value: s['id'] as String,
                child: Text('${s['name']} — ${s['price']} so\'m', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              )).toList(),
              onChanged: (v) => setState(() => item['serviceId'] = v ?? ''),
              decoration: InputDecoration(
                labelText: 'Xizmat turi',
                labelStyle: const TextStyle(color: kTextMuted, fontSize: 12),
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kPrimary)),
              ),
              dropdownColor: kSurface,
              style: const TextStyle(color: kTextPrimary),
            ),
          ),
          if (_items.length > 1) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => _removeItem(index),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.close, color: Colors.red, size: 18),
              ),
            ),
          ],
        ]),
        const SizedBox(height: 10),
        // Dimensions row
        Row(children: [
          Expanded(child: _miniField('Eni (m)', item['width']?.toString() ?? '', (v) => item['width'] = v)),
          const SizedBox(width: 8),
          Expanded(child: _miniField('Bo\'yi (m)', item['length']?.toString() ?? '', (v) => item['length'] = v)),
          const SizedBox(width: 8),
          Expanded(child: _miniField('Soni', item['quantity']?.toString() ?? '1', (v) => item['quantity'] = v)),
        ]),
      ]),
    );
  }

  Widget _miniField(String label, String value, ValueChanged<String> onChanged) {
    return TextField(
      controller: TextEditingController(text: value),
      onChanged: onChanged,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.w700, fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: kTextMuted, fontSize: 11),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kBorder)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kPrimary)),
      ),
    );
  }
}
