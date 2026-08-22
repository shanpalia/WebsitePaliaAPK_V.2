-- PaliaAPK HUB: fix app_notifications foreign-key publishing
-- Run this ONCE in Supabase SQL Editor.
-- It removes app-notification triggers on public.apps that try to insert
-- before the apps row exists, then installs an AFTER trigger.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, tg.tgname AS trigger_name
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'apps'
      AND NOT tg.tgisinternal
      AND pg_get_functiondef(p.oid) ILIKE '%app_notifications%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I',
      t.trigger_name, t.schema_name, t.table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_app_notification_after_apps_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cols text := '';
  vals text := '';
  sep text := '';
  kind text;
  ttl text;
  msg text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    kind := 'new';
    ttl := 'New App Added';
    msg := COALESCE(NEW.name::text, 'A new app is now available');
  ELSE
    IF COALESCE(OLD.version::text,'') = COALESCE(NEW.version::text,'') THEN
      RETURN NEW;
    END IF;
    kind := 'update';
    ttl := 'App Updated';
    msg := COALESCE(NEW.name::text, 'An app was updated');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='app_notifications' AND column_name='app_id') THEN
    cols := cols || 'app_id'; vals := vals || 'NEW_APP_ID'; sep := ',';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='app_notifications' AND column_name='type') THEN
    cols := cols || sep || 'type'; vals := vals || sep || 'NOTIF_TYPE'; sep := ',';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='app_notifications' AND column_name='title') THEN
    cols := cols || sep || 'title'; vals := vals || sep || 'NOTIF_TITLE'; sep := ',';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='app_notifications' AND column_name='message') THEN
    cols := cols || sep || 'message'; vals := vals || sep || 'NOTIF_MESSAGE'; sep := ',';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='app_notifications' AND column_name='is_read') THEN
    cols := cols || sep || 'is_read'; vals := vals || sep || 'FALSE'; sep := ',';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='app_notifications' AND column_name='created_at') THEN
    cols := cols || sep || 'created_at'; vals := vals || sep || 'NOW()'; sep := ',';
  END IF;

  IF cols = '' THEN
    RETURN NEW;
  END IF;

  vals := replace(vals,'NEW_APP_ID','($1)');
  vals := replace(vals,'NOTIF_TYPE','($2)');
  vals := replace(vals,'NOTIF_TITLE','($3)');
  vals := replace(vals,'NOTIF_MESSAGE','($4)');

  EXECUTE 'INSERT INTO public.app_notifications ('||cols||') VALUES ('||vals||')'
    USING NEW.id, kind, ttl, msg;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apps_create_notification ON public.apps;

CREATE TRIGGER trg_apps_create_notification
AFTER INSERT OR UPDATE OF version ON public.apps
FOR EACH ROW
EXECUTE FUNCTION public.create_app_notification_after_apps_change();
