import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:camera/camera.dart';
import 'api/api_service.dart';
import 'custom_code/widgets/ocr_camera_scanner_widget.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadSavedBaseUrl();
  runApp(const NagariApp());
}

class NagariApp extends StatelessWidget {
  const NagariApp({super.key});

  @override
  Widget build(BuildContext context) {
    const primaryColor = Color(0xFF00569E);
    const accentColor = Color(0xFF0D9BD2);

    return MaterialApp(
      title: 'MTR-Report Mobile — Bank Nagari',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryColor,
          primary: primaryColor,
          secondary: accentColor,
          surface: const Color(0xFFF8FAFC),
          onPrimary: Colors.white,
        ),
        scaffoldBackgroundColor: const Color(0xFFF0F4F8),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF00569E),
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontFamily: 'Roboto',
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.white,
            letterSpacing: -0.3,
          ),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color: Colors.white,
          margin: EdgeInsets.zero,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: primaryColor, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: primaryColor,
            foregroundColor: Colors.white,
            elevation: 0,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(foregroundColor: primaryColor),
        ),
      ),
      home: const SplashScreen(),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SPLASH SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: const Interval(0, 0.6, curve: Curves.easeOut));
    _scaleAnim = Tween<double>(begin: 0.75, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: const Interval(0, 0.6, curve: Curves.elasticOut)),
    );
    _animCtrl.forward();
    _checkSession();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkSession() async {
    Map<String, dynamic>? user;
    try {
      final results = await Future.wait([
        Future.delayed(const Duration(milliseconds: 1200)),
        _api.checkOrRestoreSession().timeout(const Duration(milliseconds: 2000), onTimeout: () => null),
      ]);
      user = results[1] as Map<String, dynamic>?;
    } catch (_) {}

    if (!mounted) return;
    if (user != null) {
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (_, a, __) => FadeTransition(opacity: a, child: MainScreen(user: user!)),
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    } else {
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (_, a, __) => FadeTransition(opacity: a, child: const LoginScreen()),
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF00569E), Color(0xFF003D75), Color(0xFF002855)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: -60, right: -60,
                child: Container(
                  width: 220, height: 220,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.06),
                  ),
                ),
              ),
              Positioned(
                bottom: -80, left: -60,
                child: Container(
                  width: 280, height: 280,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.05),
                  ),
                ),
              ),
              Center(
                child: AnimatedBuilder(
                  animation: _animCtrl,
                  builder: (_, __) => FadeTransition(
                    opacity: _fadeAnim,
                    child: ScaleTransition(
                      scale: _scaleAnim,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 100, height: 100,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(28),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.2),
                                  blurRadius: 32,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                            child: const Center(
                              child: Text(
                                'BN',
                                style: TextStyle(
                                  fontSize: 36,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF00569E),
                                  letterSpacing: -1,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          const Text(
                            'MTR-Report',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Bank Nagari IT Support System',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 14,
                              letterSpacing: 0.2,
                            ),
                          ),
                          const SizedBox(height: 48),
                          SizedBox(
                            width: 28, height: 28,
                            child: CircularProgressIndicator(
                              color: Colors.white.withValues(alpha: 0.8),
                              strokeWidth: 2.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _api = ApiService();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  Future<void> _login() async {
    if (_usernameCtrl.text.trim().isEmpty || _passwordCtrl.text.isEmpty) {
      setState(() => _error = 'Username dan password wajib diisi.');
      return;
    }
    setState(() { _loading = true; _error = null; });
    final result = await _api.login(_usernameCtrl.text.trim(), _passwordCtrl.text);
    if (!mounted) return;
    setState(() => _loading = false);
    if (result['success'] == true) {
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (_, a, __) => FadeTransition(
            opacity: a,
            child: MainScreen(user: result['user'] as Map<String, dynamic>),
          ),
          transitionDuration: const Duration(milliseconds: 400),
        ),
      );
    } else {
      setState(() => _error = result['message'] as String? ?? 'Gagal login.');
    }
  }

  void _showServerConfigDialog() {
    final ipCtrl = TextEditingController(
      text: baseUrl.replaceAll('http://', '').replaceAll('/api', ''),
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.wifi_tethering_rounded, color: Color(0xFF00569E)),
            SizedBox(width: 8),
            Text('Pengaturan IP Server', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Masukkan IP Laptop / Mobile Hotspot tempat aplikasi Web Docker berjalan:',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ipCtrl,
              decoration: InputDecoration(
                labelText: 'Host IP & Port',
                hintText: '192.168.137.1:3000',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.dns_rounded),
              ),
            ),
            const SizedBox(height: 12),
            const Text('Pilihan Cepat:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.cell_wifi_rounded, size: 14),
                  label: const Text('Hotspot Laptop (192.168.137.1)', style: TextStyle(fontSize: 11)),
                  onPressed: () {
                    ipCtrl.text = '192.168.137.1:3000';
                  },
                ),
                ActionChip(
                  avatar: const Icon(Icons.computer_rounded, size: 14),
                  label: const Text('Localhost (10.0.2.2:3000)', style: TextStyle(fontSize: 11)),
                  onPressed: () {
                    ipCtrl.text = '10.0.2.2:3000';
                  },
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00569E), foregroundColor: Colors.white),
            onPressed: () async {
              if (ipCtrl.text.trim().isNotEmpty) {
                await setCustomServerIp(ipCtrl.text.trim());
                if (!mounted) return;
                setState(() {});
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('IP Server diperbarui ke: $baseUrl'), backgroundColor: Colors.green),
                  );
                }
              }
            },
            child: const Text('Simpan IP'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF00569E), Color(0xFF003D75)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 88, height: 88,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.2),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        'BN',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF00569E),
                          letterSpacing: -1,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'MTR-Report Mobile',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Bank Nagari IT Support System',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.75),
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 32),

                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 40,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Selamat Datang 👋',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Masuk menggunakan akun yang sama dengan versi web.',
                          style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        ),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _usernameCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Username',
                            prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
                          ),
                          textInputAction: TextInputAction.next,
                          autocorrect: false,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _passwordCtrl,
                          obscureText: _obscure,
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                size: 20,
                              ),
                              onPressed: () => setState(() => _obscure = !_obscure),
                            ),
                          ),
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _login(),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              border: Border.all(color: Colors.red.shade200),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline_rounded, size: 16, color: Colors.red.shade600),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _error!,
                                    style: TextStyle(fontSize: 12, color: Colors.red.shade700),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _loading ? null : _login,
                            child: _loading
                                ? const SizedBox(
                                    width: 22, height: 22,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  )
                                : const Text(
                                    'Masuk',
                                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        InkWell(
                          onTap: _showServerConfigDialog,
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.wifi_tethering_rounded, size: 16, color: Color(0xFF00569E)),
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    'IP Server: ${baseUrl.replaceAll('http://', '').replaceAll('/api', '')}',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF00569E)),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(Icons.edit_rounded, size: 14, color: Color(0xFF00569E)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Bank Pembangunan Daerah Sumatera Barat',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.5),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN — Navigasi Utama dengan Custom Floating Navigation Bar
// ─────────────────────────────────────────────────────────────────────────────

class MainScreen extends StatefulWidget {
  final Map<String, dynamic> user;
  const MainScreen({super.key, required this.user});
  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> with WidgetsBindingObserver {
  // DEFAULT INDEX = 2 (DASHBOARD DI TENGAH MENGAMBANG SEBAGAI DEFAULT SAAT APPS DIBUKA)
  int _idx = 2;
  late final PageController _pageController;

  late final List<Widget> _pages;
  late final String _role;
  late final String _nama;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ApiService().updateLastActive();
    _pageController = PageController(initialPage: 2);
    _role = widget.user['role'] as String? ?? 'user';
    _nama = widget.user['nama'] as String? ?? '';
    _pages = [
      const MonitoringPage(),                             // Index 0: Monitoring
      const InputTiketPage(),                            // Index 1: Input Tiket
      DashboardPage(nama: _nama, role: _role),               // Index 2: Dashboard (Center Default)
      const LogServerPage(),                             // Index 3: Log Server
      AkunPage(user: widget.user, onLogout: _logout),       // Index 4: Akun
    ];
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ApiService().updateLastActive();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _logout() async {
    await ApiService().logout();
    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  void _onTabTapped(int index) {
    setState(() => _idx = index);
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final navItems = [
      _NavItem(icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long_rounded, label: 'Monitoring'),
      _NavItem(icon: Icons.add_circle_outline_rounded, activeIcon: Icons.add_circle_rounded, label: 'Input Tiket'),
      _NavItem(icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard_rounded, label: 'Dashboard', isCenter: true),
      _NavItem(icon: Icons.door_sliding_outlined, activeIcon: Icons.door_sliding_rounded, label: 'Log Server'),
      _NavItem(icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: 'Akun'),
    ];

    return Scaffold(
      body: PageView(
        controller: _pageController,
        onPageChanged: (i) => setState(() => _idx = i),
        physics: const BouncingScrollPhysics(),
        children: _pages,
      ),
      bottomNavigationBar: Container(
        height: 72,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          boxShadow: [
            BoxShadow(color: Color(0x1F00569E), blurRadius: 20, offset: Offset(0, -4)),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(navItems.length, (i) {
              final isSelected = _idx == i;
              final item = navItems[i];
              final isCenter = item.isCenter;

              return Expanded(
                child: InkWell(
                  onTap: () => _onTabTapped(i),
                  splashColor: Colors.transparent,
                  highlightColor: Colors.transparent,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    curve: Curves.easeOutBack,
                    transform: Matrix4.translationValues(0, isSelected ? (isCenter ? -12 : -8) : 0, 0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: EdgeInsets.all(isCenter ? 10 : 7),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF00569E)
                                : (isCenter ? const Color(0xFFEFF6FF) : Colors.transparent),
                            shape: BoxShape.circle,
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFF00569E).withValues(alpha: 0.35),
                                      blurRadius: 10,
                                      offset: const Offset(0, 4),
                                    ),
                                  ]
                                : [],
                          ),
                          child: Icon(
                            isSelected ? item.activeIcon : item.icon,
                            color: isSelected
                                ? Colors.white
                                : (isCenter ? const Color(0xFF00569E) : const Color(0xFF94A3B8)),
                            size: isCenter ? 24 : 22,
                          ),
                        ),
                        const SizedBox(height: 2),
                        AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 200),
                          style: TextStyle(
                            fontSize: isSelected ? 11 : 10,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? const Color(0xFF00569E) : const Color(0xFF94A3B8),
                          ),
                          child: Text(item.label, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isCenter;
  _NavItem({required this.icon, required this.activeIcon, required this.label, this.isCenter = false});
}

// ─────────────────────────────────────────────────────────────────────────────
// AKUN PAGE — Tab Ke-5 untuk Profil, IP Server Config, dan Logout
// ─────────────────────────────────────────────────────────────────────────────

class AkunPage extends StatelessWidget {
  final Map<String, dynamic> user;
  final VoidCallback onLogout;

  const AkunPage({super.key, required this.user, required this.onLogout});

  void _showServerConfigDialogInAkun(BuildContext context) {
    final ctrl = TextEditingController(text: baseUrl.replaceAll('http://', '').replaceAll('/api', ''));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.wifi_tethering_rounded, color: Color(0xFF00569E)),
            SizedBox(width: 8),
            Text('Pengaturan IP Server', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Masukkan IP Komputer / Server tempat Next.js & Docker berjalan (mis. 192.168.43.150:3000 atau localhost:3000):',
              style: TextStyle(fontSize: 12, color: Colors.black87),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              decoration: const InputDecoration(
                labelText: 'IP & Port Server',
                hintText: '192.168.43.150:3000',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.dns_rounded),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00569E), foregroundColor: Colors.white),
            onPressed: () async {
              final newIp = ctrl.text.trim();
              if (newIp.isNotEmpty) {
                await setCustomServerIp(newIp);
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('IP Server berhasil diperbarui: $baseUrl'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              }
            },
            child: const Text('Simpan IP'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nama = user['nama'] as String? ?? 'User';
    final username = user['username'] as String? ?? '';
    final role = user['role'] as String? ?? 'user';
    final roleLabel = role == 'superadmin' ? 'Super Admin' : (role == 'supervisi' ? 'Supervisi' : 'IT Support Staff');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil & Akun Saya', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: const Color(0xFF00569E),
                    child: Text(
                      nama.isNotEmpty ? nama[0].toUpperCase() : 'U',
                      style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(nama, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: Color(0xFF1E293B))),
                        const SizedBox(height: 2),
                        Text('@$username', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFBFDBFE)),
                          ),
                          child: Text(
                            roleLabel,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF00569E)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text('PENGATURAN KONEKSI & AKUN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey, letterSpacing: 0.5)),
          const SizedBox(height: 8),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFEFF6FF), child: Icon(Icons.wifi_tethering_rounded, color: Color(0xFF00569E))),
              title: const Text('Pengaturan IP Server Host', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('IP Server: ${baseUrl.replaceAll('http://', '').replaceAll('/api', '')}', style: const TextStyle(fontSize: 12)),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => _showServerConfigDialogInAkun(context),
            ),
          ),
          const SizedBox(height: 8),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            child: const ListTile(
              leading: CircleAvatar(backgroundColor: Color(0xFFF1F5F9), child: Icon(Icons.info_outline_rounded, color: Color(0xFF475569))),
              title: Text('Versi Aplikasi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('MTR-Report Mobile v1.0 • Bank Nagari', style: TextStyle(fontSize: 12)),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade50,
                foregroundColor: Colors.red.shade700,
                elevation: 0,
                side: BorderSide(color: Colors.red.shade200),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    title: const Text('Konfirmasi Keluar', style: TextStyle(fontWeight: FontWeight.bold)),
                    content: const Text('Apakah Anda yakin ingin keluar dari aplikasi?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600, foregroundColor: Colors.white),
                        onPressed: () {
                          Navigator.pop(ctx);
                          onLogout();
                        },
                        child: const Text('Ya, Keluar'),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Keluar dari Akun', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PAGE — Tampilan Visualisasi Grafik & Ringkasan Perangkat
// ─────────────────────────────────────────────────────────────────────────────

class DashboardPage extends StatefulWidget {
  final String nama;
  final String role;
  const DashboardPage({super.key, required this.nama, required this.role});
  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final _api = ApiService();
  Map<String, dynamic> _data = {};
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    final dash = await _api.getDashboard();
    if (mounted) {
      setState(() {
        _data = dash;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Visualisasi', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetch,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Hero Banner
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF00569E), Color(0xFF0077CC), Color(0xFF003868)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: const [
                        BoxShadow(color: Color(0x3300569E), blurRadius: 20, offset: Offset(0, 8)),
                      ],
                    ),
                    child: Stack(
                      children: [
                        Positioned(
                          top: -20, right: -20,
                          child: Container(
                            width: 100, height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.08),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(14),
                                    ),
                                    child: const Icon(Icons.waving_hand_rounded, color: Colors.white, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Halo, ${widget.nama}!',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      Text(
                                        'ROLE: ${widget.role.toUpperCase()}',
                                        style: TextStyle(
                                          color: Colors.white.withValues(alpha: 0.75),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Text(
                                  '📊 Nagari Workstation Monitoring System',
                                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Ringkasan Operasional',
                    style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 12),
                  Builder(builder: (_) {
                    final counts = _data['counts'] as Map<String, dynamic>? ?? {};
                    final total = counts['total'] ?? _data['totalTickets'] ?? 0;
                    final proses = counts['proses'] ?? _data['inProgress'] ?? 0;
                    final selesai = counts['selesai'] ?? _data['done'] ?? 0;

                    final totalNum = (total as num).toDouble();
                    final prosesPct = totalNum > 0 ? ((proses as num) / totalNum * 100).toStringAsFixed(0) : '0';
                    final selesaiPct = totalNum > 0 ? ((selesai as num) / totalNum * 100).toStringAsFixed(0) : '0';

                    final avgDur = _data['avgDurationDays'] ?? 0;
                    final branchList = (_data['branchStats'] as List?) ?? [];
                    final brandList = (_data['brandStats'] as List?) ?? [];
                    final dailyList = (_data['dailyTrend'] as List?) ?? [];

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Expanded(child: _metricCard('Total Tiket', '$total', const Color(0xFF00569E), const Color(0xFFEFF6FF), Icons.assignment_outlined)),
                          const SizedBox(width: 12),
                          Expanded(child: _metricCard('Dalam Proses', '$proses', const Color(0xFFD97706), const Color(0xFFFFFBEB), Icons.autorenew_rounded)),
                        ]),
                        const SizedBox(height: 12),
                        Row(children: [
                          Expanded(child: _metricCard('Selesai', '$selesai', const Color(0xFF059669), const Color(0xFFECFDF5), Icons.check_circle_outline)),
                          const SizedBox(width: 12),
                          Expanded(child: _metricCard('Rata-rata Penyelesaian', '$avgDur Hari', const Color(0xFF0284C7), const Color(0xFFE0F2FE), Icons.timer_outlined)),
                        ]),
                        const SizedBox(height: 20),

                        // Visual Progress Breakdown Card
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 2)),
                            ],
                          ),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.pie_chart_rounded, size: 18, color: Color(0xFF00569E)),
                                  SizedBox(width: 8),
                                  Text(
                                    'Visual Status Penanganan Tiket',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),

                              // Progress Bar Multi-Segment
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  height: 14,
                                  color: const Color(0xFFF1F5F9),
                                  child: Row(
                                    children: [
                                      if (proses > 0)
                                        Expanded(
                                          flex: (proses as int),
                                          child: Container(color: const Color(0xFFF59E0B)),
                                        ),
                                      if (selesai > 0)
                                        Expanded(
                                          flex: (selesai as int),
                                          child: Container(color: const Color(0xFF10B981)),
                                        ),
                                      if (totalNum == 0)
                                        Expanded(child: Container(color: Colors.grey.shade300)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),

                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceAround,
                                children: [
                                  Row(
                                    children: [
                                      Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle)),
                                      const SizedBox(width: 6),
                                      Text('Proses ($prosesPct%)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      Container(width: 10, height: 10, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle)),
                                      const SizedBox(width: 6),
                                      Text('Selesai ($selesaiPct%)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── 1. LINE CHART: Tren Tiket Harian (30 Hari) ──
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 2)),
                            ],
                          ),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.show_chart_rounded, size: 18, color: Color(0xFF00569E)),
                                  SizedBox(width: 8),
                                  Text(
                                    'Tren Tiket Harian (30 Hari Terakhir)',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              if (dailyList.isEmpty)
                                const SizedBox(height: 100, child: Center(child: Text('Belum ada tren data.', style: TextStyle(color: Colors.grey))))
                              else
                                SizedBox(
                                  height: 120,
                                  width: double.infinity,
                                  child: CustomPaint(
                                    painter: _LineChartPainter(dailyList),
                                  ),
                                ),
                              const SizedBox(height: 8),
                              const Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('30 Hari Lalu', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                  Text('Hari Ini', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF00569E))),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── 2. DONUT / PIE CHART: Cabang Paling Sering Rusak ──
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 2)),
                            ],
                          ),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.pie_chart_outline_rounded, size: 18, color: Color(0xFF059669)),
                                  SizedBox(width: 8),
                                  Text(
                                    'Cabang Paling Sering Rusak',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              if (branchList.isEmpty)
                                const Text('Belum ada data cabang.', style: TextStyle(fontSize: 12, color: Colors.grey))
                              else ...[
                                Row(
                                  children: [
                                    // Visual Donut Painter
                                    SizedBox(
                                      width: 90,
                                      height: 90,
                                      child: CustomPaint(
                                        painter: _DonutChartPainter(branchList),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Column(
                                        children: branchList.take(4).toList().asMap().entries.map((entry) {
                                          final idx = entry.key;
                                          final b = entry.value;
                                          final name = (b['cabang'] ?? b['name'] ?? '-').toString();
                                          final count = (b['count'] as num?)?.toInt() ?? 0;
                                          final color = _DonutChartPainter.chartColors[idx % _DonutChartPainter.chartColors.length];

                                          return Padding(
                                            padding: const EdgeInsets.only(bottom: 6),
                                            child: Row(
                                              children: [
                                                Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                                                const SizedBox(width: 6),
                                                Expanded(child: Text(name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
                                                Text('$count Tiket', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                              ],
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),

                        // ── 3. BAR CHART: Perbandingan Merek Komputer & EDC ──
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(color: Color(0x0A000000), blurRadius: 10, offset: Offset(0, 2)),
                            ],
                          ),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.devices_rounded, size: 18, color: Color(0xFFD97706)),
                                  SizedBox(width: 8),
                                  Text(
                                    'Perbandingan Merek Komputer & EDC',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),
                              if (brandList.isEmpty)
                                const Text('Belum ada data merek.', style: TextStyle(fontSize: 12, color: Colors.grey))
                              else
                                ...brandList.take(8).map((b) {
                                  final brand = (b['merek'] ?? b['brand'] ?? '-').toString();
                                  final count = (b['count'] as num?)?.toInt() ?? 0;
                                  final isEdc = brand.contains('EDC');
                                  final maxCount = (brandList.first['count'] as num?)?.toDouble() ?? 1.0;
                                  final barValue = maxCount > 0 ? (count / maxCount) : 0.0;
                                  final barColor = isEdc ? const Color(0xFFD97706) : const Color(0xFF00569E);

                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Row(
                                              children: [
                                                Icon(isEdc ? Icons.credit_card_rounded : Icons.desktop_windows_rounded, size: 14, color: barColor),
                                                const SizedBox(width: 6),
                                                Text(brand, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isEdc ? const Color(0xFFD97706) : const Color(0xFF1E293B))),
                                              ],
                                            ),
                                            Text('$count Tiket', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey)),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(4),
                                          child: LinearProgressIndicator(
                                            value: barValue,
                                            minHeight: 8,
                                            backgroundColor: const Color(0xFFF1F5F9),
                                            color: barColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
                            ],
                          ),
                        ),
                      ],
                    );
                  }),
                ],
              ),
            ),
    );
  }

  Widget _metricCard(String label, String value, Color color, Color bgColor, IconData icon) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 38, height: 38,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              Text(
                value,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: color,
                  letterSpacing: -1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF64748B),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TIKET PAGE — Komputer vs EDC + Merek Selection Dropdown
// ─────────────────────────────────────────────────────────────────────────────

const _daftarCabangDefault = [
  "PAYAKUMBUH", "BUKITTINGGI", "BATUSANGKAR", "SOLOK", "PARIAMAN",
  "PAINAN", "SIJUNJUNG", "LUBUK SIKAPING", "PASAR RAYA", "SITEBA",
  "SAWAHLUNTO", "SIMPANG EMPAT", "MUARA LABUH", "LUBUK GADANG", "KOTO BARU",
  "PULAU PUNJUNG", "UJUNG GADING", "LUBUK BASUNG", "LUBUK ALUNG", "TAPAN",
  "LINTAU", "CABANG UTAMA", "MENTAWAI", "TAPUS", "ALAHAN PANJANG",
  "JAKARTA", "PEKANBARU", "BANDUNG", "SYARIAH PADANG", "SYARIAH PAYAKUMBUH",
  "SYARIAH BUKITTINGGI", "SYARIAH BATUSANGKAR", "PADANG PANJANG",
];

const _merekKomputerList = ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu", "Lainnya (Ketik Manual)"];

class InputTiketPage extends StatefulWidget {
  const InputTiketPage({super.key});
  @override
  State<InputTiketPage> createState() => _InputTiketPageState();
}

class _InputTiketPageState extends State<InputTiketPage> {
  final _api = ApiService();

  // ── Perangkat ──
  String _jenisPerangkat = 'komputer'; // 'komputer' | 'edc'
  String _tipeKomputer = 'aio'; // 'aio' | 'desktop' | 'laptop' | 'mini_pc'
  String _merekPilihan = '';
  final _merekCustomCtrl = TextEditingController();

  // ── Cabang & Field ──
  List<String> _daftarCabang = [];
  String _wsCabang = '';
  String _lastNoSurat = '';
  String _lastWsCabang = '';

  final _tglMasukCtrl = TextEditingController();
  final _noSuratCtrl = TextEditingController();
  final _capemCtrl = TextEditingController();
  final _kelengkapanCtrl = TextEditingController();
  final _snCtrl = TextEditingController();
  final _kerusakanCtrl = TextEditingController();

  // ── Contact Person ──
  String _cpTipe = 'pic';
  final _cpNamaCtrl = TextEditingController();
  final _cpTelpCtrl = TextEditingController();
  final _kegiatanCtrl = TextEditingController();

  bool _submitting = false;
  String? _error;
  String? _successNoTiket;

  DateTime? _selectedDateTime;

  @override
  void initState() {
    super.initState();
    _loadCabang();
    _loadLastNoSurat();
    _selectedDateTime = DateTime.now();
    _tglMasukCtrl.text = DateFormat("yyyy-MM-ddTHH:mm").format(_selectedDateTime!);
  }

  Future<void> _loadCabang() async {
    final list = await _api.getCabangList();
    setState(() {
      _daftarCabang = list.isNotEmpty ? list : _daftarCabangDefault;
    });
  }

  Future<void> _loadLastNoSurat() async {
    final data = await _api.getLastNoSurat();
    if (mounted) {
      setState(() {
        _lastNoSurat = data['noSurat'] ?? '';
        _lastWsCabang = data['cabang'] ?? '';
        if (_noSuratCtrl.text.isEmpty && _lastNoSurat.isNotEmpty) {
          _noSuratCtrl.text = _lastNoSurat;
        }
        if (_wsCabang.isEmpty && _lastWsCabang.isNotEmpty) {
          _wsCabang = _lastWsCabang;
        }
      });
    }
  }

  void _resetForm({bool keepLastNoSurat = true}) {
    _jenisPerangkat = 'komputer';
    _tipeKomputer = 'aio';
    _merekPilihan = '';
    _merekCustomCtrl.clear();
    if (!keepLastNoSurat) {
      _wsCabang = '';
      _noSuratCtrl.clear();
    } else {
      _noSuratCtrl.text = _lastNoSurat;
      if (_lastWsCabang.isNotEmpty) _wsCabang = _lastWsCabang;
    }
    _selectedDateTime = DateTime.now();
    _tglMasukCtrl.text = DateFormat("yyyy-MM-ddTHH:mm").format(_selectedDateTime!);
    _capemCtrl.clear();
    _kelengkapanCtrl.clear();
    _snCtrl.clear();
    _kerusakanCtrl.clear();
    _cpTipe = 'pic';
    _cpNamaCtrl.clear();
    _cpTelpCtrl.clear();
    _kegiatanCtrl.clear();
    _error = null;
    setState(() {});
  }

  String _getFormattedMerek() {
    if (_jenisPerangkat == 'edc') {
      return '[EDC]';
    }
    final brand = _merekPilihan == 'Lainnya (Ketik Manual)' ? _merekCustomCtrl.text.trim() : _merekPilihan.trim();
    final tipeLabel = _tipeKomputer == 'aio'
        ? 'AIO'
        : _tipeKomputer == 'desktop'
        ? 'Desktop'
        : _tipeKomputer == 'laptop'
        ? 'Laptop'
        : 'Mini PC';
    return brand.isNotEmpty ? '[Komputer - $tipeLabel] $brand' : '[Komputer - $tipeLabel]';
  }

  Future<void> _submit() async {
    _error = null;
    if (_wsCabang.isEmpty) { setState(() => _error = 'Cabang wajib dipilih.'); return; }
    if (_tglMasukCtrl.text.isEmpty) { setState(() => _error = 'Tanggal Masuk wajib diisi.'); return; }
    if (_noSuratCtrl.text.trim().isEmpty) { setState(() => _error = 'Nomor Surat wajib diisi.'); return; }
    if (_jenisPerangkat == 'komputer') {
      if (_merekPilihan.isEmpty) { setState(() => _error = 'Merek komputer wajib dipilih.'); return; }
      if (_merekPilihan == 'Lainnya (Ketik Manual)' && _merekCustomCtrl.text.trim().isEmpty) {
        setState(() => _error = 'Nama merek manual wajib diisi.'); return;
      }
    }
    if (_kelengkapanCtrl.text.trim().isEmpty) { setState(() => _error = 'Kelengkapan wajib diisi.'); return; }
    if (_snCtrl.text.trim().isEmpty) { setState(() => _error = 'SN Komputer / EDC wajib diisi.'); return; }
    if (_kerusakanCtrl.text.trim().isEmpty) { setState(() => _error = 'Kerusakan wajib diisi.'); return; }
    if (_cpTipe == 'pic' && (_cpNamaCtrl.text.trim().isEmpty || _cpTelpCtrl.text.trim().isEmpty)) {
      setState(() => _error = 'No PIC wajib mengisi nama dan nomor telepon.'); return;
    }
    if (_cpTipe == 'wag' && _cpNamaCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Nama WAG wajib diisi.'); return;
    }
    if (_kegiatanCtrl.text.trim().isEmpty) { setState(() => _error = 'Kegiatan penanganan pertama wajib diisi.'); return; }

    setState(() => _submitting = true);
    final submittedNoSurat = _noSuratCtrl.text.trim();
    final submittedCabang = _wsCabang;

    final result = await _api.createTicket({
      'kategori': 'workstation',
      'wsCabang': submittedCabang,
      'wsTanggalMasuk': _tglMasukCtrl.text,
      'wsNoSurat': submittedNoSurat,
      'wsMerekKomputer': _getFormattedMerek(),
      'wsCapem': _capemCtrl.text.trim().isEmpty ? null : _capemCtrl.text.trim(),
      'wsKelengkapan': _kelengkapanCtrl.text.trim(),
      'wsSnKomputer': _snCtrl.text.trim(),
      'wsKerusakan': _kerusakanCtrl.text.trim(),
      'cpTipe': _cpTipe,
      'cpNama': _cpNamaCtrl.text.trim(),
      'cpTelp': _cpTipe == 'pic' ? _cpTelpCtrl.text.trim() : '',
      'kegiatan': _kegiatanCtrl.text.trim(),
    });
    if (!mounted) return;
    setState(() => _submitting = false);
    if (result['success'] == true) {
      await _api.saveLastNoSurat(submittedNoSurat, submittedCabang);
      _lastNoSurat = submittedNoSurat;
      _lastWsCabang = submittedCabang;
      setState(() => _successNoTiket = result['noTiket'] as String?);
      _resetForm(keepLastNoSurat: true);
    } else {
      setState(() => _error = result['message'] as String? ?? 'Gagal membuat tiket.');
    }
  }

  void _scanOcr(String label, TextEditingController ctrl) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OcrCameraScannerWidget(
          targetFieldName: label,
          onTextScanned: (text) {
            setState(() => ctrl.text = text);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('$label berhasil disalin: $text'),
                backgroundColor: const Color(0xFF00569E),
                duration: const Duration(seconds: 2),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _pickDateTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDateTime ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2099),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_selectedDateTime ?? DateTime.now()),
    );
    if (time == null) return;
    final dt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    setState(() {
      _selectedDateTime = dt;
      _tglMasukCtrl.text = DateFormat("yyyy-MM-ddTHH:mm").format(dt);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Input Tiket Workstation')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionHeader('1. Data Perangkat Workstation', 'Pilih jenis perangkat lalu isi detail kerusakan.'),

            // ── PILIH JENIS PERANGKAT ──
            _label('Jenis Perangkat', required: true),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() {
                      _jenisPerangkat = 'komputer';
                      _merekPilihan = '';
                    }),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _jenisPerangkat == 'komputer' ? const Color(0xFF00569E).withValues(alpha: 0.1) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _jenisPerangkat == 'komputer' ? const Color(0xFF00569E) : Colors.grey.shade300,
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.desktop_windows_rounded, color: _jenisPerangkat == 'komputer' ? const Color(0xFF00569E) : Colors.grey),
                          const SizedBox(width: 8),
                          const Text('Komputer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() {
                      _jenisPerangkat = 'edc';
                      _merekPilihan = '';
                    }),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _jenisPerangkat == 'edc' ? const Color(0xFF00569E).withValues(alpha: 0.1) : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _jenisPerangkat == 'edc' ? const Color(0xFF00569E) : Colors.grey.shade300,
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.credit_card_rounded, color: _jenisPerangkat == 'edc' ? const Color(0xFF00569E) : Colors.grey),
                          const SizedBox(width: 8),
                          const Text('Mesin EDC', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Tipe Komputer (jika komputer)
            if (_jenisPerangkat == 'komputer') ...[
              _label('Tipe Komputer', required: true),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _tipeChip('aio', 'AIO (All-in-One)', Icons.tv_rounded),
                  _tipeChip('desktop', 'Desktop PC', Icons.computer_rounded),
                  _tipeChip('laptop', 'Laptop', Icons.laptop_mac_rounded),
                  _tipeChip('mini_pc', 'Mini PC', Icons.dns_rounded),
                ],
              ),
              const SizedBox(height: 14),
            ],

            // Cabang
            _label('Cabang', required: true),
            DropdownButtonFormField<String>(
              value: _wsCabang.isEmpty ? null : _wsCabang, // ignore: deprecated_member_use
              decoration: const InputDecoration(hintText: '— Pilih Cabang —'),
              items: _daftarCabang.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 14)))).toList(),
              onChanged: (v) => setState(() => _wsCabang = v ?? ''),
            ),
            const SizedBox(height: 14),

            // Tanggal Masuk
            _label('Tanggal Masuk', required: true),
            GestureDetector(
              onTap: _pickDateTime,
              child: AbsorbPointer(
                child: TextFormField(
                  controller: _tglMasukCtrl,
                  decoration: const InputDecoration(
                    hintText: 'Pilih tanggal & jam',
                    suffixIcon: Icon(Icons.calendar_today, size: 18),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),

            // No Surat — OCR & Auto-fill History
            _label('Nomor Surat', required: true),
            _ocrInputRow(_noSuratCtrl, 'cth: SR/00/XX/XXX/00-2026', 'No Surat Cabang'),
            if (_lastNoSurat.isNotEmpty) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.history_rounded, size: 14, color: Color(0xFF00569E)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Surat Terakhir: $_lastNoSurat',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (_noSuratCtrl.text != _lastNoSurat)
                      InkWell(
                        onTap: () {
                          setState(() {
                            _noSuratCtrl.text = _lastNoSurat;
                            if (_lastWsCabang.isNotEmpty) _wsCabang = _lastWsCabang;
                          });
                        },
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          child: Text('Gunakan', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF00569E))),
                        ),
                      ),
                    InkWell(
                      onTap: () {
                        setState(() {
                          _noSuratCtrl.clear();
                        });
                      },
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        child: Text('Kosongkan', style: TextStyle(fontSize: 11, color: Colors.red)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),

            // Merek Perangkat (Hanya jika Komputer)
            if (_jenisPerangkat == 'komputer') ...[
              _label('Merek Komputer', required: true),
              DropdownButtonFormField<String>(
                value: _merekPilihan.isEmpty ? null : _merekPilihan, // ignore: deprecated_member_use
                decoration: const InputDecoration(hintText: '— Pilih Merek —'),
                items: _merekKomputerList.map((m) => DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 14)))).toList(),
                onChanged: (v) => setState(() => _merekPilihan = v ?? ''),
              ),
              if (_merekPilihan == 'Lainnya (Ketik Manual)') ...[
                const SizedBox(height: 8),
                TextFormField(
                  controller: _merekCustomCtrl,
                  decoration: const InputDecoration(hintText: 'Tuliskan merek perangkat...'),
                ),
              ],
              const SizedBox(height: 14),
            ],

            // Capem & Kelengkapan
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _label('Capem (opsional)'),
                  TextFormField(controller: _capemCtrl, decoration: const InputDecoration(hintText: 'cth: UNAND')),
                ])),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _label('Kelengkapan', required: true),
                  TextFormField(controller: _kelengkapanCtrl, decoration: const InputDecoration(hintText: 'Adaptor, kabel...')),
                ])),
              ],
            ),
            const SizedBox(height: 14),

            // SN Perangkat — OCR
            _label('SN ${_jenisPerangkat == 'komputer' ? 'Komputer' : 'EDC'}', required: true),
            _ocrInputRow(_snCtrl, 'Nomor seri mesin / perangkat...', 'SN Perangkat'),
            const SizedBox(height: 14),

            // Kerusakan
            _label('Kerusakan', required: true),
            TextFormField(
              controller: _kerusakanCtrl,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'Jelaskan detail kerusakan...'),
            ),
            const SizedBox(height: 22),

            // ── Seksi 2: Informasi Kontak ───────────────
            _sectionHeader('2. Informasi Kontak & Penanganan', 'Detail contact person pelapor dan tindakan pertama.'),

            _label('Contact Person', required: true),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _cpTipe = 'pic'),
                    borderRadius: BorderRadius.circular(8),
                    child: Row(
                      children: [
                        Checkbox(
                          value: _cpTipe == 'pic',
                          onChanged: (_) => setState(() => _cpTipe = 'pic'),
                          activeColor: const Color(0xFF00569E),
                          shape: const CircleBorder(),
                        ),
                        const Text('No PIC', style: TextStyle(fontSize: 14)),
                      ],
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _cpTipe = 'wag'),
                    borderRadius: BorderRadius.circular(8),
                    child: Row(
                      children: [
                        Checkbox(
                          value: _cpTipe == 'wag',
                          onChanged: (_) => setState(() => _cpTipe = 'wag'),
                          activeColor: const Color(0xFF00569E),
                          shape: const CircleBorder(),
                        ),
                        const Text('WAG', style: TextStyle(fontSize: 14)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (_cpTipe == 'pic') ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _label('Nama PIC', required: true),
                    TextFormField(controller: _cpNamaCtrl, decoration: const InputDecoration(hintText: 'Nama PIC')),
                  ])),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _label('Nomor Telepon', required: true),
                    TextFormField(controller: _cpTelpCtrl, decoration: const InputDecoration(hintText: '08xxxxxxxxxx'), keyboardType: TextInputType.phone),
                  ])),
                ],
              ),
            ] else ...[
              _label('Nama WAG', required: true),
              TextFormField(controller: _cpNamaCtrl, decoration: const InputDecoration(hintText: 'cth. WAG IT Support')),
            ],
            const SizedBox(height: 14),

            _label('Kegiatan Penanganan Pertama', required: true),
            TextFormField(
              controller: _kegiatanCtrl,
              maxLines: 3,
              decoration: const InputDecoration(hintText: 'Pendataan awal & penanganan pertama...'),
            ),

            if (_error != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.red.shade50, border: Border.all(color: Colors.red.shade200), borderRadius: BorderRadius.circular(8)),
                child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ),
            ],

            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _resetForm,
                    child: const Text('Reset'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Buka Tiket Workstation', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
      bottomSheet: _successNoTiket != null
          ? Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle_rounded, color: Colors.green, size: 48),
                  const SizedBox(height: 8),
                  const Text('Tiket Berhasil Dibuka!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 4),
                  const Text('Nomor Tiket:', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  Text(_successNoTiket!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.green, fontFamily: 'monospace')),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => setState(() => _successNoTiket = null),
                      child: const Text('Tutup & Buat Tiket Lain'),
                    ),
                  ),
                ],
              ),
            )
          : null,
    );
  }

  Widget _tipeChip(String val, String label, IconData icon) {
    final isSelected = _tipeKomputer == val;
    return ChoiceChip(
      selected: isSelected,
      onSelected: (_) => setState(() => _tipeKomputer = val),
      avatar: Icon(icon, size: 16, color: isSelected ? Colors.white : const Color(0xFF00569E)),
      label: Text(label, style: TextStyle(fontSize: 12, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selectedColor: const Color(0xFF00569E),
      backgroundColor: Colors.white,
      labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black87),
    );
  }

  Widget _ocrInputRow(TextEditingController ctrl, String hint, String fieldName) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: TextFormField(
            controller: ctrl,
            decoration: InputDecoration(hintText: hint),
          ),
        ),
        const SizedBox(width: 8),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF00569E),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 13),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          onPressed: () => _scanOcr(fieldName, ctrl),
          icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
          label: const Text('Scan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG SERVER PAGE
// ─────────────────────────────────────────────────────────────────────────────

const _picList = [
  "RUDI HARNO FAZLUR RAHMAN", "BERTO LAILATUL", "DIMAS TEGUH PRIBADI",
  "TIO RAHMAYUDA", "MUHAMMAD RYAN TIRTA ATMAJA", "HENDRIANTO",
  "AFRINALDI", "RIAN ISLAMI PUTRA", "KURNIA FAJRI", "IBNU SAUKI", "RIDHO M R",
];

class LogServerPage extends StatefulWidget {
  const LogServerPage({super.key});
  @override
  State<LogServerPage> createState() => _LogServerPageState();
}

class _LogServerPageState extends State<LogServerPage> {
  final _api = ApiService();
  List<dynamic> _logs = [];
  bool _loading = true;
  bool _showForm = false;

  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _activeWaktuFilter = 'harian'; // 'harian', 'mingguan', 'bulanan', 'semua'
  String _activeStatusFilter = 'semua'; // 'semua', 'di_dalam', 'sudah_keluar'

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchLogs() async {
    setState(() => _loading = true);
    final logs = await _api.getServerLogs(filter: _activeWaktuFilter);
    if (mounted) setState(() { _logs = logs; _loading = false; });
  }

  List<dynamic> get _filteredLogs {
    return _logs.where((l) {
      final logMap = l as Map<String, dynamic>;

      // Filter Pencarian Teks
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final nama = (logMap['namaOrang'] ?? '').toString().toLowerCase();
        final instansi = (logMap['instansi'] ?? '').toString().toLowerCase();
        final pic = (logMap['namaPic'] ?? '').toString().toLowerCase();
        final keperluan = (logMap['keperluan'] ?? '').toString().toLowerCase();
        if (!nama.contains(q) && !instansi.contains(q) && !pic.contains(q) && !keperluan.contains(q)) {
          return false;
        }
      }

      // Filter Status Keberadaan
      if (_activeStatusFilter == 'di_dalam') {
        if (logMap['jamKeluar'] != null) return false;
      } else if (_activeStatusFilter == 'sudah_keluar') {
        if (logMap['jamKeluar'] == null) return false;
      }

      return true;
    }).toList();
  }

  void _resetFilter() {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _activeWaktuFilter = 'harian';
      _activeStatusFilter = 'semua';
    });
    _fetchLogs();
  }

  Widget _waktuChip(String label, String key) {
    final active = _activeWaktuFilter == key;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: active ? FontWeight.bold : FontWeight.normal, color: active ? Colors.white : const Color(0xFF475569))),
      selected: active,
      selectedColor: const Color(0xFF00569E),
      backgroundColor: const Color(0xFFF1F5F9),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      onSelected: (_) {
        setState(() => _activeWaktuFilter = key);
        _fetchLogs();
      },
    );
  }

  Widget _statusChip(String label, String key, IconData icon) {
    final active = _activeStatusFilter == key;
    return ChoiceChip(
      avatar: Icon(icon, size: 14, color: active ? Colors.white : const Color(0xFF64748B)),
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: active ? FontWeight.bold : FontWeight.normal, color: active ? Colors.white : const Color(0xFF475569))),
      selected: active,
      selectedColor: key == 'di_dalam' ? const Color(0xFFD97706) : (key == 'sudah_keluar' ? const Color(0xFF059669) : const Color(0xFF00569E)),
      backgroundColor: const Color(0xFFF1F5F9),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      onSelected: (_) => setState(() => _activeStatusFilter = key),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredLogs;
    final isFilterModified = _searchQuery.isNotEmpty || _activeWaktuFilter != 'harian' || _activeStatusFilter != 'semua';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Log Server Room', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (isFilterModified)
            TextButton.icon(
              onPressed: _resetFilter,
              icon: const Icon(Icons.filter_alt_off_rounded, size: 16, color: Colors.white),
              label: const Text('Reset', style: TextStyle(color: Colors.white, fontSize: 12)),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => setState(() => _showForm = !_showForm),
        backgroundColor: const Color(0xFF00569E),
        foregroundColor: Colors.white,
        elevation: 4,
        icon: Icon(_showForm ? Icons.close_rounded : Icons.add_rounded),
        label: Text(_showForm ? 'Tutup Form' : 'Tambah Log Server', style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchLogs,
        child: ListView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            if (_showForm) ...[
              TambahLogForm(
                onSuccess: (log) {
                  setState(() {
                    _logs.insert(0, log);
                    _showForm = false;
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Log akses berhasil ditambahkan!'), backgroundColor: Colors.green),
                  );
                },
                onCancel: () => setState(() => _showForm = false),
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
            ],

            // Panel Pencarian & Filter Log Server
            Card(
              margin: const EdgeInsets.only(bottom: 16),
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE2E8F0))),
              color: Colors.white,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Search Bar
                    TextField(
                      controller: _searchController,
                      onChanged: (val) => setState(() => _searchQuery = val.trim()),
                      decoration: InputDecoration(
                        hintText: 'Cari nama pengunjung, instansi, PIC...',
                        prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 16),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Filter Waktu
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          const Text('Waktu: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                          _waktuChip('Hari Ini', 'harian'),
                          const SizedBox(width: 4),
                          _waktuChip('Minggu Ini', 'mingguan'),
                          const SizedBox(width: 4),
                          _waktuChip('Bulan Ini', 'bulanan'),
                          const SizedBox(width: 4),
                          _waktuChip('Semua', 'semua'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),

                    // Filter Status Keberadaan
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          const Text('Status: ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                          _statusChip('Semua Status', 'semua', Icons.format_list_bulleted_rounded),
                          const SizedBox(width: 4),
                          _statusChip('Masih di Dalam', 'di_dalam', Icons.meeting_room_rounded),
                          const SizedBox(width: 4),
                          _statusChip('Sudah Keluar', 'sudah_keluar', Icons.check_circle_rounded),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _activeWaktuFilter == 'harian'
                      ? 'Riwayat Akses Hari Ini'
                      : (_activeWaktuFilter == 'mingguan'
                          ? 'Riwayat Akses Minggu Ini'
                          : (_activeWaktuFilter == 'bulanan' ? 'Riwayat Akses Bulan Ini' : 'Semua Riwayat Akses')),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                ),
                Text('(${filtered.length} log)', style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 10),

            if (_loading)
              const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
            else if (filtered.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      const Icon(Icons.search_off_rounded, size: 40, color: Colors.grey),
                      const SizedBox(height: 8),
                      const Text('Tidak ada log akses sesuai filter.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                      if (isFilterModified) ...[
                        const SizedBox(height: 8),
                        TextButton(onPressed: _resetFilter, child: const Text('Reset Filter')),
                      ],
                    ],
                  ),
                ),
              )
            else
              ...filtered.map((log) => _logCard(log)),
            const SizedBox(height: 70), // Spacing agar tidak tertutup FAB
          ],
        ),
      ),
    );
  }

  Uint8List? _safeBase64(String raw) {
    try {
      final target = raw.contains('base64,') ? raw.split('base64,').last : raw.split(',').last;
      final clean = target.replaceAll(RegExp(r'\s+'), '').trim();
      return base64Decode(clean);
    } catch (_) {
      return null;
    }
  }

  void _showFotoDialog(String url, String nama) {
    final isBase64 = url.startsWith('data:image');
    final isSvg = url.startsWith('data:image/svg') || url.contains('svg+xml');
    final bytes = isBase64 ? _safeBase64(url) : null;

    showDialog(
      context: context,
      builder: (_) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppBar(
              title: Text('Foto: $nama', style: const TextStyle(fontSize: 14)),
              automaticallyImplyLeading: false,
              actions: [IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context))],
            ),
            Container(
              constraints: const BoxConstraints(maxHeight: 400),
              padding: const EdgeInsets.all(16),
              child: isSvg
                  ? Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: const BoxDecoration(color: Color(0xFFEFF6FF), shape: BoxShape.circle),
                          child: const Icon(Icons.person_rounded, size: 48, color: Color(0xFF00569E)),
                        ),
                        const SizedBox(height: 12),
                        const Text('Foto Pengunjung Terekam', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                        const SizedBox(height: 4),
                        Text(nama, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      ],
                    )
                  : (isBase64
                      ? (bytes != null
                          ? Image.memory(bytes, fit: BoxFit.contain, errorBuilder: (_, __, ___) => const Text('Format foto tidak didukung.', style: TextStyle(color: Colors.grey)))
                          : const Padding(padding: EdgeInsets.all(32), child: Text('Format foto tidak valid.', style: TextStyle(color: Colors.grey))))
                      : Image.network(
                          url.startsWith('/') ? '${baseUrl.replaceAll(RegExp(r'/api/?$'), '')}$url' : url,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 80,
                                height: 80,
                                decoration: const BoxDecoration(color: Color(0xFFEFF6FF), shape: BoxShape.circle),
                                child: const Icon(Icons.person_rounded, size: 48, color: Color(0xFF00569E)),
                              ),
                              const SizedBox(height: 12),
                              const Text('Bukti Foto Pengunjung Terekam', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                              const SizedBox(height: 4),
                              Text(nama, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        )),
            ),
          ],
        ),
      ),
    );
  }

  Widget _logCard(Map<String, dynamic> log) {
    final isExited = log['waktuKeluar'] != null;
    final fotoUrl = log['fotoUrl'] as String?;
    final isBase64 = fotoUrl != null && fotoUrl.startsWith('data:image');
    final isSvg = fotoUrl != null && (fotoUrl.startsWith('data:image/svg') || fotoUrl.contains('svg+xml'));
    final bytes = isBase64 && !isSvg ? _safeBase64(fotoUrl) : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(child: Text(log['namaOrang'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isExited ? Colors.green.shade50 : Colors.orange.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isExited ? Colors.green.shade200 : Colors.orange.shade200),
                  ),
                  child: Text(
                    isExited ? 'SUDAH KELUAR' : 'MASIH DI DALAM',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isExited ? Colors.green.shade700 : Colors.orange.shade700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text('Instansi: ${log['instansi'] ?? '-'}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
            Text('PIC: ${log['namaPic'] ?? '-'}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
            Text('Keperluan: ${log['keperluan'] ?? '-'}', style: const TextStyle(fontSize: 13)),

            if (fotoUrl != null && fotoUrl.isNotEmpty) ...[
              const SizedBox(height: 10),
              InkWell(
                onTap: () {
                  final fullUrl = fotoUrl.startsWith('/') ? '${baseUrl.replaceAll(RegExp(r'/api/?$'), '')}$fotoUrl' : fotoUrl;
                  _showFotoDialog(fullUrl, log['namaOrang'] ?? '');
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: isSvg
                            ? Container(
                                width: 44,
                                height: 44,
                                color: const Color(0xFFDBEAFE),
                                child: const Icon(Icons.person_rounded, size: 24, color: Color(0xFF00569E)),
                              )
                            : (isBase64
                                ? (bytes != null
                                    ? Image.memory(
                                        bytes,
                                        width: 44,
                                        height: 44,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => const Icon(Icons.person_rounded, size: 24, color: Colors.blue),
                                      )
                                    : const Icon(Icons.person_rounded, size: 24, color: Colors.blue))
                                : Image.network(
                                    fotoUrl.startsWith('/') ? '${baseUrl.replaceAll(RegExp(r'/api/?$'), '')}$fotoUrl' : fotoUrl,
                                    width: 44,
                                    height: 44,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, size: 24, color: Colors.grey),
                                  )),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Bukti Foto Terekam', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF00569E))),
                            Text('Ketuk untuk memperbesar foto', style: TextStyle(fontSize: 10, color: Colors.grey)),
                          ],
                        ),
                      ),
                      const Icon(Icons.zoom_in_rounded, size: 20, color: Color(0xFF00569E)),
                    ],
                  ),
                ),
              ),
            ],

            if (!isExited) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final ok = await _api.recordExit(log['id']);
                    if (ok) _fetchLogs();
                  },
                  icon: const Icon(Icons.logout_rounded, size: 16),
                  label: const Text('Catat Keluar', style: TextStyle(fontSize: 13)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class CameraCaptureDialog extends StatefulWidget {
  final Function(String base64Photo) onCaptured;
  const CameraCaptureDialog({super.key, required this.onCaptured});

  @override
  State<CameraCaptureDialog> createState() => _CameraCaptureDialogState();
}

class _CameraCaptureDialogState extends State<CameraCaptureDialog> {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  int _selectedCameraIndex = 0;
  bool _initializing = true;
  bool _capturing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        if (!mounted) return;
        setState(() {
          _error = "Kamera tidak ditemukan pada perangkat.";
          _initializing = false;
        });
        return;
      }

      final backIdx = _cameras.indexWhere((c) => c.lensDirection == CameraLensDirection.back);
      _selectedCameraIndex = backIdx != -1 ? backIdx : 0;

      await _setupController(_cameras[_selectedCameraIndex]);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = "Gagal menyalakan kamera. Menggunakan mode sampel.";
        _initializing = false;
      });
    }
  }

  Future<void> _setupController(CameraDescription camera) async {
    setState(() => _initializing = true);
    await _controller?.dispose();
    _controller = CameraController(camera, ResolutionPreset.medium, enableAudio: false);
    await _controller!.initialize();
    if (!mounted) return;
    setState(() => _initializing = false);
  }

  Future<void> _switchCamera() async {
    if (_cameras.length <= 1) return;
    _selectedCameraIndex = (_selectedCameraIndex + 1) % _cameras.length;
    await _setupController(_cameras[_selectedCameraIndex]);
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    if (_capturing) return;
    setState(() => _capturing = true);

    if (_controller != null && _controller!.value.isInitialized) {
      try {
        final XFile photo = await _controller!.takePicture();
        final Uint8List bytes = await photo.readAsBytes();
        final String b64 = base64Encode(bytes);
        widget.onCaptured('data:image/jpeg;base64,$b64');
        if (mounted) Navigator.pop(context);
        return;
      } catch (_) {}
    }

    widget.onCaptured("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOJM9PDkeODFDZCORQGQzOkjDxub78gAAAAAA");
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Kamera Live Pengunjung', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Row(
                  children: [
                    if (_cameras.length > 1)
                      IconButton(
                        icon: const Icon(Icons.cameraswitch_rounded, color: Color(0xFF00569E)),
                        tooltip: 'Ganti Kamera Depan / Belakang',
                        onPressed: _switchCamera,
                      ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              height: 260,
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(12),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _initializing
                    ? const Center(child: CircularProgressIndicator(color: Colors.white))
                    : (_error != null
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.camera_front_rounded, size: 48, color: Colors.white54),
                                const SizedBox(height: 8),
                                Text(_error!, style: const TextStyle(color: Colors.white70, fontSize: 12), textAlign: TextAlign.center),
                              ],
                            ),
                          )
                        : LayoutBuilder(
                            builder: (context, constraints) {
                              var aspect = _controller!.value.aspectRatio;
                              var scale = aspect * constraints.maxHeight / constraints.maxWidth;
                              if (scale < 1) scale = 1 / scale;

                              return Stack(
                                fit: StackFit.expand,
                                children: [
                                  Transform.scale(
                                    scale: scale,
                                    child: Center(
                                      child: CameraPreview(_controller!),
                                    ),
                                  ),
                                  if (_cameras.length > 1)
                                    Positioned(
                                      top: 8,
                                      right: 8,
                                      child: InkWell(
                                        onTap: _switchCamera,
                                        borderRadius: BorderRadius.circular(20),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: Colors.black.withValues(alpha: 0.6),
                                            borderRadius: BorderRadius.circular(20),
                                            border: Border.all(color: Colors.white24),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.cameraswitch_rounded, size: 14, color: Colors.white),
                                              const SizedBox(width: 4),
                                              Text(
                                                _cameras[_selectedCameraIndex].lensDirection == CameraLensDirection.front ? 'Kamera Depan' : 'Kamera Belakang',
                                                style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              );
                            },
                          )),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Batal'))),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00569E), foregroundColor: Colors.white),
                    onPressed: _capturing ? null : _takePhoto,
                    icon: _capturing
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.camera_rounded),
                    label: Text(_capturing ? 'Jepret...' : 'Jepret Foto'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class TambahLogForm extends StatefulWidget {
  final void Function(Map<String, dynamic> log) onSuccess;
  final VoidCallback onCancel;
  const TambahLogForm({super.key, required this.onSuccess, required this.onCancel});
  @override
  State<TambahLogForm> createState() => _TambahLogFormState();
}

class _TambahLogFormState extends State<TambahLogForm> {
  final _api = ApiService();
  final _namaCtrl = TextEditingController();
  final _instansiCtrl = TextEditingController();
  final _keperluanCtrl = TextEditingController();
  String _namaPic = '';
  String? _fotoBase64;
  bool _saving = false;
  String? _error;

  void _takeVisitorPhoto() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ambil Foto Pengunjung', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 6),
            const Text('Pilih metode pengambilan foto bukti fisik pengunjung:', style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 16),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFEFF6FF), child: Icon(Icons.camera_alt_rounded, color: Color(0xFF00569E))),
              title: const Text('Gunakan Kamera HP'),
              subtitle: const Text('Ambil foto langsung pengunjung via kamera'),
              onTap: () {
                Navigator.pop(ctx);
                _openCameraCaptureDialog();
              },
            ),
            ListTile(
              leading: const CircleAvatar(backgroundColor: Color(0xFFECFDF5), child: Icon(Icons.badge_rounded, color: Color(0xFF059669))),
              title: const Text('Gunakan Sample Badge Foto'),
              subtitle: const Text('Simulasi foto pengunjung terverifikasi'),
              onTap: () {
                Navigator.pop(ctx);
                setState(() {
                  _fotoBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOJM9PDkeODFDZCORQGQzOkjDxub78gAAAAAA";
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openCameraCaptureDialog() {
    showDialog(
      context: context,
      builder: (_) => CameraCaptureDialog(
        onCaptured: (b64) {
          setState(() => _fotoBase64 = b64);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Foto pengunjung berhasil diambil!'), backgroundColor: Colors.green),
            );
          }
        },
      ),
    );
  }

  Future<void> _submit() async {
    if (_namaCtrl.text.trim().isEmpty) { setState(() => _error = 'Nama orang wajib diisi.'); return; }
    if (_instansiCtrl.text.trim().isEmpty) { setState(() => _error = 'Nama instansi wajib diisi.'); return; }
    if (_namaPic.isEmpty) { setState(() => _error = 'Nama PIC wajib dipilih.'); return; }
    if (_keperluanCtrl.text.trim().isEmpty) { setState(() => _error = 'Keperluan wajib diisi.'); return; }
    if (_fotoBase64 == null || _fotoBase64!.isEmpty) { setState(() => _error = 'Bukti foto pengunjung wajib diambil.'); return; }

    setState(() { _saving = true; _error = null; });
    final result = await _api.createServerLog(
      namaOrang: _namaCtrl.text.trim(),
      instansi: _instansiCtrl.text.trim(),
      namaPic: _namaPic,
      keperluan: _keperluanCtrl.text.trim(),
      fotoUrl: _fotoBase64,
    );
    if (!mounted) return;
    setState(() => _saving = false);
    if (result['success'] == true) {
      widget.onSuccess(result['log'] as Map<String, dynamic>? ?? {});
    } else {
      setState(() => _error = result['message'] as String? ?? 'Gagal menyimpan.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Tambah Log Akses Server', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const Text('Catat siapa yang masuk ke ruang server. Waktu masuk terekam otomatis.', style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 14),

            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.blue.shade100)),
              child: const Row(
                children: [
                  Icon(Icons.access_time, size: 16, color: Color(0xFF00569E)),
                  SizedBox(width: 8),
                  Text('Waktu Masuk: Otomatis (Waktu Sekarang)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF00569E))),
                ],
              ),
            ),
            const SizedBox(height: 14),

            _label('Nama Orang', required: true),
            TextFormField(controller: _namaCtrl, decoration: const InputDecoration(hintText: 'Nama lengkap pengunjung / vendor')),
            const SizedBox(height: 12),

            _label('Nama Instansi', required: true),
            TextFormField(
              controller: _instansiCtrl,
              decoration: const InputDecoration(hintText: 'Mis. Bank Nagari, PT. PLN, Vendor...'),
            ),
            const SizedBox(height: 12),

            _label('Nama PIC Pendamping', required: true),
            DropdownButtonFormField<String>(
              value: _namaPic.isEmpty ? null : _namaPic, // ignore: deprecated_member_use
              decoration: const InputDecoration(hintText: 'Pilih PIC IT Support...'),
              items: _picList.map((n) => DropdownMenuItem(value: n, child: Text(n, style: const TextStyle(fontSize: 13)))).toList(),
              onChanged: (v) => setState(() => _namaPic = v ?? ''),
            ),
            const SizedBox(height: 12),

            _label('Keperluan', required: true),
            TextFormField(controller: _keperluanCtrl, decoration: const InputDecoration(hintText: 'Mis. Maintenance server, Pengecekan AC...')),
            const SizedBox(height: 14),

            _label('Bukti Foto Pengunjung', required: true),
            if (_fotoBase64 != null && _fotoBase64!.isNotEmpty) ...[
              Container(
                height: 130,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.blue.shade200),
                ),
                child: Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.memory(
                        base64Decode(_fotoBase64!.split(',').last.replaceAll(RegExp(r'\s+'), '')),
                        width: double.infinity,
                        height: 130,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: 6, right: 6,
                      child: InkWell(
                        onTap: () => setState(() => _fotoBase64 = null),
                        child: const CircleAvatar(
                          backgroundColor: Colors.black54,
                          radius: 14,
                          child: Icon(Icons.close, size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ] else ...[
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEFF6FF),
                    foregroundColor: const Color(0xFF00569E),
                    elevation: 0,
                    side: const BorderSide(color: Color(0xFFBFDBFE)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _takeVisitorPhoto,
                  icon: const Icon(Icons.camera_alt_rounded),
                  label: const Text('Ambil Foto Pengunjung (Kamera)'),
                ),
              ),
              const SizedBox(height: 12),
            ],

            if (_error != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.red.shade50, border: Border.all(color: Colors.red.shade200), borderRadius: BorderRadius.circular(8)),
                child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: widget.onCancel, child: const Text('Batal'))),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _submit,
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Simpan Log', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MONITORING PAGE — Dengan Modal Detail & Update Tiket Lengkap
// ─────────────────────────────────────────────────────────────────────────────

class MonitoringPage extends StatefulWidget {
  const MonitoringPage({super.key});
  @override
  State<MonitoringPage> createState() => _MonitoringPageState();
}

class _MonitoringPageState extends State<MonitoringPage> {
  final _api = ApiService();
  List<dynamic> _proses = [];
  List<dynamic> _selesai = [];
  bool _loading = false;
  int _activeFilterIndex = 0; // 0: Dalam Proses, 1: Selesai

  final _searchController = TextEditingController();
  String _searchQuery = '';
  List<String> _daftarCabang = ['Semua Cabang'];
  String _selectedCabang = 'Semua Cabang';

  @override
  void initState() {
    super.initState();
    _loadCabang();
    _fetchAll();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCabang() async {
    final list = await _api.getCabangList();
    if (mounted && list.isNotEmpty) {
      setState(() {
        _daftarCabang = ['Semua Cabang', ...list];
      });
    }
  }

  Future<void> _fetchAll() async {
    setState(() => _loading = true);
    final [p, s] = await Future.wait([
      _api.getTickets(status: 'proses', search: _searchQuery, wsCabang: _selectedCabang),
      _api.getTickets(status: 'selesai', search: _searchQuery, wsCabang: _selectedCabang),
    ]);
    if (mounted) setState(() { _proses = p; _selesai = s; _loading = false; });
  }

  void _resetFilter() {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _selectedCabang = 'Semua Cabang';
    });
    _fetchAll();
  }

  void _showTicketDetailModal(Map<String, dynamic> ticket) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _TicketDetailBottomSheet(
        ticket: ticket,
        onUpdated: () => _fetchAll(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeList = _activeFilterIndex == 0 ? _proses : _selesai;
    final activeStatusKey = _activeFilterIndex == 0 ? 'proses' : 'selesai';
    final isFilterActive = _searchQuery.isNotEmpty || _selectedCabang != 'Semua Cabang';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Monitoring Tiket', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (isFilterActive)
            TextButton.icon(
              onPressed: _resetFilter,
              icon: const Icon(Icons.filter_alt_off_rounded, size: 16, color: Colors.white),
              label: const Text('Reset', style: TextStyle(color: Colors.white, fontSize: 12)),
            ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Panel
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              children: [
                // Search Input Field
                TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    setState(() => _searchQuery = val.trim());
                    _fetchAll();
                  },
                  decoration: InputDecoration(
                    hintText: 'Cari no tiket, merek, kerusakan, vendor...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Color(0xFF64748B)),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                              _fetchAll();
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 8),

                // Filter Cabang Selector
                Row(
                  children: [
                    const Icon(Icons.business_rounded, size: 16, color: Color(0xFF00569E)),
                    const SizedBox(width: 6),
                    const Text('Cabang:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _daftarCabang.contains(_selectedCabang) ? _selectedCabang : 'Semua Cabang',
                            isExpanded: true,
                            dense: true,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF1E293B), fontWeight: FontWeight.w500),
                            items: _daftarCabang.map((c) => DropdownMenuItem(value: c, child: Text(c, overflow: TextOverflow.ellipsis))).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => _selectedCabang = val);
                                _fetchAll();
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Filter Tabs Segmented Control
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Container(
              height: 40,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _activeFilterIndex = 0),
                      borderRadius: BorderRadius.circular(9),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: _activeFilterIndex == 0 ? const Color(0xFF00569E) : Colors.transparent,
                          borderRadius: BorderRadius.circular(9),
                          boxShadow: _activeFilterIndex == 0
                              ? [const BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))]
                              : [],
                        ),
                        child: Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.autorenew_rounded,
                                size: 15,
                                color: _activeFilterIndex == 0 ? Colors.white : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Dalam Proses (${_proses.length})',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: _activeFilterIndex == 0 ? Colors.white : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _activeFilterIndex = 1),
                      borderRadius: BorderRadius.circular(9),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: _activeFilterIndex == 1 ? const Color(0xFF059669) : Colors.transparent,
                          borderRadius: BorderRadius.circular(9),
                          boxShadow: _activeFilterIndex == 1
                              ? [const BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))]
                              : [],
                        ),
                        child: Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.check_circle_rounded,
                                size: 15,
                                color: _activeFilterIndex == 1 ? Colors.white : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Selesai (${_selesai.length})',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: _activeFilterIndex == 1 ? Colors.white : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          // Body Ticket List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _ticketList(activeList, activeStatusKey),
          ),
        ],
      ),
    );
  }

  Widget _ticketList(List<dynamic> tickets, String status) {
    if (tickets.isEmpty) {
      return RefreshIndicator(
        onRefresh: _fetchAll,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            SizedBox(
              height: 300,
              child: Center(
                child: Text(
                  status == 'proses' ? 'Tidak ada tiket dalam proses.' : 'Tidak ada tiket selesai.',
                  style: const TextStyle(color: Colors.grey),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchAll,
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(12),
        itemCount: tickets.length,
        itemBuilder: (_, i) {
          final t = tickets[i] as Map<String, dynamic>;
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: InkWell(
              onTap: () => _showTicketDetailModal(t),
              borderRadius: BorderRadius.circular(14),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: status == 'proses' ? Colors.amber.shade100 : Colors.green.shade100,
                      child: Icon(
                        status == 'proses' ? Icons.autorenew_rounded : Icons.check_circle_outline,
                        color: status == 'proses' ? Colors.amber.shade800 : Colors.green.shade800,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t['noTiket'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'monospace')),
                          const SizedBox(height: 2),
                          Text('${t['wsCabang'] ?? ''} • ${t['wsMerekKomputer'] ?? ''}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                          Text(t['wsKerusakan'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Colors.grey),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// Bottom Sheet Detail & Update Tiket
class _TicketDetailBottomSheet extends StatefulWidget {
  final Map<String, dynamic> ticket;
  final VoidCallback onUpdated;
  const _TicketDetailBottomSheet({required this.ticket, required this.onUpdated});
  @override
  State<_TicketDetailBottomSheet> createState() => _TicketDetailBottomSheetState();
}

class _TicketDetailBottomSheetState extends State<_TicketDetailBottomSheet> {
  final _api = ApiService();
  final _kegiatanCtrl = TextEditingController();
  final _vendorCtrl = TextEditingController();
  final _picTerimaCtrl = TextEditingController();
  final _tglKeVendorCtrl = TextEditingController();
  final _tglSelesaiVendorCtrl = TextEditingController();
  final _tglKembaliCtrl = TextEditingController();
  final _keteranganCtrl = TextEditingController();
  bool _updating = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _vendorCtrl.text = widget.ticket['wsVendor'] as String? ?? '';
    _picTerimaCtrl.text = widget.ticket['wsPicTerima'] as String? ?? '';
    _keteranganCtrl.text = widget.ticket['keterangan'] as String? ?? '';
    if (widget.ticket['wsTglKeVendor'] != null) {
      _tglKeVendorCtrl.text = widget.ticket['wsTglKeVendor'].toString().split('T').first;
    }
    if (widget.ticket['wsTglSelesaiVendor'] != null) {
      _tglSelesaiVendorCtrl.text = widget.ticket['wsTglSelesaiVendor'].toString().split('T').first;
    }
    if (widget.ticket['wsTglKembaliKeCabang'] != null) {
      _tglKembaliCtrl.text = widget.ticket['wsTglKembaliKeCabang'].toString().split('T').first;
    }
  }

  Future<void> _pickDate(TextEditingController ctrl) async {
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2099),
    );
    if (d != null) {
      ctrl.text = DateFormat("yyyy-MM-dd").format(d);
    }
  }

  Future<void> _addActivity() async {
    if (_kegiatanCtrl.text.trim().isEmpty) return;
    setState(() => _updating = true);
    final res = await _api.addTicketActivity(widget.ticket['id'] as String, _kegiatanCtrl.text.trim());
    if (!mounted) return;
    setState(() => _updating = false);
    if (res['success'] == true) {
      _kegiatanCtrl.clear();
      widget.onUpdated();
      Navigator.pop(context);
    } else {
      setState(() => _error = res['message'] as String?);
    }
  }

  Future<void> _updateVendor() async {
    setState(() => _updating = true);
    final ok = await _api.updateTicket(widget.ticket['id'] as String, {
      'wsVendor': _vendorCtrl.text.trim().isEmpty ? null : _vendorCtrl.text.trim(),
      'wsPicTerima': _picTerimaCtrl.text.trim().isEmpty ? null : _picTerimaCtrl.text.trim(),
      'wsTglKeVendor': _tglKeVendorCtrl.text.trim().isEmpty ? null : _tglKeVendorCtrl.text.trim(),
      'wsTglSelesaiVendor': _tglSelesaiVendorCtrl.text.trim().isEmpty ? null : _tglSelesaiVendorCtrl.text.trim(),
      'wsTglKembaliKeCabang': _tglKembaliCtrl.text.trim().isEmpty ? null : _tglKembaliCtrl.text.trim(),
      'keterangan': _keteranganCtrl.text.trim().isEmpty ? null : _keteranganCtrl.text.trim(),
    });
    if (!mounted) return;
    setState(() => _updating = false);
    if (ok) {
      widget.onUpdated();
      Navigator.pop(context);
    } else {
      setState(() => _error = 'Gagal memperbarui data vendor.');
    }
  }

  Future<void> _closeTicket() async {
    setState(() => _updating = true);
    final ok = await _api.closeTicket(widget.ticket['id'] as String);
    if (!mounted) return;
    setState(() => _updating = false);
    if (ok) {
      widget.onUpdated();
      Navigator.pop(context);
    } else {
      setState(() => _error = 'Gagal menyelesaikan tiket.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.ticket;
    final isSelesai = t['status'] == 'selesai';

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t['noTiket'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, fontFamily: 'monospace')),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isSelesai ? Colors.green.shade50 : Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: isSelesai ? Colors.green.shade200 : Colors.amber.shade200),
                  ),
                  child: Text(
                    isSelesai ? 'SELESAI' : 'DALAM PROSES',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSelesai ? Colors.green.shade700 : Colors.amber.shade700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            _detailRow('Cabang', t['wsCabang']),
            _detailRow('Merek / Perangkat', t['wsMerekKomputer']),
            _detailRow('SN Perangkat', t['wsSnKomputer']),
            _detailRow('Kerusakan', t['wsKerusakan']),
            _detailRow('Kelengkapan', t['wsKelengkapan']),
            _detailRow('Contact Person', '${t['cpNama']} (${t['cpTipe']})'),
            const Divider(height: 24),

            const Text('Update Status Vendor & Timeline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _vendorCtrl,
              decoration: const InputDecoration(labelText: 'Nama Vendor (mis. Lenovo Service Center)'),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _pickDate(_tglKeVendorCtrl),
                    child: AbsorbPointer(
                      child: TextFormField(
                        controller: _tglKeVendorCtrl,
                        decoration: const InputDecoration(labelText: 'Tgl Ke Vendor', suffixIcon: Icon(Icons.calendar_today, size: 16)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GestureDetector(
                    onTap: () => _pickDate(_tglSelesaiVendorCtrl),
                    child: AbsorbPointer(
                      child: TextFormField(
                        controller: _tglSelesaiVendorCtrl,
                        decoration: const InputDecoration(labelText: 'Tgl Selesai Vendor', suffixIcon: Icon(Icons.calendar_today, size: 16)),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _pickDate(_tglKembaliCtrl),
                    child: AbsorbPointer(
                      child: TextFormField(
                        controller: _tglKembaliCtrl,
                        decoration: const InputDecoration(labelText: 'Tgl Kembali Cabang', suffixIcon: Icon(Icons.calendar_today, size: 16)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _picTerimaCtrl,
                    decoration: const InputDecoration(labelText: 'PIC Penerima Kembali'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            TextFormField(
              controller: _keteranganCtrl,
              decoration: const InputDecoration(labelText: 'Catatan Tambahan / Keterangan'),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _updating ? null : _updateVendor,
                icon: const Icon(Icons.save_outlined, size: 16),
                label: const Text('Simpan Data Vendor & Timeline'),
              ),
            ),
            const Divider(height: 24),

            const Text('Tambah Catatan / Aktivitas Baru', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _kegiatanCtrl,
              decoration: const InputDecoration(hintText: 'Tuliskan tindakan penanganan terbaru...'),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _updating ? null : _addActivity,
                icon: const Icon(Icons.add_comment_outlined, size: 16),
                label: const Text('Tambah Log Aktivitas'),
              ),
            ),

            if (!isSelesai) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669)),
                  onPressed: _updating ? null : _closeTicket,
                  icon: const Icon(Icons.check_circle_outline, size: 18),
                  label: const Text('Tandai Tiket Selesai'),
                ),
              ),
            ],

            if (_error != null) ...[
              const SizedBox(height: 10),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, dynamic val) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey))),
          Expanded(child: Text(val?.toString() ?? '-', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERVISI PAGE
// ─────────────────────────────────────────────────────────────────────────────

class SupervisiPage extends StatefulWidget {
  const SupervisiPage({super.key});
  @override
  State<SupervisiPage> createState() => _SupervisiPageState();
}

class _SupervisiPageState extends State<SupervisiPage> {
  final _api = ApiService();
  List<dynamic> _pending = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    final all = await _api.getTickets();
    if (mounted) {
      setState(() {
        _pending = all.where((t) => (t as Map)['statusSupervisi'] == 'belum').toList();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Supervisi & Approval'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _fetch)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _pending.isEmpty
              ? const Center(child: Text('Tidak ada tiket yang menunggu approval.', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _pending.length,
                  itemBuilder: (_, i) {
                    final t = _pending[i] as Map<String, dynamic>;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(t['noTiket'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, fontFamily: 'monospace')),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(6), border: Border.all(color: Colors.blue.shade200)),
                                  child: Text('MENUNGGU APPROVAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.blue.shade700)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text('Cabang: ${t['wsCabang'] ?? '-'}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                            Text('Merek: ${t['wsMerekKomputer'] ?? '-'}', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: () async {
                                  final scaffoldCtx = ScaffoldMessenger.of(context);
                                  final ok = await _api.approveTicket(t['id'] as String);
                                  if (!mounted) return;
                                  if (ok) {
                                    scaffoldCtx.showSnackBar(
                                      const SnackBar(content: Text('Tiket berhasil di-approve!'), backgroundColor: Colors.green),
                                    );
                                    _fetch();
                                  }
                                },
                                icon: const Icon(Icons.draw_rounded),
                                label: const Text('Approve & Tanda Tangan Digital'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER WIDGETS
// ─────────────────────────────────────────────────────────────────────────────

Widget _label(String text, {bool required = false}) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 5),
    child: RichText(
      text: TextSpan(
        text: text,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87),
        children: required ? const [TextSpan(text: ' *', style: TextStyle(color: Colors.red))] : [],
      ),
    ),
  );
}

Widget _sectionHeader(String title, String subtitle) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 4),
        const Divider(),
        const SizedBox(height: 4),
      ],
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL DASHBOARD CUSTOM PAINTERS (Line Chart & Donut Chart)
// ─────────────────────────────────────────────────────────────────────────────

class _LineChartPainter extends CustomPainter {
  final List<dynamic> trendData;
  _LineChartPainter(this.trendData);

  @override
  void paint(Canvas canvas, Size size) {
    if (trendData.isEmpty) return;

    final maxVal = trendData.fold<double>(1.0, (prev, e) {
      final c = (e['count'] as num?)?.toDouble() ?? 0.0;
      return c > prev ? c : prev;
    });

    final points = <Offset>[];
    final stepX = size.width / (trendData.length - 1 > 0 ? trendData.length - 1 : 1);

    for (int i = 0; i < trendData.length; i++) {
      final c = (trendData[i]['count'] as num?)?.toDouble() ?? 0.0;
      final y = size.height - (c / maxVal * (size.height - 24)) - 12;
      final x = i * stepX;
      points.add(Offset(x, y));
    }

    if (points.isEmpty) return;

    // Fill under line
    final path = Path();
    path.moveTo(points.first.dx, size.height);
    path.lineTo(points.first.dx, points.first.dy);

    for (int i = 0; i < points.length - 1; i++) {
      final p1 = points[i];
      final p2 = points[i + 1];
      final controlP1 = Offset(p1.dx + (p2.dx - p1.dx) / 2, p1.dy);
      final controlP2 = Offset(p1.dx + (p2.dx - p1.dx) / 2, p2.dy);
      path.cubicTo(controlP1.dx, controlP1.dy, controlP2.dx, controlP2.dy, p2.dx, p2.dy);
    }
    path.lineTo(points.last.dx, size.height);
    path.close();

    final fillPaint = Paint()
      ..shader = LinearGradient(
        colors: [const Color(0xFF00569E).withValues(alpha: 0.35), const Color(0xFF00569E).withValues(alpha: 0.0)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    canvas.drawPath(path, fillPaint);

    // Line stroke
    final strokePath = Path();
    strokePath.moveTo(points.first.dx, points.first.dy);
    for (int i = 0; i < points.length - 1; i++) {
      final p1 = points[i];
      final p2 = points[i + 1];
      final controlP1 = Offset(p1.dx + (p2.dx - p1.dx) / 2, p1.dy);
      final controlP2 = Offset(p1.dx + (p2.dx - p1.dx) / 2, p2.dy);
      strokePath.cubicTo(controlP1.dx, controlP1.dy, controlP2.dx, controlP2.dy, p2.dx, p2.dy);
    }

    final linePaint = Paint()
      ..color = const Color(0xFF00569E)
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawPath(strokePath, linePaint);

    // Draw last point dot
    final lastPoint = points.last;
    final dotOuterPaint = Paint()..color = const Color(0xFF00569E);
    final dotInnerPaint = Paint()..color = Colors.white;
    canvas.drawCircle(lastPoint, 5, dotOuterPaint);
    canvas.drawCircle(lastPoint, 2.5, dotInnerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _DonutChartPainter extends CustomPainter {
  final List<dynamic> branchData;
  _DonutChartPainter(this.branchData);

  static const chartColors = [
    Color(0xFF00569E),
    Color(0xFF059669),
    Color(0xFFD97706),
    Color(0xFF7C3AED),
    Color(0xFF0284C7),
    Color(0xFFEC4899),
    Color(0xFF8B5CF6),
    Color(0xFF64748B),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    if (branchData.isEmpty) return;

    final total = branchData.fold<double>(0.0, (prev, e) {
      return prev + ((e['count'] as num?)?.toDouble() ?? 0.0);
    });
    if (total == 0) return;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2;
    const strokeWidth = 18.0;

    double startAngle = -math.pi / 2;

    for (int i = 0; i < branchData.length; i++) {
      final count = (branchData[i]['count'] as num?)?.toDouble() ?? 0.0;
      final sweepAngle = (count / total) * 2 * math.pi;

      final paint = Paint()
        ..color = chartColors[i % chartColors.length]
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.butt;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
        startAngle,
        sweepAngle > 0.05 ? sweepAngle - 0.04 : sweepAngle,
        false,
        paint,
      );

      startAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
