-- Migration: Sunflower Streak (Chuỗi Hướng Dương 🌻)
-- Description: Creates couple_daily_activities and couple_streaks tables with RLS policies and Realtime publication

-- 1. Create couple_daily_activities table
CREATE TABLE IF NOT EXISTS public.couple_daily_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'message',
  source_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT couple_daily_activities_unique_user_date UNIQUE (couple_id, user_id, activity_date)
);

-- 2. Create couple_streaks table
CREATE TABLE IF NOT EXISTS public.couple_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE UNIQUE,
  current_streak INT NOT NULL DEFAULT 0,
  max_streak INT NOT NULL DEFAULT 0,
  water_tokens INT NOT NULL DEFAULT 1,
  last_calculated_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_cda_couple_date ON public.couple_daily_activities(couple_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_cda_user_id ON public.couple_daily_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_couple_streaks_couple_id ON public.couple_streaks(couple_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.couple_daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_streaks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for couple_daily_activities
DROP POLICY IF EXISTS "Users can view activities of their couple" ON public.couple_daily_activities;
CREATE POLICY "Users can view activities of their couple"
  ON public.couple_daily_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_daily_activities.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own activity in their couple" ON public.couple_daily_activities;
CREATE POLICY "Users can insert their own activity in their couple"
  ON public.couple_daily_activities FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_daily_activities.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own activity in their couple" ON public.couple_daily_activities;
CREATE POLICY "Users can update their own activity in their couple"
  ON public.couple_daily_activities FOR UPDATE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_daily_activities.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- 6. RLS Policies for couple_streaks
DROP POLICY IF EXISTS "Users can view streak of their couple" ON public.couple_streaks;
CREATE POLICY "Users can view streak of their couple"
  ON public.couple_streaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_streaks.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert streak row for their couple" ON public.couple_streaks;
CREATE POLICY "Users can insert streak row for their couple"
  ON public.couple_streaks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_streaks.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update streak row for their couple" ON public.couple_streaks;
CREATE POLICY "Users can update streak row for their couple"
  ON public.couple_streaks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.couple_members
      WHERE couple_members.couple_id = couple_streaks.couple_id
        AND couple_members.user_id = auth.uid()
    )
  );

-- 7. Add tables to Supabase Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'couple_daily_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_daily_activities;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'couple_streaks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_streaks;
  END IF;
END $$;
