-- Memories media upgrade: private photo + video support
-- Run this in Supabase SQL Editor after backing up production data.

create extension if not exists "uuid-ossp";

alter table public.memories
  add column if not exists location text;

alter table public.memories
  alter column image_url drop not null;

create table if not exists public.memory_media (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  storage_path text not null,
  media_type text not null,
  mime_type text not null,
  file_size bigint not null,
  width integer,
  height integer,
  duration_seconds numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint memory_media_type_check check (media_type in ('image', 'video')),
  constraint memory_media_storage_path_unique unique (storage_path)
);

create index if not exists idx_memory_media_memory_id_sort
  on public.memory_media(memory_id, sort_order, created_at);

create index if not exists idx_memory_media_couple_id
  on public.memory_media(couple_id);

alter table public.memory_media enable row level security;

drop policy if exists "Couple members can select memory media" on public.memory_media;
create policy "Couple members can select memory media"
  on public.memory_media for select
  using (couple_id = public.get_auth_user_couple_id());

drop policy if exists "Couple members can insert memory media" on public.memory_media;
create policy "Couple members can insert memory media"
  on public.memory_media for insert
  with check (
    couple_id = public.get_auth_user_couple_id()
    and exists (
      select 1
      from public.memories m
      where m.id = memory_media.memory_id
        and m.couple_id = memory_media.couple_id
    )
  );

drop policy if exists "Couple members can update memory media" on public.memory_media;
create policy "Couple members can update memory media"
  on public.memory_media for update
  using (couple_id = public.get_auth_user_couple_id())
  with check (couple_id = public.get_auth_user_couple_id());

drop policy if exists "Couple members can delete memory media" on public.memory_media;
create policy "Couple members can delete memory media"
  on public.memory_media for delete
  using (couple_id = public.get_auth_user_couple_id());

insert into public.memory_media (
  memory_id,
  couple_id,
  storage_path,
  media_type,
  mime_type,
  file_size,
  sort_order
)
select
  m.id,
  m.couple_id,
  m.image_url,
  'image',
  case
    when lower(m.image_url) like '%.png' then 'image/png'
    when lower(m.image_url) like '%.webp' then 'image/webp'
    when lower(m.image_url) like '%.gif' then 'image/gif'
    else 'image/jpeg'
  end,
  0,
  0
from public.memories m
where m.image_url is not null
  and m.image_url <> ''
  and not exists (
    select 1
    from public.memory_media mm
    where mm.memory_id = m.id
      and mm.storage_path = m.image_url
  );

insert into storage.buckets (id, name, public)
values ('couple-memories', 'couple-memories', false)
on conflict (id) do update set public = false;

drop policy if exists "Public Read Couple Memories" on storage.objects;
drop policy if exists "Authenticated Upload Couple Memories" on storage.objects;
drop policy if exists "Authenticated Update Couple Memories" on storage.objects;
drop policy if exists "Authenticated Delete Couple Memories" on storage.objects;
drop policy if exists "Couple members can upload memory images" on storage.objects;
drop policy if exists "Couple members can view memory images" on storage.objects;
drop policy if exists "Couple members can delete memory images" on storage.objects;
drop policy if exists "Couple members can upload memory media" on storage.objects;
drop policy if exists "Couple members can view memory media" on storage.objects;
drop policy if exists "Couple members can update memory media" on storage.objects;
drop policy if exists "Couple members can delete memory media" on storage.objects;

create policy "Couple members can upload memory media"
  on storage.objects for insert
  with check (
    bucket_id = 'couple-memories'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  );

create policy "Couple members can view memory media"
  on storage.objects for select
  using (
    bucket_id = 'couple-memories'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  );

create policy "Couple members can update memory media"
  on storage.objects for update
  using (
    bucket_id = 'couple-memories'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  )
  with check (
    bucket_id = 'couple-memories'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  );

create policy "Couple members can delete memory media"
  on storage.objects for delete
  using (
    bucket_id = 'couple-memories'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'memories'
  ) then
    alter publication supabase_realtime add table public.memories;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'memory_media'
  ) then
    alter publication supabase_realtime add table public.memory_media;
  end if;
end $$;
