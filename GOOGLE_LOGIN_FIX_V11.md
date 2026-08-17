# Google Login Fix v11

The plain-HTML Capacitor app now registers the native FirebaseAuthentication plugin with `Capacitor.registerPlugin()` instead of relying on `Capacitor.Plugins` being pre-populated.

Build pipeline installs `@capacitor-firebase/authentication`, runs `npx cap update android` and `npx cap sync android`, and verifies native plugin metadata before Gradle.
