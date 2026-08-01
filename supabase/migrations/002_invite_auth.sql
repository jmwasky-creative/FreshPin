-- Invite-only, password-based authentication support.
-- Run after 001_initial.sql in the Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$
begin
  create type public.invite_code_status as enum ('ACTIVE', 'DISABLED');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash char(64) not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  status public.invite_code_status not null default 'ACTIVE',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  disabled_at timestamptz,
  -- The invite is consumed in a BEFORE INSERT trigger on auth.users, so this
  -- foreign key is checked at transaction commit after the Auth row exists.
  used_by uuid references auth.users(id) on delete set null deferrable initially deferred,
  used_at timestamptz,
  expires_at timestamptz,
  check ((used_by is null) = (used_at is null)),
  check (expires_at is null or expires_at > created_at)
);

create index if not exists invite_codes_created_at_idx on public.invite_codes(created_at desc);
create index if not exists invite_codes_unused_active_idx
  on public.invite_codes(status, expires_at)
  where used_by is null;

alter table public.invite_codes enable row level security;
revoke all on table public.invite_codes from anon, authenticated;

-- This trigger consumes the code atomically and removes the raw code from
-- Auth metadata, so the application retains only its SHA-256 hash.
create or replace function public.consume_invite_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_code text;
begin
  -- Only a server-side Auth Admin API call can set app_metadata.role.
  if coalesce(new.raw_app_meta_data ->> 'role', '') <> 'admin' then
    normalized_code := upper(regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'invite_code', ''),
      '[^A-Za-z0-9]',
      '',
      'g'
    ));

    if normalized_code !~ '^FP[A-F0-9]{32}$' then
      raise exception 'A valid invitation code is required.' using errcode = 'P0001';
    end if;

    update public.invite_codes
    set used_by = new.id,
        used_at = now()
    where code_hash = encode(digest(normalized_code, 'sha256'), 'hex')
      and status = 'ACTIVE'
      and used_by is null
      and (expires_at is null or expires_at > now());

    if not found then
      raise exception 'Invitation code is invalid, disabled, expired, or already used.'
        using errcode = 'P0001';
    end if;
  end if;

  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'invite_code';
  return new;
end;
$$;

revoke execute on function public.consume_invite_for_new_user() from public;

drop trigger if exists consume_invite_on_auth_user_created on auth.users;
create trigger consume_invite_on_auth_user_created
before insert on auth.users
for each row execute function public.consume_invite_for_new_user();
