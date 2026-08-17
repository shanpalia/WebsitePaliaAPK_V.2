# Google Login Fix v12

The Android native Firebase Authentication module is explicitly wired into the generated Capacitor project after `npx cap sync android`.

The build adds the plugin project to `capacitor.settings.gradle`, adds the implementation dependency to `android/app/capacitor.build.gradle`, and forces the official plugin classpath in `capacitor.plugins.json`: `io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin`.

The HTML app uses a single Capacitor `registerPlugin("FirebaseAuthentication")` proxy and bridges the native Firebase ID token into the Firebase JS Auth session.
