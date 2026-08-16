-- Sworn MVP schema. Paste into the Supabase SQL Editor and run once.
--
-- Three tables, nothing else: profile + why, oath schedule metadata, and the
-- meaningful behavioural events. Row-level security is the entire safety
-- model — every row is readable and writable only by the user it belongs to,
-- so the public anon key grants nothing by itself.
--
-- Deliberately absent: lapse note text (never leaves the device), Apple's
-- Screen Time tokens (device-bound; a new phone re-picks apps), raw quiz
-- answers, and any aggregated analytics (derived on device from events).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  behavior text check (behavior in ('porn', 'gambling', 'scrolling')),
  name text,
  why_text text,
  reasons int[] not null default '{}',
  goals int[] not null default '{}',
  triggers int[] not null default '{}',
  cost text,
  oath_at timestamptz,
  streak_since timestamptz,
  updated_at timestamptz not null default now()
);

create table public.oaths (
  user_id uuid not null references auth.users (id) on delete cascade,
  oath_id int not null,
  name text,
  lock_at text,
  unlock_at text,
  days int[] not null default '{}',
  enabled boolean not null default true,
  app_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, oath_id)
);

create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in (
    'protection_used', 'temptation_resisted', 'commitment_broken', 'protection_bypassed'
  )),
  at timestamptz not null,
  -- retries are idempotent: the same moment can only land once
  unique (user_id, type, at)
);

alter table public.profiles enable row level security;
alter table public.oaths enable row level security;
alter table public.events enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own oaths" on public.oaths
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own events" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
