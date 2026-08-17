# PaliaAPK HUB changes

- Removed homepage notification bell.
- Removed homepage dark-mode toggle.
- Added a search icon in the header.
- Search icon opens a live app search panel backed by the Supabase app cache.
- Fixed login redirect so unauthenticated downloads return to the app page after Firebase login instead of directly opening an APK URL.
- Added safer local-only redirects and clearer Firebase authentication error messages.
- Capacitor Google authentication now checks both the plugin global and Capacitor.Plugins.FirebaseAuthentication.
