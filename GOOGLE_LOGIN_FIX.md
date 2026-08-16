# Google Login Android Fix

The Android Google sign-in issue was caused by creating a second bundled Capacitor core instance for the Firebase Authentication plugin.

The build now registers FirebaseAuthentication through the native `window.Capacitor.registerPlugin()` bridge and configures the Google web client ID.

Firebase Console requirements:
- Google provider enabled
- SHA-1 for the release keystore added to `com.shanpalia.paliaapkhub`
- Updated google-services.json supplied through FIREBASE_GOOGLE_SERVICES_JSON

The configured web client ID is:
270953807883-btnln51tlh1e1b2dtjfo6bsoasjhoc3s.apps.googleusercontent.com
