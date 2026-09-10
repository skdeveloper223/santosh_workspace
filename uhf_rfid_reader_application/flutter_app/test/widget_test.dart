// Basic smoke test — full app startup needs a live Supabase.initialize(),
// so this renders the Login screen in isolation (its build() doesn't touch
// Supabase until the user actually submits the form).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:flutter_app/core/state/app_state.dart';
import 'package:flutter_app/features/auth/login_screen.dart';

void main() {
  testWidgets('Login screen renders email, password and sign-in button', (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(create: (_) => AppState(), child: const MaterialApp(home: LoginScreen())),
    );

    expect(find.text('AE SECURITY'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Guard Email'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'PIN / Password'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'SIGN IN'), findsOneWidget);
  });
}
