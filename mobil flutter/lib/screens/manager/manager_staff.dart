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
            ...drivers.map((u) => _StaffCard(user: u, onCall: () => _call(u['phone'] ?? ''), onTap: () => _openAttendance(u))),
            const SizedBox(height: 16),
          ],
          if (workers.isNotEmpty) ...[
            _SectionTitle('👷 Ishchilar (${workers.length})'),
            ...workers.map((u) => _StaffCard(user: u, onCall: () => _call(u['phone'] ?? ''), onTap: () => _openAttendance(u))),
            const SizedBox(height: 16),
          ],
          if (managers.isNotEmpty) ...[
            _SectionTitle('👔 Managerlar (${managers.length})'),
            ...managers.map((u) => _StaffCard(user: u, onCall: () => _call(u['phone'] ?? ''), onTap: () => _openAttendance(u))),
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

  void _openAttendance(Map<String, dynamic> staff) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (c) => StaffAttendanceSheet(staff: staff, companyId: _companyId),
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
  final VoidCallback onTap;
  const _StaffCard({required this.user, required this.onCall, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final name = user['fullName'] ?? 'Noma\'lum';
    final phone = user['phone'] ?? '';
    final role = user['role'] as String? ?? '';
    final salary = user['salary'] != null ? (double.tryParse(user['salary'].toString())?.toInt() ?? 0) : null;
    final schedule = user['workSchedule'] ?? 'MONTHLY';
    final roleLabels = {'DRIVER': '🚐 Haydovchi', 'WORKER': '👷 Ishchi', 'MANAGER': '👔 Manager'};
    final scheduleLabels = {'MONTHLY': 'Oylik', 'WEEKLY': 'Haftalik', 'DAILY': 'Kunlik', 'HOURLY': 'Soatlik'};

    return GestureDetector(
      onTap: onTap,
      child: Container(
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
                Text('💰 $salary so\'m (${scheduleLabels[schedule]})', style: const TextStyle(color: kPrimary, fontSize: 11, fontWeight: FontWeight.w700)),
              ],
            ]),
            if (phone.isNotEmpty) Text(phone, style: const TextStyle(color: kTextSecondary, fontSize: 12)),
          ])),
          // Actions
          if (phone.isNotEmpty)
            GestureDetector(
              onTap: () async {
                 final uri = Uri.parse('tel:$phone');
                 if (await canLaunchUrl(uri)) await launchUrl(uri);
              },
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: const Color(0xFF10b981).withAlpha(20), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.call, color: Color(0xFF10b981), size: 20),
              ),
            ),
        ]),
      ),
    );
  }
}

class StaffAttendanceSheet extends StatefulWidget {
  final Map<String, dynamic> staff;
  final String companyId;
  const StaffAttendanceSheet({super.key, required this.staff, required this.companyId});

  @override
  State<StaffAttendanceSheet> createState() => _StaffAttendanceSheetState();
}

class _StaffAttendanceSheetState extends State<StaffAttendanceSheet> {
  bool _loading = true;
  List<dynamic> _attendances = [];
  late DateTime _startDate;
  late DateTime _endDate;
  
  // Local state for user profile changes
  late String _schedule;
  late int _salary;
  late int _lunchMinutes;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startDate = DateTime(now.year, now.month, 1);
    _endDate = DateTime(now.year, now.month + 1, 0); // last day of month
    
    _schedule = widget.staff['workSchedule'] ?? 'MONTHLY';
    _salary = (widget.staff['salary'] ?? 0) is int ? widget.staff['salary'] : (double.tryParse(widget.staff['salary'].toString())?.toInt() ?? 0);
    _lunchMinutes = (widget.staff['lunchBreakMinutes'] ?? 60) is int ? widget.staff['lunchBreakMinutes'] : (double.tryParse(widget.staff['lunchBreakMinutes'].toString())?.toInt() ?? 60);
    
    _load();
  }

  Future<void> _load() async {
    try {
      final s = _startDate.toIso8601String().split('T')[0];
      final e = _endDate.toIso8601String().split('T')[0];
      final data = await apiRequest('/attendance/company/${widget.companyId}?startDate=$s&endDate=$e');
      if (mounted) {
        setState(() {
          _attendances = (data as List?)?.where((a) => a['userId'] == widget.staff['id']).toList() ?? [];
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _updateProfile() async {
    try {
      await apiRequest('/users/${widget.staff['id']}', method: 'PATCH', body: {
        'workSchedule': _schedule,
        'salary': _salary,
        'lunchBreakMinutes': _lunchMinutes,
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil yangilandi')));
    } catch (e) {
      // Ignore
    }
  }

  void _showDayEditor(DateTime date, Map<String, dynamic>? currentAtt) {
    String status = currentAtt?['status'] ?? 'PRESENT';
    String startTime = currentAtt?['startTime'] ?? '09:00';
    String endTime = currentAtt?['endTime'] ?? '18:00';
    
    int calcSalary() {
      if (status == 'ABSENT') return 0;
      if (_schedule == 'MONTHLY') return (status == 'HALF_DAY') ? (_salary / 30 / 2).round() : (_salary / 30).round();
      if (_schedule == 'WEEKLY') return (status == 'HALF_DAY') ? (_salary / 6 / 2).round() : (_salary / 6).round();
      if (_schedule == 'DAILY') return (status == 'HALF_DAY') ? (_salary / 2).round() : _salary;
      if (_schedule == 'HOURLY') {
        try {
           final s = startTime.split(':');
           final e = endTime.split(':');
           final sH = int.parse(s[0]) + int.parse(s[1])/60;
           final eH = int.parse(e[0]) + int.parse(e[1])/60;
           double h = (eH - sH) - (_lunchMinutes / 60);
           if (h < 0) h = 0;
           return (_salary * h).round();
        } catch (_) { return 0; }
      }
      return 0;
    }
    
    int cSal = currentAtt?['calculatedSalary'] != null ? 
        (currentAtt!['calculatedSalary'] is int ? currentAtt['calculatedSalary'] : (double.tryParse(currentAtt['calculatedSalary'].toString())?.toInt() ?? 0)) 
        : calcSalary();

    final dateStr = date.toIso8601String().split('T')[0];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (c) {
        return StatefulBuilder(builder: (c, setModalState) {
          void autoCalc() {
             setModalState(() { cSal = calcSalary(); });
          }
          return Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(c).viewInsets.bottom, left: 20, right: 20, top: 20),
            decoration: const BoxDecoration(
              color: kSurface,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('📅 $dateStr davomati', style: const TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 20),
                  
                  // Status
                  const Text('Holat', style: TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(border: Border.all(color: kSurface2), borderRadius: BorderRadius.circular(12)),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: status,
                        dropdownColor: kSurface,
                        items: const [
                          DropdownMenuItem(value: 'PRESENT', child: Text('✅ Keldi (To\'liq kun)')),
                          DropdownMenuItem(value: 'HALF_DAY', child: Text('⏱ Yarim kun')),
                          DropdownMenuItem(value: 'HOURLY', child: Text('⏰ Soatlik')),
                          DropdownMenuItem(value: 'ABSENT', child: Text('❌ Kelmadi')),
                        ],
                        onChanged: (v) {
                          if (v != null) { status = v; autoCalc(); }
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Times
                  Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Keldi (HH:mm)', style: TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      TextFormField(
                        initialValue: startTime,
                        style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          filled: true, fillColor: kBackground,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                        onChanged: (v) { startTime = v; autoCalc(); },
                      ),
                    ])),
                    const SizedBox(width: 16),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Ketdi (HH:mm)', style: TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      TextFormField(
                        initialValue: endTime,
                        style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.bold),
                        decoration: InputDecoration(
                          filled: true, fillColor: kBackground,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        ),
                        onChanged: (v) { endTime = v; autoCalc(); },
                      ),
                    ])),
                  ]),
                  const SizedBox(height: 16),

                  // Calculated Salary
                  const Text('Kunlik Maosh (so\'m)', style: TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  TextFormField(
                    key: ValueKey(cSal.toString()),
                    initialValue: cSal.toString(),
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: kPrimary, fontWeight: FontWeight.w900, fontSize: 18),
                    decoration: InputDecoration(
                      filled: true, fillColor: kPrimary.withAlpha(10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    onChanged: (v) { cSal = int.tryParse(v) ?? 0; },
                  ),
                  const SizedBox(height: 24),

                  // Save Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kPrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () async {
                        Navigator.pop(c);
                        try {
                          await apiRequest('/attendance', method: 'POST', body: {
                            'userId': widget.staff['id'],
                            'companyId': widget.companyId,
                            'date': dateStr,
                            'status': status,
                            'startTime': startTime,
                            'endTime': endTime,
                            'calculatedSalary': cSal,
                          });
                          await _load();
                        } catch (e) {
                           //
                        }
                      },
                      child: const Text('Saqlash', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        });
      }
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: kBackground,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          decoration: const BoxDecoration(
            color: kSurface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(bottom: BorderSide(color: kSurface2)),
          ),
          child: Row(children: [
             Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
               Text(widget.staff['fullName'] ?? '', style: const TextStyle(color: kTextPrimary, fontSize: 18, fontWeight: FontWeight.w900)),
               const Text('Davomat va Ish haqi', style: TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.w600)),
             ])),
             IconButton(icon: const Icon(Icons.close, color: kTextMuted), onPressed: () => Navigator.pop(context)),
          ]),
        ),

        Expanded(
          child: _loading ? const Center(child: CircularProgressIndicator(color: kPrimary)) : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Profile settings box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(16), border: Border.all(color: kSurface2)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('⚙️ Ish Tartibi', style: TextStyle(color: kTextPrimary, fontWeight: FontWeight.w800, fontSize: 14)),
                  const SizedBox(height: 12),
                  Row(children: [
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Rejim', style: TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: _schedule,
                          dropdownColor: kSurface,
                          style: const TextStyle(color: kTextPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                          items: const [
                            DropdownMenuItem(value: 'MONTHLY', child: Text('📅 Oylik')),
                            DropdownMenuItem(value: 'WEEKLY', child: Text('📆 Haftalik')),
                            DropdownMenuItem(value: 'DAILY', child: Text('📋 Kunlik')),
                            DropdownMenuItem(value: 'HOURLY', child: Text('⏰ Soatlik')),
                          ],
                          onChanged: (v) { if (v!=null) setState((){ _schedule=v; _updateProfile(); }); },
                        ),
                      ),
                    ])),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Maosh / Stavka', style: TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      TextFormField(
                        initialValue: _salary.toString(),
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: kTextPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                        decoration: const InputDecoration(isDense: true, border: InputBorder.none),
                        onChanged: (v) { _salary = int.tryParse(v) ?? 0; _updateProfile(); },
                      ),
                    ])),
                  ]),
                ]),
              ),
              const SizedBox(height: 16),

              // Calendar Days List
              const Text('📅 Davomat', style: TextStyle(color: kTextPrimary, fontWeight: FontWeight.w800, fontSize: 14)),
              const SizedBox(height: 8),
              
              ...List.generate(
                _endDate.day,
                (index) {
                  final date = DateTime(_startDate.year, _startDate.month, index + 1);
                  final dateStr = date.toIso8601String().split('T')[0];
                  final isToday = date.day == DateTime.now().day && date.month == DateTime.now().month;
                  final isSun = date.weekday == 7;
                  
                  // Find attendance
                  final att = _attendances.cast<Map<String,dynamic>?>().firstWhere((a) => a?['date']?.startsWith(dateStr) == true, orElse: () => null);
                  
                  final statusLabels = {'PRESENT': '✅', 'HALF_DAY': '⏱', 'HOURLY': '⏰', 'ABSENT': '❌'};
                  final sal = att?['calculatedSalary'] ?? 0;

                  return GestureDetector(
                    onTap: () => _showDayEditor(date, att),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: isToday ? kPrimary.withAlpha(20) : (isSun ? const Color(0xFFf43f5e).withAlpha(10) : kSurface),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isToday ? kPrimary.withAlpha(50) : kSurface2),
                      ),
                      child: Row(children: [
                        SizedBox(
                          width: 40,
                          child: Column(children: [
                            Text('${date.day}', style: TextStyle(color: isToday ? kPrimary : kTextPrimary, fontSize: 16, fontWeight: FontWeight.w900)),
                            Text(['Dush','Sesh','Chor','Pay','Jum','Shan','Yak'][date.weekday-1], 
                               style: TextStyle(color: isSun ? const Color(0xFFf43f5e) : kTextMuted, fontSize: 9, fontWeight: FontWeight.bold)),
                          ]),
                        ),
                        const SizedBox(width: 12),
                        if (att != null) ...[
                          Text(statusLabels[att['status']] ?? '?', style: const TextStyle(fontSize: 16)),
                          const SizedBox(width: 8),
                          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                             Text('${att['startTime']} - ${att['endTime']}', style: const TextStyle(color: kTextPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                             Text('Soat: ${att['workedHours'] ?? '-'}', style: const TextStyle(color: kTextMuted, fontSize: 10)),
                          ]),
                          const Spacer(),
                          Text('$sal so\'m', style: const TextStyle(color: Color(0xFF10b981), fontSize: 14, fontWeight: FontWeight.w900)),
                        ] else ...[
                          const Text('Belgilanmagan', style: TextStyle(color: kTextMuted, fontSize: 12, fontWeight: FontWeight.w600)),
                          const Spacer(),
                          const Icon(Icons.edit_calendar, color: kTextMuted, size: 16),
                        ],
                      ]),
                    ),
                  );
                }
              ).reversed.toList(), // show newest days first
              const SizedBox(height: 40),
            ],
          ),
        ),
      ]),
    );
  }
}

