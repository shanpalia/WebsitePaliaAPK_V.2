# PaliaAPK HUB Updates Feature

- New apps start with `previous_version = null` and `update_available = false`.
- An existing app is considered updated when `update_available = true`, or when `previous_version` is present and differs from the current `version`.
- `updates.html` reads the live `apps` table from Supabase and shows only rows matching the update condition.
- Each update card shows old version → new version, update date, and an Update Now button.
- No fake/hard-coded update list is used.
