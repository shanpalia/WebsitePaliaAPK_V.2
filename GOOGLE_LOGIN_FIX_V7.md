# PaliaAPK HUB Google Login v7

## Google login
- Uses the official `@capacitor-firebase/authentication` JavaScript entry point.
- The build bundles the official plugin JS against the Capacitor runtime injected by Android, avoiding a second `@capacitor/core` bridge.
- Android Google provider configuration remains enabled through `providers: ['google.com']`.
- Codemagic creates the Android project only after installing the Firebase Authentication plugin and then runs `npx cap update android` and `npx cap sync android`.
- `FIREBASE_GOOGLE_SERVICES_JSON` is written to `android/app/google-services.json` during the build.

## Broken X icons
The login page previously depended on the external Font Awesome CDN. In the Android WebView those font files could fail to load, which rendered the `<i>` icons as missing-glyph/X boxes. Font Awesome was removed from `user.html` and the login controls now use local, font-independent icons/spinners, so they do not depend on an external icon font.

## Firebase requirements
Firebase Console must have Google sign-in enabled, and the Android app must use package `com.shanpalia.paliaapkhub` with the correct SHA-1 certificate. The supplied `google-services.json` should be provided to Codemagic through `FIREBASE_GOOGLE_SERVICES_JSON` rather than committed to the repository.
