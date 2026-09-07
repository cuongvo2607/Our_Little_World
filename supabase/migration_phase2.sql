-- =========================================================
-- OUR LITTLE WORLD - PHASE 2 MIGRATION & STORAGE POLICIES
-- =========================================================

-- 1. Create Storage Bucket for User Avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- STORAGE POLICIES FOR AVATARS BUCKET
-- Allow users to upload their own avatar into folder avatars/{user_id}/
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read for avatars
create policy "Public read access for avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 2. COUPLES UPDATE POLICY (Allow members to edit start_date and name)
drop policy if exists "Couple members can update their couple" on public.couples;
create policy "Couple members can update their couple"
  on public.couples for update
  using (id = public.get_auth_user_couple_id())
  with check (id = public.get_auth_user_couple_id());

-- 3. Ensure profiles update policy strictly checks user_id
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
