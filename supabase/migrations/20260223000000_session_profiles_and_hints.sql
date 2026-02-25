-- Session display names (one row per session)
create table if not exists public.session_profiles (
  session_id text primary key,
  display_name text,
  updated_at timestamptz not null default now()
);

-- Hints used (1-3) when run ended
alter table public.runs add column if not exists hints_used integer;

alter table public.session_profiles enable row level security;
create policy "Allow all for session_profiles" on public.session_profiles for all using (true) with check (true);
