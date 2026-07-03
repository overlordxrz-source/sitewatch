-- ============================================================
-- SiteWatch Database Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor)
-- ============================================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. monitors
-- ============================================================
create table if not exists monitors (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  url             text not null,
  slug            text unique not null,
  check_interval  integer not null default 5,   -- minutes
  is_active       boolean not null default true,
  status          text not null default 'pending'
                    check (status in ('up','down','degraded','pending')),
  notify_emails   text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table monitors enable row level security;

create policy "Users manage their own monitors"
  on monitors for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 2. checks  (raw ping results)
-- ============================================================
create table if not exists checks (
  id              uuid primary key default uuid_generate_v4(),
  monitor_id      uuid not null references monitors(id) on delete cascade,
  checked_at      timestamptz not null default now(),
  status_code     integer,
  response_time   integer,                       -- milliseconds
  is_up           boolean not null,
  error           text
);

alter table checks enable row level security;

create policy "Users see their own checks"
  on checks for select
  using (
    exists (
      select 1 from monitors m
      where m.id = checks.monitor_id and m.user_id = auth.uid()
    )
  );

create policy "Service role inserts checks"
  on checks for insert
  with check (true);

create index on checks(monitor_id, checked_at desc);

-- ============================================================
-- 3. incidents
-- ============================================================
create table if not exists incidents (
  id              uuid primary key default uuid_generate_v4(),
  monitor_id      uuid not null references monitors(id) on delete cascade,
  started_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  cause           text
);

alter table incidents enable row level security;

create policy "Users see their own incidents"
  on incidents for select
  using (
    exists (
      select 1 from monitors m
      where m.id = incidents.monitor_id and m.user_id = auth.uid()
    )
  );

create policy "Service role manages incidents"
  on incidents for all
  with check (true);

-- ============================================================
-- 4. ssl_info
-- ============================================================
create table if not exists ssl_info (
  id              uuid primary key default uuid_generate_v4(),
  monitor_id      uuid not null references monitors(id) on delete cascade,
  checked_at      timestamptz not null default now(),
  valid           boolean not null,
  issuer          text,
  subject         text,
  expires_at      timestamptz,
  days_remaining  integer
);

alter table ssl_info enable row level security;

create policy "Users see their own ssl_info"
  on ssl_info for select
  using (
    exists (
      select 1 from monitors m
      where m.id = ssl_info.monitor_id and m.user_id = auth.uid()
    )
  );

create policy "Service role manages ssl_info"
  on ssl_info for all
  with check (true);

-- ============================================================
-- 5. domain_info
-- ============================================================
create table if not exists domain_info (
  id              uuid primary key default uuid_generate_v4(),
  monitor_id      uuid not null references monitors(id) on delete cascade,
  checked_at      timestamptz not null default now(),
  expires_at      timestamptz,
  days_remaining  integer,
  registrar       text
);

alter table domain_info enable row level security;

create policy "Users see their own domain_info"
  on domain_info for select
  using (
    exists (
      select 1 from monitors m
      where m.id = domain_info.monitor_id and m.user_id = auth.uid()
    )
  );

create policy "Service role manages domain_info"
  on domain_info for all
  with check (true);

-- ============================================================
-- 6. alerts_sent  (deduplication)
-- ============================================================
create table if not exists alerts_sent (
  id              uuid primary key default uuid_generate_v4(),
  monitor_id      uuid not null references monitors(id) on delete cascade,
  incident_id     uuid references incidents(id) on delete cascade,
  alert_type      text not null
                    check (alert_type in ('down','resolved','ssl_expiry','domain_expiry')),
  sent_at         timestamptz not null default now(),
  recipient       text not null
);

alter table alerts_sent enable row level security;

create policy "Service role manages alerts_sent"
  on alerts_sent for all
  with check (true);

-- ============================================================
-- Helper: auto-update updated_at on monitors
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger monitors_updated_at
  before update on monitors
  for each row execute procedure update_updated_at();
