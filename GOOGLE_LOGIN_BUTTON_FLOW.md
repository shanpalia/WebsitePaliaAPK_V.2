# PaliaAPK HUB — Native Google Button Flow

Google login on Android now uses Android Credential Manager's explicit `GetSignInWithGoogleOption` button flow instead of `GetGoogleIdOption` authorized-account filtering.

This avoids the previous `28433 / cannot find matching credential` path caused by the authorized-account lookup.

The flow is:

Continue with Google -> native Android Google sign-in UI -> account selection -> Google ID token -> Firebase Auth.

The Web OAuth client ID configured in the native plugin must remain the Web application OAuth client ID. The release signing SHA-1 must also be registered in Firebase, and `google-services.json` should be refreshed after adding/changing the SHA-1.
