# PaliaAPK HUB Google Redirect Login

Google login uses Firebase Web Authentication redirect. The native Capacitor Firebase Authentication plugin is intentionally not used for login.

Flow: Continue with Google -> Google account selection -> return to PaliaAPK HUB -> Firebase session -> requested page.

Email/password login remains enabled.

Firebase Console requirements:
- Authentication -> Sign-in providers -> Google: Enabled.
- Authentication -> Settings -> Authorized domains: add the production website domain used by the web version of PaliaAPK HUB.

The APK uses the same Firebase Web Auth configuration as the website.
