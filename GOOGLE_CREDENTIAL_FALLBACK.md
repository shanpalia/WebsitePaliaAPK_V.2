# Google Credential Manager fallback

Android Google sign-in now follows the documented Credential Manager flow:
1. Request previously authorized Google accounts first.
2. If Android returns `NoCredentialException`, retry automatically with `setFilterByAuthorizedAccounts(false)` so a new Google account can be selected.
3. The returned Google ID token is passed back to the web layer for Firebase authentication.

The Web Client ID remains the OAuth client ID used by `setServerClientId`.
