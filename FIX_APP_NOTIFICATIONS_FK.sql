-- Run once in Supabase SQL Editor.
-- The current publish error is caused by a database trigger that writes to
-- app_notifications before/with an invalid apps.id. Remove those triggers.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tg.tgname
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE n.nspname='public'
      AND c.relname='apps'
      AND NOT tg.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%app_notifications%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.apps', r.tgname);
  END LOOP;
END $$;

-- Verify the FK points to the apps table. Do not create a BEFORE trigger.
-- Publish code inserts the notification only after the apps INSERT returns its id.
