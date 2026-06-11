-- Run this in your Supabase SQL Editor

-- submissions table
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_name text not null,
  submitter_team text not null,
  skill_name text not null,
  description text not null,
  potential_use_cases text not null,
  usage_instructions text not null,
  sharepoint_url text not null,
  created_at timestamptz default now()
);

-- scores table
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  judge_name text not null,
  submission_id uuid not null references submissions(id) on delete cascade,
  scores jsonb not null default '{}',
  notes jsonb not null default '{}',
  created_at timestamptz default now(),
  unique (judge_name, submission_id)
);

-- RLS: enable row level security
alter table submissions enable row level security;
alter table scores enable row level security;

-- submissions: anyone can insert and select
create policy "anon insert submissions" on submissions for insert to anon with check (true);
create policy "anon select submissions" on submissions for select to anon using (true);

-- scores: anyone can insert, select, and update
create policy "anon insert scores" on scores for insert to anon with check (true);
create policy "anon select scores" on scores for select to anon using (true);
create policy "anon update scores" on scores for update to anon using (true) with check (true);
