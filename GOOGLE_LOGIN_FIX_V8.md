# Google Login Fix v8

The previous builds loaded the FirebaseAuthentication bundle before Capacitor's plain-HTML runtime was available.

This version:
- enables the bundled Capacitor runtime for the plain HTML app;
- copies `@capacitor/core/dist/capacitor.js` to `www/capacitor.js` during Codemagic build;
- injects `capacitor.js` before app scripts on every HTML page;
- keeps the official `@capacitor-firebase/authentication` package and native plugin registration;
- keeps Google provider configuration and the supplied Firebase project settings;
- removes the misleading "install latest APK" message for a missing bridge and reports the actual native-plugin issue.

Official Capacitor guidance for non-bundled web projects requires the Capacitor runtime script to be present before app JavaScript, and the Firebase Authentication plugin requires Google provider configuration plus `npx cap update`.
