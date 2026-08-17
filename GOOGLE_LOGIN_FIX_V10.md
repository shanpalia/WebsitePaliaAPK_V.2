# Google Login Fix v10

The previous build bundled a second Capacitor core into a plain HTML Firebase bridge. v10 removes that duplicate runtime. Capacitor now registers `@capacitor-firebase/authentication` natively during `npx cap sync android`, and the web page accesses `window.Capacitor.Plugins.FirebaseAuthentication`.

After native Google sign-in, the native Firebase ID token is exchanged into the Firebase JavaScript Auth session using `GoogleAuthProvider.credential(...)`, so `auth.currentUser` is populated for the rest of the app and login-protected downloads work.
