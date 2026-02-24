-- Runs: one row per (puzzle_id, session_id)
create table if not exists public.runs (
  puzzle_id text not null,
  session_id text not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  is_win boolean,
  guesses jsonb not null default '[]',
  best jsonb,
  primary key (puzzle_id, session_id)
);

-- Per-puzzle community aggregates (updated on each completion)
create table if not exists public.puzzle_aggregates (
  puzzle_id text primary key,
  total_runs int not null default 0,
  total_wins int not null default 0,
  guess_count_histogram jsonb not null default '{}',
  guess_counts jsonb not null default '{}',
  close_guess_counts jsonb not null default '{}',
  closest_guess_rank_buckets jsonb not null default '{}',
  crowd_map_guesses jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Allow service role / anon to read/write (restrict via RLS in production if you add auth)
alter table public.runs enable row level security;
alter table public.puzzle_aggregates enable row level security;

create policy "Allow all for runs" on public.runs for all using (true) with check (true);
create policy "Allow all for puzzle_aggregates" on public.puzzle_aggregates for all using (true) with check (true);
