-- Couple music playlist: private audio storage + metadata table.

create table if not exists public.couple_songs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist text not null default 'Nhạc của chúng mình',
  audio_path text not null,
  cover_path text,
  duration numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint couple_songs_audio_path_unique unique (audio_path)
);

create index if not exists idx_couple_songs_couple_sort
  on public.couple_songs(couple_id, sort_order, created_at);

alter table public.couple_songs enable row level security;

drop policy if exists "Couple members can select songs" on public.couple_songs;
create policy "Couple members can select songs"
  on public.couple_songs for select
  using (couple_id = public.get_auth_user_couple_id());

drop policy if exists "Couple members can insert songs" on public.couple_songs;
create policy "Couple members can insert songs"
  on public.couple_songs for insert
  with check (
    couple_id = public.get_auth_user_couple_id()
    and uploaded_by = auth.uid()
  );

drop policy if exists "Couple members can update songs" on public.couple_songs;
create policy "Couple members can update songs"
  on public.couple_songs for update
  using (couple_id = public.get_auth_user_couple_id())
  with check (couple_id = public.get_auth_user_couple_id());

drop policy if exists "Couple members can delete songs" on public.couple_songs;
create policy "Couple members can delete songs"
  on public.couple_songs for delete
  using (couple_id = public.get_auth_user_couple_id());

insert into storage.buckets (id, name, public)
values ('couple-music', 'couple-music', false)
on conflict (id) do update set public = false;

drop policy if exists "Couple members can upload music" on storage.objects;
drop policy if exists "Couple members can view music" on storage.objects;
drop policy if exists "Couple members can update music" on storage.objects;
drop policy if exists "Couple members can delete music" on storage.objects;

create policy "Couple members can upload music"
  on storage.objects for insert
  with check (
    bucket_id = 'couple-music'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
    and (storage.foldername(name))[3] = 'music'
  );

create policy "Couple members can view music"
  on storage.objects for select
  using (
    bucket_id = 'couple-music'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
    and (storage.foldername(name))[3] = 'music'
  );

create policy "Couple members can update music"
  on storage.objects for update
  using (
    bucket_id = 'couple-music'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
    and (storage.foldername(name))[3] = 'music'
  )
  with check (
    bucket_id = 'couple-music'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
    and (storage.foldername(name))[3] = 'music'
  );

create policy "Couple members can delete music"
  on storage.objects for delete
  using (
    bucket_id = 'couple-music'
    and (storage.foldername(name))[1] = 'couples'
    and (storage.foldername(name))[2] = public.get_auth_user_couple_id()::text
    and (storage.foldername(name))[3] = 'music'
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_songs'
  ) then
    alter publication supabase_realtime add table public.couple_songs;
  end if;
end $$;
