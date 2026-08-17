# Google Login Fix v12

Root cause: the JavaScript proxy existed, but the Android native FirebaseAuthentication module was not guaranteed to be included in the generated Capacitor project.

This build explicitly wires `@capacitor-firebase/authentication/android` into `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, and `capacitor.plugins.json` after `npx cap sync android`, using the official Android classpath `io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin`.

The web page uses one Capacitor `registerPlugin('FirebaseAuthentication')` proxy and then bridges the native Firebase ID token into the Firebase JS Auth session.
