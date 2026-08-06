import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// ─── BASE URL DINAMIS ────────────────────────────────────────────────────────
// Default Hotspot Windows IP: 192.168.137.1 (Bisa diubah secara langsung via menu di HP)
String _currentBaseUrl = 'http://192.168.137.1:3000/api';

String get baseUrl => _currentBaseUrl;

Future<void> setCustomServerIp(String ipOrHost) async {
  var clean = ipOrHost.trim().replaceAll('http://', '').replaceAll('https://', '').replaceAll('/api', '').replaceAll('/', '');
  if (!clean.contains(':')) {
    clean = '$clean:3000';
  }
  _currentBaseUrl = 'http://$clean/api';
  try {
    await const FlutterSecureStorage().write(key: 'custom_server_url', value: _currentBaseUrl);
  } catch (_) {}
}

Future<void> loadSavedBaseUrl() async {
  try {
    final saved = await const FlutterSecureStorage().read(key: 'custom_server_url');
    if (saved != null && saved.isNotEmpty) {
      _currentBaseUrl = saved;
    }
  } catch (_) {}
}
// ─────────────────────────────────────────────────────────────────────────────


class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final _storage = const FlutterSecureStorage();
  String? _cookieHeader; // berisi "name=value" siap dikirim sebagai Cookie header

  // ── Cookie helpers ────────────────────────────────────────────────

  Future<void> _loadCookieFromStorage() async {
    try {
      _cookieHeader = await _storage.read(key: 'session_cookie');
    } catch (_) {
      _cookieHeader = null;
    }
  }

  Future<void> _saveCookieFromResponse(http.Response response) async {
    try {
      final raw = response.headers['set-cookie'];
      if (raw != null && raw.isNotEmpty) {
        final cookieValue = raw.split(';').first.trim();
        _cookieHeader = cookieValue;
        await _storage.write(key: 'session_cookie', value: cookieValue);
      }
    } catch (_) {}
  }

  Future<void> _clearCookie() async {
    _cookieHeader = null;
    try {
      await _storage.delete(key: 'session_cookie');
    } catch (_) {}
  }

  /// Header standar untuk semua request (dengan cookie session jika ada)
  Future<Map<String, String>> _headers({bool json = false}) async {
    await _loadCookieFromStorage();
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (_cookieHeader != null && _cookieHeader!.isNotEmpty) {
      h['Cookie'] = _cookieHeader!;
    }
    return h;
  }

  // ─────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────

  /// Login → minta session cookie dari /api/auth/login
  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username.trim(), 'password': password}),
      );

      final data = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode == 200) {
        await _saveCookieFromResponse(response);
        if (data['user'] != null) {
          await _storage.write(key: 'user_cache', value: jsonEncode(data['user']));
          await updateLastActive();
        }
        return {'success': true, 'user': data['user']};
      } else {
        return {'success': false, 'message': data['error'] ?? 'Username atau password salah.'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server. Periksa koneksi.'};
    }
  }

  /// Logout → bersihkan session
  Future<void> logout() async {
    try {
      http.post(Uri.parse('$baseUrl/auth/logout'), headers: await _headers()).ignore();
    } catch (_) {}
    await _clearCookie();
    await _storage.delete(key: 'user_cache');
    await _storage.delete(key: 'last_active');
  }

  /// Update timestamp aktivitas terakhir
  Future<void> updateLastActive() async {
    try {
      await _storage.write(key: 'last_active', value: DateTime.now().millisecondsSinceEpoch.toString());
    } catch (_) {}
  }

  /// Cek & restore session jika masih dalam rentang waktu aktif (30 menit inactivity timeout)
  Future<Map<String, dynamic>?> checkOrRestoreSession() async {
    try {
      final me = await getMe().timeout(const Duration(milliseconds: 2500), onTimeout: () => null);
      if (me != null && me['user'] != null) {
        await _storage.write(key: 'user_cache', value: jsonEncode(me['user']));
        await updateLastActive();
        return me['user'] as Map<String, dynamic>;
      }

      final cachedUser = await _storage.read(key: 'user_cache');
      final lastActiveStr = await _storage.read(key: 'last_active');

      if (cachedUser != null && lastActiveStr != null) {
        final lastActive = int.tryParse(lastActiveStr) ?? 0;
        final now = DateTime.now().millisecondsSinceEpoch;
        // Inactivity timeout: 30 menit
        const timeoutMs = 30 * 60 * 1000;

        if (now - lastActive < timeoutMs) {
          await updateLastActive();
          return jsonDecode(cachedUser) as Map<String, dynamic>;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Verifikasi session masih valid → GET /api/me
  Future<Map<String, dynamic>?> getMe() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/me'), headers: await _headers())
          .timeout(const Duration(seconds: 3));
      if (response.statusCode == 200) {
        await _saveCookieFromResponse(response);
        await updateLastActive();
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // MASTER CABANG
  // ─────────────────────────────────────────────────────────────────

  Future<List<String>> getCabangList() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/workstation'), headers: await _headers());
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        // API mengembalikan { items: [...] }
        final items = data['items'] as List? ?? [];
        return items.map((e) => e['namaCabang'] as String).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Ambil opsi master merek komputer, merek EDC, dan list vendor
  Future<Map<String, dynamic>> getMasterOptions() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/master-options'), headers: await _headers());
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return {};
    } catch (_) {
      return {};
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // TIKET WORKSTATION
  // POST /api/tickets → { item: { id, noTiket } }
  // GET  /api/tickets → { items: [...] }   ← bukan 'tickets'!
  // ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> createTicket(Map<String, dynamic> payload) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/tickets'),
        headers: await _headers(json: true),
        body: jsonEncode(payload),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode == 200 || response.statusCode == 201) {
        // Server mengembalikan { item: { id, noTiket } }
        return {'success': true, 'noTiket': data['item']?['noTiket'] ?? ''};
      }
      return {'success': false, 'message': data['error'] ?? 'Gagal membuat tiket.'};
    } catch (_) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server.'};
    }
  }

  Future<List<dynamic>> getTickets({String? status, String? search, String? wsCabang}) async {
    try {
      final params = <String, String>{};
      if (status != null && status.isNotEmpty && status != 'semua') params['status'] = status;
      if (search != null && search.isNotEmpty) params['search'] = search;
      if (wsCabang != null && wsCabang.isNotEmpty && wsCabang != 'Semua Cabang') params['wsCabang'] = wsCabang;

      final uri = Uri.parse('$baseUrl/tickets').replace(queryParameters: params);
      final response = await http.get(uri, headers: await _headers());
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        // GET /api/tickets mengembalikan { items: [...] } bukan 'tickets'
        return data['items'] as List? ?? [];
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Simpan nomor surat & cabang terakhir untuk auto-fill tiket berikutnya
  Future<void> saveLastNoSurat(String noSurat, String cabang) async {
    try {
      await _storage.write(key: 'last_no_surat', value: noSurat);
      await _storage.write(key: 'last_ws_cabang', value: cabang);
    } catch (_) {}
  }

  /// Ambil nomor surat & cabang terakhir yang tersimpan
  Future<Map<String, String>> getLastNoSurat() async {
    try {
      final noSurat = await _storage.read(key: 'last_no_surat') ?? '';
      final cabang = await _storage.read(key: 'last_ws_cabang') ?? '';
      return {'noSurat': noSurat, 'cabang': cabang};
    } catch (_) {
      return {'noSurat': '', 'cabang': ''};
    }
  }

  Future<Map<String, dynamic>?> getTicketDetail(String id) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/tickets/$id'), headers: await _headers());
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<bool> closeTicket(String id) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/tickets/$id/close'),
        headers: await _headers(json: true),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateTicket(String id, Map<String, dynamic> payload) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/tickets/$id'),
        headers: await _headers(json: true),
        body: jsonEncode(payload),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> approveTicket(String id) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/tickets/$id/approve-workstation'),
        headers: await _headers(json: true),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> addTicketActivity(String ticketId, String teks) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/tickets/$ticketId/activities'),
        headers: await _headers(json: true),
        body: jsonEncode({'teks': teks}),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true};
      }
      return {'success': false, 'message': data['error'] ?? 'Gagal menambah kegiatan.'};
    } catch (_) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server.'};
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // LOG SERVER ROOM
  // POST /api/server-log → { log: {...} }
  // GET  /api/server-log → { logs: [...] }
  // PATCH /api/server-log → (exit / approve)
  // ─────────────────────────────────────────────────────────────────

  Future<List<dynamic>> getServerLogs({String filter = 'harian'}) async {
    try {
      final uri = Uri.parse('$baseUrl/server-log').replace(queryParameters: {'filter': filter});
      final response = await http.get(uri, headers: await _headers());
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data['logs'] as List? ?? [];
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<Map<String, dynamic>> createServerLog({
    required String namaOrang,
    required String instansi,
    required String namaPic,
    required String keperluan,
    String? fotoUrl,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/server-log'),
        headers: await _headers(json: true),
        body: jsonEncode({
          'namaOrang': namaOrang.trim(),
          'instansi': instansi.trim(),
          'namaPic': namaPic.trim(),
          'keperluan': keperluan.trim(),
          if (fotoUrl != null) 'fotoUrl': fotoUrl,
        }),
      );
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'log': data['log']};
      }
      return {'success': false, 'message': data['error'] ?? 'Gagal menyimpan log.'};
    } catch (_) {
      return {'success': false, 'message': 'Tidak dapat terhubung ke server.'};
    }
  }

  Future<bool> recordExit(String logId) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/server-log'),
        headers: await _headers(json: true),
        body: jsonEncode({'id': logId, 'action': 'exit'}),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> approveServerLog(String logId) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/server-log'),
        headers: await _headers(json: true),
        body: jsonEncode({'id': logId, 'action': 'approve'}),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> getDashboard() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/dashboard'), headers: await _headers());
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return {};
    } catch (_) {
      return {};
    }
  }
}
