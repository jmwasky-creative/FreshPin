-- KeepSpot MVP schema
-- Run this migration in Supabase SQL Editor before starting the application.

create extension if not exists pgcrypto;

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(50) not null check (char_length(name) between 1 and 50),
  image_path text not null,
  image_width integer not null check (image_width > 0),
  image_height integer not null check (image_height > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  name varchar(50) not null check (char_length(name) between 1 and 50),
  x_ratio numeric(6,5) not null check (x_ratio between 0 and 1),
  y_ratio numeric(6,5) not null check (y_ratio between 0 and 1),
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete restrict,
  name varchar(100) not null check (char_length(name) between 1 and 100),
  image_path text,
  produce_date date,
  shelf_life_value integer check (shelf_life_value is null or shelf_life_value > 0),
  shelf_life_unit varchar(10) check (shelf_life_unit is null or shelf_life_unit in ('DAY','MONTH','YEAR')),
  expire_date date,
  remind_days_before integer not null default 3 check (remind_days_before between 0 and 365),
  source_raw_text text,
  status varchar(20) not null default 'ACTIVE' check (status in ('ACTIVE','USED','DISCARDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  reminder_kind varchar(30) not null check (reminder_kind in ('BEFORE_EXPIRE','EXPIRE_TODAY')),
  local_date date not null,
  send_status varchar(20) not null check (send_status in ('PENDING','SENT','FAILED')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, reminder_kind, local_date)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email varchar(255) not null,
  timezone varchar(50) not null default 'UTC',
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spaces_user_created_idx on public.spaces(user_id, created_at desc);
create index if not exists locations_space_idx on public.locations(space_id);
create index if not exists items_user_status_expire_idx on public.items(user_id, status, expire_date);
create index if not exists items_location_idx on public.items(location_id);
create index if not exists reminder_logs_lookup_idx on public.reminder_logs(item_id, local_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_items_updated_at on public.items;
create trigger set_items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

drop trigger if exists set_reminder_logs_updated_at on public.reminder_logs;
create trigger set_reminder_logs_updated_at
before update on public.reminder_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.spaces enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.user_settings enable row level security;

create policy "spaces_select_own" on public.spaces
for select to authenticated using ((select auth.uid()) = user_id);
create policy "spaces_insert_own" on public.spaces
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "spaces_update_own" on public.spaces
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "spaces_delete_own" on public.spaces
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "locations_select_own" on public.locations
for select to authenticated using ((select auth.uid()) = user_id);
create policy "locations_insert_own" on public.locations
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.spaces s
    where s.id = space_id and s.user_id = (select auth.uid())
  )
);
create policy "locations_update_own" on public.locations
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "locations_delete_own" on public.locations
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "items_select_own" on public.items
for select to authenticated using ((select auth.uid()) = user_id);
create policy "items_insert_own" on public.items
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.locations l
    where l.id = location_id and l.user_id = (select auth.uid())
  )
);
create policy "items_update_own" on public.items
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "items_delete_own" on public.items
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "reminder_logs_select_own" on public.reminder_logs
for select to authenticated using ((select auth.uid()) = user_id);

create policy "user_settings_select_own" on public.user_settings
for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_settings_insert_own" on public.user_settings
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_settings_update_own" on public.user_settings
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('space-images', 'space-images', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('item-images', 'item-images', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "storage_select_own_images" on storage.objects
for select to authenticated
using (
  bucket_id in ('space-images','item-images')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage_insert_own_images" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('space-images','item-images')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage_delete_own_images" on storage.objects
for delete to authenticated
using (
  bucket_id in ('space-images','item-images')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
