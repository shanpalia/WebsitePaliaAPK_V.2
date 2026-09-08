# PaliaAPK HUB Website Update Bridge

This is an additive website-only update notification bridge. Existing pages, categories, styling and app data logic are left intact.

## What it does
- Reads `app_notifications` for the latest `app_update` notification mentioning PaliaAPK HUB.
- Reads the PaliaAPK HUB row from `apps` to get the live version and APK URL.
- Shows a small update notification on the homepage.
- The Open button first tries the Android deep link `paliaapkhub://update?...`.
- If the Android app does not handle that link, it falls back to the stored APK URL (or `downloads.html`).

## Important
The website can show the notification now, but an installed Android app must register the `paliaapkhub://` scheme for the Open button to launch the app. That small Android-side change is separate from this website ZIP.
