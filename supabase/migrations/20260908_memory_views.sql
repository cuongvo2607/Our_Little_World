-- Memories read receipts and creator-only delete
-- Run this in Supabase SQL Editor after 20260908_memory_media.sql.

create table if not exists public.memory_views (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  constraint memory_views_unique_viewer unique (memory_id, viewer_id)
);

create index if not exists idx_memory_views_couple_id
  on public.memory_views(couple_id);

create index if not exists idx_memory_views_memory_id
  on public.memory_views(memory_id);

create index if not exists idx_memory_views_viewer_id
  on public.memory_views(viewer_id);

alter table public.memory_views enable row level security;

drop policy if exists "Couple members can select memory views" on public.memory_views;
create policy "Couple members can select memory views"
  on public.memory_views for select
  using (couple_id = public.get_auth_user_couple_id());

drop policy if exists "Couple members can insert own memory view" on public.memory_views;
create policy "Couple members can insert own memory view"
  on public.memory_views for insert
  with check (
    viewer_id = auth.uid()
    and couple_id = public.get_auth_user_couple_id()
    and exists (
      select 1
      from public.memories m
      where m.id = memory_views.memory_id
        and m.couple_id = memory_views.couple_id
        and m.created_by <> auth.uid()
    )
  );

drop policy if exists "Couple members can delete memories" on public.memories;
create policy "Memory creators can delete memories"
  on public.memories for delete
  using (
    couple_id = public.get_auth_user_couple_id()
    and created_by = auth.uid()
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'memory_views'
  ) then
    alter publication supabase_realtime add table public.memory_views;
  end if;
end $$;
