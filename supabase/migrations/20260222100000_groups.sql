-- Friend groups: share a code to compete on the same puzzle.
create table if not exists public.group_codes (
  code text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  code text not null references public.group_codes(code) on delete cascade,
  session_id text not null,
  joined_at timestamptz not null default now(),
  primary key (code, session_id)
);

alter table public.group_codes enable row level security;
alter table public.group_members enable row level security;

create policy "Allow all for group_codes" on public.group_codes for all using (true) with check (true);
create policy "Allow all for group_members" on public.group_members for all using (true) with check (true);
