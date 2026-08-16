-- PaliaAPK HUB: real catalog notifications
-- Run this once in Supabase SQL Editor.

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  type text not null check (type in ('new_app','app_update')),
  title text not null,
  message text not null,
  previous_version text,
  new_version text,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_created_at_idx
  on public.app_notifications(created_at desc);
create index if not exists app_notifications_app_id_idx
  on public.app_notifications(app_id);

alter table public.app_notifications enable row level security;

-- Public catalog notifications can be read by website visitors.
drop policy if exists "Public can read app notifications" on public.app_notifications;
create policy "Public can read app notifications"
on public.app_notifications
for select
using (true);

-- Trigger function keeps apps.previous_version/update_available automatic and creates a real notification row.
create or replace function public.handle_app_catalog_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- New apps always start with no update flag.
    new.previous_version := null;
    new.update_available := false;

    insert into public.app_notifications(app_id, type, title, message, previous_version, new_version)
    values (
      new.id,
      'new_app',
      'New App Added',
      coalesce(new.name, 'New App') ||
        case when nullif(new.version, '') is not null then ' v' || new.version else '' end ||
        ' has been added to PaliaAPK HUB.',
      null,
      new.version
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if coalesce(old.version, '') is distinct from coalesce(new.version, '') then
      new.previous_version := old.version;
      new.update_available := true;

      insert into public.app_notifications(app_id, type, title, message, previous_version, new_version)
      values (
        new.id,
        'app_update',
        'App Updated',
        coalesce(new.name, 'App') ||
          ' updated to v' || coalesce(new.version, 'unknown') ||
          case when nullif(old.version, '') is not null then ' (Previous: v' || old.version || ')' else '' end,
        old.version,
        new.version
      );
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apps_catalog_notification on public.apps;
create trigger trg_apps_catalog_notification
before insert or update of version on public.apps
for each row
execute function public.handle_app_catalog_notification();

-- If an existing app is updated without changing version, its current notification state is preserved.
