-- MaDbotS Macro-Chief v2 Migration
-- Creates shared food_common/food_servings tables, per-user tables with strict RLS,
-- invite allowlist, usage tracking, and copy_common_foods_for_user(uid uuid).

create extension if not exists pgcrypto;

-- 1. Invite-only signup allowlist (server-only via service role)
create table if not exists public.allowed_emails (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;

-- 2. Shared common food database (read-only for authenticated users)
create table if not exists public.food_common (
  id uuid primary key default gen_random_uuid(),
  brand text,
  product text,
  name text unique not null,
  type text,
  kcal_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric,
  fibre_per_100g numeric,
  fat_per_100g numeric,
  sat_fat_per_100g numeric,
  serving_g numeric,
  serving_ml numeric,
  grams_per_piece numeric,
  aliases text[] not null default '{}',
  brand_sensitive boolean not null default false,
  verified boolean not null default false,
  source text,
  notes text
);
alter table public.food_common enable row level security;

drop policy if exists "food_common_select_authenticated" on public.food_common;
create policy "food_common_select_authenticated"
  on public.food_common
  for select
  to authenticated
  using (true);

-- 3. Serving size helpers linked to food_common.name (read-only for authenticated)
create table if not exists public.food_servings (
  id uuid primary key default gen_random_uuid(),
  food_name text not null references public.food_common(name) on delete cascade,
  serving_label text not null,
  grams numeric not null
);
alter table public.food_servings enable row level security;

drop policy if exists "food_servings_select_authenticated" on public.food_servings;
create policy "food_servings_select_authenticated"
  on public.food_servings
  for select
  to authenticated
  using (true);

-- Migrate legacy food_macros rows into food_common if food_macros exists
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'food_macros'
  ) then
    insert into public.food_common (
      name,
      type,
      kcal_per_100g,
      protein_per_100g,
      serving_g,
      serving_ml,
      grams_per_piece,
      verified,
      source,
      notes
    )
    select
      fm.name,
      case
        when fm.basis = '100ml' then 'liquid'
        when fm.basis = 'count' then 'count'
        else 'food'
      end,
      case
        when fm.basis in ('100g', '100ml') then coalesce(fm.kcal, 0)
        when coalesce(fm.serving_size, 0) > 0 then round((coalesce(fm.kcal, 0) * 100.0 / fm.serving_size)::numeric, 2)
        else coalesce(fm.kcal, 0)
      end,
      case
        when fm.basis in ('100g', '100ml') then coalesce(fm.protein, 0)
        when coalesce(fm.serving_size, 0) > 0 then round((coalesce(fm.protein, 0) * 100.0 / fm.serving_size)::numeric, 2)
        else coalesce(fm.protein, 0)
      end,
      case when fm.basis = '100g' then coalesce(fm.serving_size, 100) else null end,
      case when fm.basis = '100ml' then coalesce(fm.serving_size, 100) else null end,
      case when fm.basis = 'count' then coalesce(fm.serving_size, 1) else null end,
      true,
      coalesce(fm.source, 'Personal DB'),
      fm.notes
    from public.food_macros fm
    where fm.name is not null and length(trim(fm.name)) > 0
    on conflict (name) do nothing;
  end if;
end $$;

-- 4. Per-user foods table (copied from food_common + user additions)
create table if not exists public.user_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_common_id uuid references public.food_common(id) on delete set null,
  display_name text not null,
  kcal_per_100g numeric not null default 0,
  protein_per_100g numeric not null default 0,
  carbs_per_100g numeric,
  fibre_per_100g numeric,
  fat_per_100g numeric,
  serving_g numeric,
  serving_ml numeric,
  grams_per_piece numeric,
  source text not null check (source in ('common', 'brand', 'label', 'user_estimate', 'skill_add', 'search')),
  count_staple_protein boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, display_name)
);
alter table public.user_foods enable row level security;

drop policy if exists "user_foods_own_rows" on public.user_foods;
create policy "user_foods_own_rows"
  on public.user_foods
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5. User profiles (Macro-Chief v2 onboarding mode + quiz metrics)
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mode text check (mode in ('custom', 'default')),
  height_cm numeric,
  weight_kg numeric,
  age int,
  gender text,
  activity_level text,
  bmi numeric,
  bmr numeric,
  tdee numeric,
  diet_type text,
  allergies text,
  meals_per_day int,
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_own_rows" on public.user_profiles;
create policy "user_profiles_own_rows"
  on public.user_profiles
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 6. Meal plans
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_kcal numeric,
  total_kcal numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.meal_plans enable row level security;

drop policy if exists "meal_plans_own_rows" on public.meal_plans;
create policy "meal_plans_own_rows"
  on public.meal_plans
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 7. Meal plan items
create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.meal_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_no int not null,
  food_name text not null,
  qty numeric not null,
  unit text not null,
  grams numeric,
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric,
  fat_g numeric
);
alter table public.meal_plan_items enable row level security;

drop policy if exists "meal_plan_items_own_rows" on public.meal_plan_items;
create policy "meal_plan_items_own_rows"
  on public.meal_plan_items
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 8. Daily tracking (resets per IST date)
create table if not exists public.daily_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.meal_plans(id) on delete cascade,
  date_ist date not null,
  meal_no int not null,
  done boolean not null default false,
  unique (user_id, plan_id, date_ist, meal_no)
);
alter table public.daily_tracking enable row level security;

drop policy if exists "daily_tracking_own_rows" on public.daily_tracking;
create policy "daily_tracking_own_rows"
  on public.daily_tracking
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 9. Per-user enabled bots (marketplace)
create table if not exists public.user_bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_id text not null,
  added_at timestamptz not null default now(),
  unique (user_id, bot_id)
);
alter table public.user_bots enable row level security;

drop policy if exists "user_bots_own_rows" on public.user_bots;
create policy "user_bots_own_rows"
  on public.user_bots
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 10. Per-user daily usage limits (server writes only; users can read own row)
create table if not exists public.usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day_ist date not null,
  messages int not null default 0,
  primary key (user_id, day_ist)
);
alter table public.usage enable row level security;

drop policy if exists "usage_select_own" on public.usage;
create policy "usage_select_own"
  on public.usage
  for select
  to authenticated
  using (user_id = auth.uid());

-- 11. Daily user meal log (what the user actually ate today, separate from plan)
create table if not exists public.user_meal_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_ist date not null,
  meal_label text,
  food_name text not null,
  qty numeric not null,
  unit text not null,
  grams numeric,
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric,
  fat_g numeric,
  created_at timestamptz not null default now()
);
alter table public.user_meal_log enable row level security;

drop policy if exists "user_meal_log_own_rows" on public.user_meal_log;
create policy "user_meal_log_own_rows"
  on public.user_meal_log
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 12. Idempotent helper to copy food_common into user_foods for a user
create or replace function public.copy_common_foods_for_user(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_foods (
    user_id,
    food_common_id,
    display_name,
    kcal_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fibre_per_100g,
    fat_per_100g,
    serving_g,
    serving_ml,
    grams_per_piece,
    source,
    count_staple_protein
  )
  select
    uid,
    fc.id,
    fc.name,
    fc.kcal_per_100g,
    fc.protein_per_100g,
    fc.carbs_per_100g,
    fc.fibre_per_100g,
    fc.fat_per_100g,
    fc.serving_g,
    fc.serving_ml,
    fc.grams_per_piece,
    'common',
    false
  from public.food_common fc
  on conflict (user_id, display_name) do nothing;
end;
$$;
