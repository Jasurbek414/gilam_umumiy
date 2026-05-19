import 'dart:async';
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/api.dart';
import '../core/chat_service.dart';
import 'orders_screen.dart';
import 'chat_screen.dart';
import 'profile_screen.dart';
import 'driver_cabinet_screen.dart';
import 'manager/manager_dashboard.dart';
import 'manager/manager_orders.dart';
import 'manager/manager_staff.dart';

class HomeScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;
  const HomeScreen({super.key, required this.user, required this.onLogout});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  int _tab = 0; // 0=Buyurtmalar(yoki Ish), 1=Profil

  @override
  void initState() {
    super.initState();
    ChatService.instance.connect();
  }

  @override
  void dispose() {
    ChatService.instance.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    final isFac = user['appRole'] == 'FACILITY';
    final isManager = user['appRole'] == 'MANAGER';
    final isWorker = user['appRole'] == 'WORKER';
    final role = isManager ? 'Manager' : isWorker ? 'Ishchi' : isFac ? 'Sex xodimi' : 'Haydovchi';

    final pages = isManager
        ? [
            ManagerDashboard(user: user),
            ManagerOrders(user: user),
            ManagerStaff(user: user),
            ProfileScreen(user: user, onLogout: widget.onLogout),
          ]
        : (user['appRole'] == 'DRIVER')
          ? [
              DriverCabinetScreen(),
              OrdersPage(user: user),
              ProfileScreen(user: user, onLogout: widget.onLogout),
            ]
          : [
              OrdersPage(user: user),
              ProfileScreen(user: user, onLogout: widget.onLogout),
            ];

    return Scaffold(
      backgroundColor: kBackground,
      appBar: _buildAppBar(role),
      body: IndexedStack(index: _tab, children: pages),
      bottomNavigationBar: isManager ? _buildManagerNav() : _buildNav(),
    );
  }

  PreferredSizeWidget _buildAppBar(String role) {
    return AppBar(
      backgroundColor: kBackground,
      elevation: 0,
      titleSpacing: 16,
      title: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: kPrimary.withAlpha(20),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: kPrimary.withAlpha(40)),
          ),
          child: const Center(child: Text('🏠', style: TextStyle(fontSize: 20))),
        ),
        const SizedBox(width: 10),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Gilam Xodim',
              style: TextStyle(color: kTextPrimary, fontSize: 16, fontWeight: FontWeight.w900)),
          Text(role, style: const TextStyle(color: kTextMuted, fontSize: 11, fontWeight: FontWeight.w500)),
        ]),
      ]),
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 14),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: kPrimary.withAlpha(20),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: kPrimary.withAlpha(60)),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 7, height: 7,
                decoration: const BoxDecoration(color: kPrimary, shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Text(role,
                style: const TextStyle(color: kPrimary, fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
        ),
      ],
    );
  }

  void _openChat() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatPage(currentUser: widget.user),
      ),
    );
  }

  Widget _buildNav() {
    final isDriver = widget.user['appRole'] == 'DRIVER';
    final items = isDriver
      ? [
          (Icons.work_outline, Icons.work, 'Ish Kabineti', false),
          (Icons.list_alt_outlined, Icons.list_alt_rounded, 'Buyurtmalar', false),
          (Icons.chat_bubble_outline_rounded, Icons.chat_bubble_rounded, 'Operator', true),
          (Icons.person_outline_rounded, Icons.person_rounded, 'Profil', false),
        ]
      : [
          (Icons.list_alt_outlined, Icons.list_alt_rounded, 'Buyurtmalar', false),
          (Icons.chat_bubble_outline_rounded, Icons.chat_bubble_rounded, 'Operator', true),
          (Icons.person_outline_rounded, Icons.person_rounded, 'Profil', false),
        ];
    final int chatIdx = isDriver ? 2 : 1;

    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        border: Border(top: BorderSide(color: kSurface2, width: 1)),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(30), blurRadius: 10, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(items.length, (i) {
              final isChat = i == chatIdx;
              final sel = !isChat && _getTabIndex(i, isDriver) == _tab;
              final item = items[i];

              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    if (isChat) {
                      _openChat();
                    } else {
                      setState(() => _tab = _getTabIndex(i, isDriver));
                    }
                  },
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                      decoration: BoxDecoration(
                        color: sel ? kPrimary.withAlpha(25) : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Icon(
                        sel ? item.$2 : item.$1,
                        color: isChat ? kPrimary.withAlpha(180) : (sel ? kPrimary : kTextMuted),
                        size: 24,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(item.$3, style: TextStyle(
                      color: isChat ? kPrimary.withAlpha(180) : (sel ? kPrimary : kTextMuted),
                      fontSize: 11,
                      fontWeight: sel || isChat ? FontWeight.w700 : FontWeight.w500,
                    )),
                  ]),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  int _getTabIndex(int navIdx, bool isDriver) {
    if (isDriver) {
      if (navIdx == 0) return 0;
      if (navIdx == 1) return 1;
      if (navIdx == 3) return 2;
      return 0;
    } else {
      if (navIdx == 0) return 0;
      if (navIdx == 2) return 1;
      return 0;
    }
  }

  Widget _buildManagerNav() {
    final items = [
      (Icons.dashboard_outlined, Icons.dashboard_rounded, 'Dashboard'),
      (Icons.list_alt_outlined, Icons.list_alt_rounded, 'Buyurtmalar'),
      (Icons.people_outline_rounded, Icons.people_rounded, 'Xodimlar'),
      (Icons.chat_bubble_outline_rounded, Icons.chat_bubble_rounded, 'Operator'),
      (Icons.person_outline_rounded, Icons.person_rounded, 'Profil'),
    ];
    const int chatIdx = 3;

    return Container(
      decoration: BoxDecoration(
        color: kSurface,
        border: Border(top: BorderSide(color: kSurface2, width: 1)),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(30), blurRadius: 10, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(items.length, (i) {
              final isChat = i == chatIdx;
              final tabIdx = i < chatIdx ? i : i - 1; // skip chat
              final sel = !isChat && tabIdx == _tab;
              final item = items[i];

              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    if (isChat) {
                      _openChat();
                    } else {
                      setState(() => _tab = tabIdx);
                    }
                  },
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: sel ? kPrimary.withAlpha(25) : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Icon(
                        sel ? item.$2 : item.$1,
                        color: isChat ? kPrimary.withAlpha(180) : (sel ? kPrimary : kTextMuted),
                        size: 22,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(item.$3, style: TextStyle(
                      color: isChat ? kPrimary.withAlpha(180) : (sel ? kPrimary : kTextMuted),
                      fontSize: 10,
                      fontWeight: sel || isChat ? FontWeight.w700 : FontWeight.w500,
                    )),
                  ]),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
