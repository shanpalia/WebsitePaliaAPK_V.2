-- PaliaAPK HUB final DB fix
-- Verified schema: public.apps has NO slug column.
-- public.app_notifications.app_id is UUID and type accepts app_update.

-- 1) Remove old apps triggers/functions that still reference slug or
--    app_notifications, because they belong to the previous schema.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tg.tgname AS trigger_name,
           p.oid AS function_oid,
           n.nspname AS function_schema,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace tn ON tn.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE tn.nspname = 'public'
      AND c.relname = 'apps'
      AND NOT tg.tgisinternal
      AND (
        pg_get_functiondef(p.oid) ILIKE '%slug%'
        OR pg_get_functiondef(p.oid) ILIKE '%app_notifications%'
      )
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.apps', r.trigger_name);
  END LOOP;
END $$;

-- 2) Correct notification function. It uses only verified columns.
CREATE OR REPLACE FUNCTION public.palia_app_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.app_notifications
      (app_id, type, title, message, previous_version, new_version, created_at)
    VALUES
      (NEW.id,
       'app_update',
       'New App Added',
       COALESCE(NEW.name, 'New app is now available'),
       NULL,
       NEW.version,
       NOW());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.version,'') IS DISTINCT FROM COALESCE(NEW.version,'') THEN
    INSERT INTO public.app_notifications
      (app_id, type, title, message, previous_version, new_version, created_at)
    VALUES
      (NEW.id,
       'app_update',
       'App Updated',
       COALESCE(NEW.name, 'App') || ' updated to v' || COALESCE(NEW.version,''),
       OLD.version,
       NEW.version,
       NOW());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS palia_app_notification_trigger ON public.apps;

CREATE TRIGGER palia_app_notification_trigger
AFTER INSERT OR UPDATE OF version ON public.apps
FOR EACH ROW
EXECUTE FUNCTION public.palia_app_notification();
