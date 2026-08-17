# PaliaAPK HUB Login Fix

- Fixed missing `safeRedirect()` that caused successful login to fail with a JavaScript error.
- Email/password login now redirects safely back to the requested app/download page.
- Google login on Android uses the native Firebase Authentication plugin.
- Codemagic explicitly registers `FirebaseAuthenticationPlugin` in `MainActivity` so the Android runtime does not fall back to the WebPlugin `not implemented` implementation.
- Google provider configuration remains enabled and the build checks fail if native plugin registration is missing.
- Web login continues to use Firebase Web Auth.

The Firebase Console must have Google Sign-In enabled and the Android app's SHA-1 fingerprint registered, as required by the plugin documentation.
