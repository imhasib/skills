import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Thin wrapper around `FlutterSecureStorage` for JWT persistence.
/// Tokens go in OS keychain (iOS) / Keystore (Android) — never SharedPreferences.
class AuthStorage {
  AuthStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String _kJwt = 'jwt';

  final FlutterSecureStorage _storage;

  Future<String?> readJwt() => _storage.read(key: _kJwt);

  Future<void> writeJwt(String jwt) => _storage.write(key: _kJwt, value: jwt);

  Future<void> clear() => _storage.delete(key: _kJwt);
}

final authStorageProvider = Provider<AuthStorage>((_) => AuthStorage());
