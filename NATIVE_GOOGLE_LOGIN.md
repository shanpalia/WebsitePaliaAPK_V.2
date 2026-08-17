# PaliaAPK HUB - Native Google Login

Android now uses the official Android Credential Manager flow directly through a small local Capacitor plugin. The Google account chooser opens in the Android app; Chrome/browser redirect is not used on Android.

Flow:
1. User taps Continue with Google.
2. Credential Manager shows Google account choices.
3. The native plugin returns the Google ID token.
4. Firebase Web Auth signs in with GoogleAuthProvider.credential(idToken).
5. The existing PaliaAPK HUB login session and download protection continue to use Firebase Auth.

The website/PWA fallback still uses Firebase Web redirect.

Android dependencies follow current Firebase/Android guidance:
- androidx.credentials:credentials:1.3.0
- androidx.credentials:credentials-play-services-auth:1.3.0
- com.google.android.libraries.identity.googleid:googleid:1.1.1
