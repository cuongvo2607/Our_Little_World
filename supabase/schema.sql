-- =========================================================
-- OUR LITTLE WORLD - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- =========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  birthday date,
  created_at timestamptz default now()
);

-- Auto-create profile trigger on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. COUPLES TABLE
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  invite_code text unique not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- 3. COUPLE_MEMBERS TABLE
create table if not exists public.couple_members (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  constraint unique_couple_user unique (couple_id, user_id)
);

-- Ensure a user can only be in one couple & max 2 users per couple trigger
create or replace function public.validate_couple_membership()
returns trigger as $$
declare
  member_count integer;
  existing_couple uuid;
begin
  -- Check if user is already in another couple
  select couple_id into existing_couple 
  from public.couple_members 
  where user_id = new.user_id;

  if existing_couple is not null then
    raise exception 'User is already a member of a couple';
  end if;

  -- Check max 2 members constraint
  select count(*) into member_count 
  from public.couple_members 
  where couple_id = new.couple_id;

  if member_count >= 2 then
    raise exception 'This couple already has maximum (2) members';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_couple_membership on public.couple_members;
create trigger enforce_couple_membership
  before insert on public.couple_members
  for each row execute function public.validate_couple_membership();

-- HELPER FUNCTION: Get couple_id for current authenticated user
create or replace function public.get_auth_user_couple_id()
returns uuid as $$
  select couple_id from public.couple_members where user_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- 4. MEMORIES TABLE
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  memory_date date not null,
  image_url text not null,
  created_at timestamptz default now()
);

-- 5. MOODS TABLE
create table if not exists public.moods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mood text not null,
  note text,
  mood_date date not null default CURRENT_DATE,
  created_at timestamptz default now(),
  constraint unique_user_mood_date unique (user_id, mood_date)
);

-- 6. LOVE_MESSAGES TABLE
create table if not exists public.love_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'miss_you', -- miss_you, love_you, hug, custom
  message text,
  created_at timestamptz default now()
);

-- 7. BUCKET_LIST TABLE
create table if not exists public.bucket_list (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 8. TIMELINE_EVENTS TABLE
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  event_date date not null,
  image_url text,
  created_at timestamptz default now()
);

-- 9. TIME_CAPSULES TABLE
create table if not exists public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  created_at timestamptz default now()
);

-- 10. GARDEN_ITEMS TABLE
create table if not exists public.garden_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  item_type text not null,
  unlocked_by_event text not null,
  unlocked_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.memories enable row level security;
alter table public.moods enable row level security;
alter table public.love_messages enable row level security;
alter table public.bucket_list enable row level security;
alter table public.timeline_events enable row level security;
alter table public.time_capsules enable row level security;
alter table public.garden_items enable row level security;

-- PROFILES POLICIES
create policy "Users can view own profile or partner's profile"
  on public.profiles for select
  using (
    id = auth.uid() or
    id in (
      select cm.user_id from public.couple_members cm
      where cm.couple_id = public.get_auth_user_couple_id()
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- COUPLES POLICIES
create policy "Couple members can select their couple"
  on public.couples for select
  using (
    id = public.get_auth_user_couple_id() or
    invite_code is not null -- Allow querying couple by invite code during onboarding
  );

create policy "Authenticated users can create a couple"
  on public.couples for insert
  with check (auth.uid() is not null);

create policy "Couple members can update their couple"
  on public.couples for update
  using (id = public.get_auth_user_couple_id());

-- COUPLE_MEMBERS POLICIES
create policy "Members can view couple members"
  on public.couple_members for select
  using (
    user_id = auth.uid() or
    couple_id = public.get_auth_user_couple_id()
  );

create policy "Authenticated users can join a couple"
  on public.couple_members for insert
  with check (auth.uid() = user_id);

-- GENERIC POLICY HELPER FOR COUPLE-OWNED TABLES
-- Memories
create policy "Couple members can select memories"
  on public.memories for select using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can insert memories"
  on public.memories for insert with check (couple_id = public.get_auth_user_couple_id() and created_by = auth.uid());
create policy "Couple members can update memories"
  on public.memories for update using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can delete memories"
  on public.memories for delete using (couple_id = public.get_auth_user_couple_id());

-- Moods
create policy "Couple members can select moods"
  on public.moods for select using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can insert own mood"
  on public.moods for insert with check (couple_id = public.get_auth_user_couple_id() and user_id = auth.uid());
create policy "Couple members can update own mood"
  on public.moods for update using (couple_id = public.get_auth_user_couple_id() and user_id = auth.uid());

-- Love Messages
create policy "Couple members can select love messages"
  on public.love_messages for select using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can insert love messages"
  on public.love_messages for insert with check (couple_id = public.get_auth_user_couple_id() and sender_id = auth.uid());

-- Bucket List
create policy "Couple members can select bucket list"
  on public.bucket_list for select using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can insert bucket list items"
  on public.bucket_list for insert with check (couple_id = public.get_auth_user_couple_id() and created_by = auth.uid());
create policy "Couple members can update bucket list items"
  on public.bucket_list for update using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can delete bucket list items"
  on public.bucket_list for delete using (couple_id = public.get_auth_user_couple_id());

-- Timeline Events
create policy "Couple members can select timeline events"
  on public.timeline_events for select using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can insert timeline events"
  on public.timeline_events for insert with check (couple_id = public.get_auth_user_couple_id() and created_by = auth.uid());
create policy "Couple members can update timeline events"
  on public.timeline_events for update using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can delete timeline events"
  on public.timeline_events for delete using (couple_id = public.get_auth_user_couple_id());

-- Time Capsules
create policy "Couple members can select time capsules"
  on public.time_capsules for select using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can insert time capsules"
  on public.time_capsules for insert with check (couple_id = public.get_auth_user_couple_id() and created_by = auth.uid());
create policy "Couple members can update time capsules"
  on public.time_capsules for update using (couple_id = public.get_auth_user_couple_id());

-- Garden Items
create policy "Couple members can select garden items"
  on public.garden_items for select using (couple_id = public.get_auth_user_couple_id());
create policy "Couple members can insert garden items"
  on public.garden_items for insert with check (couple_id = public.get_auth_user_couple_id());

-- =========================================================
-- STORAGE BUCKET SETUP & POLICIES
-- =========================================================
insert into storage.buckets (id, name, public)
values ('couple-memories', 'couple-memories', false)
on conflict (id) do nothing;

create policy "Couple members can upload memory images"
  on storage.objects for insert
  with check (
    bucket_id = 'couple-memories' and
    (storage.foldername(name))[1] = 'couples' and
    (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  );

create policy "Couple members can view memory images"
  on storage.objects for select
  using (
    bucket_id = 'couple-memories' and
    (storage.foldername(name))[1] = 'couples' and
    (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  );

create policy "Couple members can delete memory images"
  on storage.objects for delete
  using (
    bucket_id = 'couple-memories' and
    (storage.foldername(name))[1] = 'couples' and
    (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  );
