# PaliaAPK HUB Telegram Upload API

Brand new, production-ready ES Module Node.js, Express, and Telegram MTProto backend for uploading large APK files directly to Telegram channels using the official `telegram` package.

## Environment Variables

Set the following environment variables in Render or your `.env` file:

- `API_ID` - Telegram API ID from my.telegram.org
- `API_HASH` - Telegram API Hash from my.telegram.org
- `SESSION_STRING` - StringSession token generated via `telegram` package

- `CHANNEL_USERNAME` - Target Telegram channel username (e.g., `PaliaAPK` or `@PaliaAPK`)
- `PORT` - Port for server execution (defaults to 3000)



## Authenticated APK downloads

`GET /download-apk/:messageId` now requires a valid Firebase ID token.
Set `FIREBASE_WEB_API_KEY` in the Render environment variables to the same
Firebase Web API key used by the website. The website automatically attaches
a fresh token after login. Opening the Render download URL directly without
a logged-in Firebase session returns HTTP 401 and does not stream the APK.
