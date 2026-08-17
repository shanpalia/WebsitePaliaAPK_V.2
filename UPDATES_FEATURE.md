# PaliaAPK HUB Updates Feature

- New apps start with `previous_version = null` and `update_available = false`.
- Editing an existing app and changing its version records the old version in `previous_version` and sets `update_available = true`.
- `updates.html` lists all rows where `update_available = true`, newest first.
- Home page search uses the full Supabase app cache and supports name/category/description/developer/package searches.
