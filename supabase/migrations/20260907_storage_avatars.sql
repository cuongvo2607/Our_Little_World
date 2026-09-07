-- 1. Create 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Create 'couple-memories' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('couple-memories', 'couple-memories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Storage Policies for 'avatars' bucket
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated Upload Avatars" ON storage.objects;
CREATE POLICY "Authenticated Upload Avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Update Avatars" ON storage.objects;
CREATE POLICY "Authenticated Update Avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Delete Avatars" ON storage.objects;
CREATE POLICY "Authenticated Delete Avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 4. Storage Policies for 'couple-memories' bucket
DROP POLICY IF EXISTS "Public Read Couple Memories" ON storage.objects;
CREATE POLICY "Public Read Couple Memories"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'couple-memories');

DROP POLICY IF EXISTS "Authenticated Upload Couple Memories" ON storage.objects;
CREATE POLICY "Authenticated Upload Couple Memories"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'couple-memories' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Update Couple Memories" ON storage.objects;
CREATE POLICY "Authenticated Update Couple Memories"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'couple-memories' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Delete Couple Memories" ON storage.objects;
CREATE POLICY "Authenticated Delete Couple Memories"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'couple-memories' AND auth.role() = 'authenticated');
