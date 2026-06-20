import 'package:flutter/material.dart';

/// Base light theme. Replace tokens with the product's palette.
class AppTheme {
  AppTheme._();

  static const Color primary = Color(0xFF1F2937);
  static const Color surface = Color(0xFFFAFAFA);
  static const Color borderMuted = Color(0xFFE5E7EB);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: primary);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: surface,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: borderMuted),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: borderMuted),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(24)),
          ),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        elevation: 0,
        centerTitle: false,
      ),
    );
  }
}
