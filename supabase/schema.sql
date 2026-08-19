create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text not null unique,
  full_name text,
  team_leader text,
  role text,
  cohort_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.team_leaders (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.progress_items (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null,
  completed_at timestamptz not null default now(),
  primary key (profile_id, item_key)
);

create table if not exists public.quiz_attempts (
  id uuid primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quiz_slug text not null,
  score integer not null check (score >= 0),
  max_score integer not null check (max_score > 0),
  passed boolean not null,
  submitted_at timestamptz not null default now()
);

create index if not exists quiz_attempts_profile_slug
  on public.quiz_attempts (profile_id, quiz_slug);


create table if not exists public.drill_results (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  drill_id text not null,
  status text not null,
  score integer,
  max_score integer,
  updated_at timestamptz not null default now(),
  primary key (profile_id, drill_id)
);


create table if not exists public.exercise_submissions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  exercise_key text not null,
  body text not null,
  submitted_at timestamptz not null default now(),
  primary key (profile_id, exercise_key)
);

create table if not exists public.app_state (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  last_visited_day integer not null default 1,
  avatar jsonb,
  updated_at timestamptz not null default now()
);


alter table public.app_state add column if not exists avatar jsonb;
alter table public.profiles add column if not exists team_leader text;
alter table public.profiles add column if not exists role text;
alter table public.team_leaders enable row level security;
alter table public.profiles enable row level security;
alter table public.progress_items enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.drill_results enable row level security;
alter table public.exercise_submissions enable row level security;
alter table public.app_state enable row level security;
