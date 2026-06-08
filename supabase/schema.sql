-- Execute this file in a new Supabase project owned by the organization.
-- Authentication is handled by Supabase Auth; application profiles and data
-- remain protected by row-level security.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.portal_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  owner_id uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_records_kind_idx on public.portal_records(kind);
alter table public.profiles enable row level security;
alter table public.portal_records enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles read own or admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "profiles admin update"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

create policy "records authenticated read"
on public.portal_records for select
to authenticated
using (true);

create policy "records authenticated insert"
on public.portal_records for insert
to authenticated
with check (owner_id = auth.uid() or public.is_admin());

create policy "records owner or admin update"
on public.portal_records for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "records owner or admin delete"
on public.portal_records for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());

-- Events expose only active public-registration metadata to anonymous users.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  title text not null,
  event_date date not null,
  event_time time,
  modality text not null default 'Presencial',
  institution text not null default '',
  place text not null default '',
  description text not null default '',
  active boolean not null default true,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "active events are publicly readable"
on public.events for select
to anon, authenticated
using (active or auth.uid() is not null);

create policy "authenticated can create events"
on public.events for insert
to authenticated
with check (owner_id = auth.uid() or public.is_admin());

create policy "event owner or admin can update"
on public.events for update
to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "event owner or admin can delete"
on public.events for delete
to authenticated
using (owner_id = auth.uid() or public.is_admin());

-- Public attendance uses a dedicated table and a restricted insert policy.
create table if not exists public.event_attendance (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  email text not null,
  job_title text not null default '',
  institution text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

alter table public.event_attendance enable row level security;

create policy "public can register attendance"
on public.event_attendance for insert
to anon, authenticated
with check (
  length(full_name) between 2 and 150
  and position('@' in email) > 1
  and exists (select 1 from public.events where id = event_id and active)
);

create policy "authenticated can read attendance"
on public.event_attendance for select
to authenticated
using (true);

create policy "admin can delete attendance"
on public.event_attendance for delete
to authenticated
using (public.is_admin());
