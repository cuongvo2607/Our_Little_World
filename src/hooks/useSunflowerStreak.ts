'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCouple } from '@/context/CoupleContext';
import { ActivityType, DailyActivity, CoupleStreak, SunflowerStageLevel } from '@/types';
import { getVietnamDateString } from '@/lib/utils';

export function getSunflowerStage(streakDays: number): {
  level: SunflowerStageLevel;
  title: string;
  emoji: string;
} {
  if (streakDays >= 100) return { level: 'garden', title: 'Vườn hướng dương', emoji: '🌻🌻👑' };
  if (streakDays >= 30) return { level: 'multi_flowers', title: 'Nhiều hoa hơn', emoji: '🌻🌻' };
  if (streakDays >= 14) return { level: 'radiant', title: 'Rực rỡ', emoji: '🌻✨' };
  if (streakDays >= 7) return { level: 'blooming', title: 'Nở hoa', emoji: '🌻' };
  if (streakDays >= 3) return { level: 'growing', title: 'Lớn dần', emoji: '🌿' };
  if (streakDays >= 1) return { level: 'sprout', title: 'Nảy mầm', emoji: '🌱' };
  return { level: 'start', title: 'Mới bắt đầu', emoji: '🌱' };
}

export function useSunflowerStreak() {
  const { user, partnerProfile, couple } = useCouple();
  const [streakData, setStreakData] = useState<CoupleStreak>({
    id: 'local-streak',
    couple_id: couple?.id || '',
    current_streak: 0,
    max_streak: 0,
    water_tokens: 1,
    last_calculated_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [myActivityToday, setMyActivityToday] = useState<DailyActivity | null>(null);
  const [partnerActivityToday, setPartnerActivityToday] = useState<DailyActivity | null>(null);
  const [past30DaysActivities, setPast30DaysActivities] = useState<DailyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isYesterdayMissed, setIsYesterdayMissed] = useState(false);

  const supabase = createClient();
  const todayDateStr = getVietnamDateString();

  const fetchStreakData = useCallback(async () => {
    if (!couple?.id || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch or initialize Couple Streak
      let { data: streakRow } = await supabase
        .from('couple_streaks')
        .select('*')
        .eq('couple_id', couple.id)
        .maybeSingle();

      if (!streakRow) {
        // Try creating default row if table exists
        const { data: newRow } = await supabase
          .from('couple_streaks')
          .insert({
            couple_id: couple.id,
            current_streak: 0,
            max_streak: 0,
            water_tokens: 1,
          })
          .select()
          .maybeSingle();

        streakRow = newRow;
      }

      if (streakRow) {
        setStreakData(streakRow);
      }

      // 2. Fetch Today's Activities for both partners
      const { data: todayActs } = await supabase
        .from('couple_daily_activities')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('activity_date', todayDateStr);

      if (todayActs) {
        let myAct: DailyActivity | null = null;
        let partnerAct: DailyActivity | null = null;

        todayActs.forEach((act: DailyActivity) => {
          if (act.user_id === user.id) myAct = act;
          else partnerAct = act;
        });

        setMyActivityToday(myAct);
        setPartnerActivityToday(partnerAct);
      }

      // 3. Fetch past 30 days activities
      const { data: pastActs } = await supabase
        .from('couple_daily_activities')
        .select('*')
        .eq('couple_id', couple.id)
        .order('activity_date', { ascending: false })
        .limit(60);

      setPast30DaysActivities(pastActs || []);

      // 4. Check if yesterday was missed (for rescue water logic)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getVietnamDateString(yesterday);

      const yesterdayActs = (pastActs || []).filter(a => a.activity_date === yesterdayStr);
      const yesterdayCompleted = yesterdayActs.length >= 2;
      const isDayBeforeYesterdayActive = (pastActs || []).some(a => a.activity_date < yesterdayStr);

      if (!yesterdayCompleted && isDayBeforeYesterdayActive && (streakRow?.current_streak || 0) > 0) {
        setIsYesterdayMissed(true);
      } else {
        setIsYesterdayMissed(false);
      }
    } catch (err) {
      console.error('[SunflowerStreak] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [couple?.id, user?.id, supabase, todayDateStr]);

  useEffect(() => {
    fetchStreakData();
  }, [fetchStreakData]);

  // Realtime listener for activities and streak updates
  useEffect(() => {
    if (!couple?.id) return;

    const channelName = `sunflower-realtime-${couple.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_daily_activities', filter: `couple_id=eq.${couple.id}` },
        () => fetchStreakData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_streaks', filter: `couple_id=eq.${couple.id}` },
        () => fetchStreakData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id, supabase, fetchStreakData]);

  // Helper to register an activity for current user today
  const registerActivity = async (type: ActivityType) => {
    if (!couple?.id || !user?.id) return;

    try {
      // Upsert daily activity for current user
      const { error } = await supabase
        .from('couple_daily_activities')
        .upsert(
          {
            couple_id: couple.id,
            user_id: user.id,
            activity_date: todayDateStr,
            activity_type: type,
          },
          { onConflict: 'couple_id, user_id, activity_date' }
        );

      if (error) console.warn('[SunflowerStreak] Upsert activity notice:', error.message);

      // Check if both completed today -> calculate & increment streak
      const { data: updatedActs } = await supabase
        .from('couple_daily_activities')
        .select('user_id')
        .eq('couple_id', couple.id)
        .eq('activity_date', todayDateStr);

      const uniqueUsers = new Set((updatedActs || []).map((a) => a.user_id));
      if (uniqueUsers.size >= 2) {
        // Both completed! Update current_streak
        const newStreak = (streakData.current_streak || 0) + 1;
        const newMax = Math.max(newStreak, streakData.max_streak || 0);

        await supabase
          .from('couple_streaks')
          .upsert(
            {
              couple_id: couple.id,
              current_streak: newStreak,
              max_streak: newMax,
              last_calculated_date: todayDateStr,
            },
            { onConflict: 'couple_id' }
          );
      }

      await fetchStreakData();
    } catch (err) {
      console.error('[SunflowerStreak] Register activity error:', err);
    }
  };

  // Consume 1 Rescue Water Token to preserve streak
  const consumeRescueWater = async () => {
    if (!couple?.id || streakData.water_tokens <= 0) return false;

    try {
      const newWater = Math.max(0, streakData.water_tokens - 1);
      await supabase
        .from('couple_streaks')
        .update({
          water_tokens: newWater,
        })
        .eq('couple_id', couple.id);

      setIsYesterdayMissed(false);
      await fetchStreakData();
      return true;
    } catch (err) {
      console.error('[SunflowerStreak] Consume water error:', err);
      return false;
    }
  };

  const isTodayCompleted = !!(myActivityToday && partnerActivityToday);
  const stage = getSunflowerStage(streakData.current_streak);

  return {
    streakData,
    myActivityToday,
    partnerActivityToday,
    past30DaysActivities,
    isTodayCompleted,
    isYesterdayMissed,
    stage,
    loading,
    registerActivity,
    consumeRescueWater,
    refreshStreak: fetchStreakData,
  };
}
