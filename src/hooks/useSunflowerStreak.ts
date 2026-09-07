'use client';

import { useState, useEffect, useCallback } from 'react';
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SUNFLOWER] Fetching & deriving streak data for couple:', couple.id);
      }

      // 1. Parallel fetch from love_messages, moods, memories
      const [msgRes, moodRes, memRes] = await Promise.all([
        supabase
          .from('love_messages')
          .select('sender_id, created_at, type')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false })
          .limit(300),
        supabase
          .from('moods')
          .select('user_id, created_at, mood_date')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('memories')
          .select('created_by, created_at, memory_date')
          .eq('couple_id', couple.id)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      // Also attempt fetching from couple_daily_activities if present
      let cdaData: any[] = [];
      try {
        const { data } = await supabase
          .from('couple_daily_activities')
          .select('*')
          .eq('couple_id', couple.id);
        if (data) cdaData = data;
      } catch {
        // Table may not exist, ignore
      }

      // Try fetching couple_streaks for stored water tokens
      let storedWaterTokens = 1;
      let storedStreakRow: any = null;
      try {
        const { data: sRow } = await supabase
          .from('couple_streaks')
          .select('*')
          .eq('couple_id', couple.id)
          .maybeSingle();
        if (sRow) {
          storedStreakRow = sRow;
          storedWaterTokens = sRow.water_tokens ?? 1;
        }
      } catch {
        // Table may not exist, ignore
      }

      // Map of dateKey (YYYY-MM-DD in Vietnam TZ) -> Map<userId, DailyActivity>
      const dateUserMap: Record<string, Record<string, DailyActivity>> = {};

      const partnerId = partnerProfile?.id;

      // Process messages
      (msgRes.data || []).forEach((m) => {
        const dk = getVietnamDateString(m.created_at);
        if (!dateUserMap[dk]) dateUserMap[dk] = {};
        if (!dateUserMap[dk][m.sender_id]) {
          dateUserMap[dk][m.sender_id] = {
            id: `msg-${m.created_at}`,
            couple_id: couple.id,
            user_id: m.sender_id,
            activity_date: dk,
            activity_type: m.type === 'custom' ? 'message' : 'quick_message',
            created_at: m.created_at,
          };
        }
      });

      // Process moods
      (moodRes.data || []).forEach((m) => {
        const dk = m.mood_date || getVietnamDateString(m.created_at);
        if (!dateUserMap[dk]) dateUserMap[dk] = {};
        if (!dateUserMap[dk][m.user_id]) {
          dateUserMap[dk][m.user_id] = {
            id: `mood-${m.created_at}`,
            couple_id: couple.id,
            user_id: m.user_id,
            activity_date: dk,
            activity_type: 'mood',
            created_at: m.created_at,
          };
        }
      });

      // Process memories
      (memRes.data || []).forEach((m) => {
        const dk = m.memory_date || getVietnamDateString(m.created_at);
        if (!dateUserMap[dk]) dateUserMap[dk] = {};
        if (!dateUserMap[dk][m.created_by]) {
          dateUserMap[dk][m.created_by] = {
            id: `mem-${m.created_at}`,
            couple_id: couple.id,
            user_id: m.created_by,
            activity_date: dk,
            activity_type: 'memory',
            created_at: m.created_at,
          };
        }
      });

      // Process couple_daily_activities
      cdaData.forEach((act) => {
        const dk = act.activity_date;
        if (!dateUserMap[dk]) dateUserMap[dk] = {};
        if (!dateUserMap[dk][act.user_id]) {
          dateUserMap[dk][act.user_id] = {
            id: act.id || `cda-${act.created_at}`,
            couple_id: couple.id,
            user_id: act.user_id,
            activity_date: dk,
            activity_type: act.activity_type || 'message',
            created_at: act.created_at || new Date().toISOString(),
          };
        }
      });

      // Extract today activities
      const todayUserMap = dateUserMap[todayDateStr] || {};
      const myAct = todayUserMap[user.id] || null;
      let partnerAct: DailyActivity | null = null;

      if (partnerId && todayUserMap[partnerId]) {
        partnerAct = todayUserMap[partnerId];
      } else {
        // Find any other user in todayUserMap who is not current user
        const otherUserId = Object.keys(todayUserMap).find((id) => id !== user.id);
        if (otherUserId) partnerAct = todayUserMap[otherUserId];
      }

      setMyActivityToday(myAct);
      setPartnerActivityToday(partnerAct);

      // Extract flat list of past 30 days activities for calendar grid
      const allActsList: DailyActivity[] = [];
      Object.values(dateUserMap).forEach((uMap) => {
        Object.values(uMap).forEach((act) => allActsList.push(act));
      });
      setPast30DaysActivities(allActsList);

      // --- CALCULATE STREAK ---
      // A day is completed if at least 2 distinct users have activity
      const isDateCompleted = (dk: string) => {
        const uMap = dateUserMap[dk];
        if (!uMap) return false;
        const activeUsers = Object.keys(uMap);
        return activeUsers.length >= 2;
      };

      // Generate date keys for calculation
      const todayDateObj = new Date();
      const yesterdayDateObj = new Date();
      yesterdayDateObj.setDate(todayDateObj.getDate() - 1);
      const yesterdayDateStr = getVietnamDateString(yesterdayDateObj);

      let currentStreak = 0;

      // 1. Check if today is completed
      const todayCompleted = isDateCompleted(todayDateStr);

      if (todayCompleted) {
        currentStreak = 1;
        // Count backwards from yesterday
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);
        while (true) {
          const dk = getVietnamDateString(checkDate);
          if (isDateCompleted(dk)) {
            currentStreak += 1;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      } else {
        // Today is not completed yet -> Check if yesterday was completed
        const yesterdayCompleted = isDateCompleted(yesterdayDateStr);
        if (yesterdayCompleted) {
          currentStreak = 1;
          let checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - 2);
          while (true) {
            const dk = getVietnamDateString(checkDate);
            if (isDateCompleted(dk)) {
              currentStreak += 1;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        } else {
          currentStreak = 0;
        }
      }

      // Compute max_streak across all history dates
      const allDates = Object.keys(dateUserMap).sort();
      let maxStreak = 0;
      let tempStreak = 0;

      if (allDates.length > 0) {
        // Find consecutive range of completed dates
        for (let i = 0; i < allDates.length; i++) {
          if (isDateCompleted(allDates[i])) {
            tempStreak += 1;
            maxStreak = Math.max(maxStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak, storedStreakRow?.max_streak || 0);

      // Check if yesterday was missed (for rescue water popup)
      const yesterdayCompleted = isDateCompleted(yesterdayDateStr);
      const pastDates = allDates.filter((d) => d < yesterdayDateStr);
      const hasPriorActivity = pastDates.some((d) => isDateCompleted(d));

      if (!yesterdayCompleted && hasPriorActivity && currentStreak === 0) {
        setIsYesterdayMissed(true);
      } else {
        setIsYesterdayMissed(false);
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('[SUNFLOWER] todayStatus:', { myAct: !!myAct, partnerAct: !!partnerAct });
        console.log('[SUNFLOWER] currentStreak:', currentStreak, 'maxStreak:', maxStreak);
      }

      setStreakData({
        id: storedStreakRow?.id || 'derived-streak',
        couple_id: couple.id,
        current_streak: currentStreak,
        max_streak: maxStreak,
        water_tokens: storedWaterTokens,
        last_calculated_date: todayDateStr,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[SUNFLOWER] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [couple?.id, user?.id, partnerProfile?.id, supabase, todayDateStr]);

  useEffect(() => {
    fetchStreakData();
  }, [fetchStreakData]);

  // Supabase Realtime Listener across all activity tables
  useEffect(() => {
    if (!couple?.id) return;

    const channelName = `sunflower-realtime-${couple.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_messages', filter: `couple_id=eq.${couple.id}` },
        () => {
          if (process.env.NODE_ENV !== 'production') console.log('[SUNFLOWER Realtime] love_messages change detected');
          fetchStreakData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moods', filter: `couple_id=eq.${couple.id}` },
        () => {
          if (process.env.NODE_ENV !== 'production') console.log('[SUNFLOWER Realtime] moods change detected');
          fetchStreakData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memories', filter: `couple_id=eq.${couple.id}` },
        () => {
          if (process.env.NODE_ENV !== 'production') console.log('[SUNFLOWER Realtime] memories change detected');
          fetchStreakData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_daily_activities', filter: `couple_id=eq.${couple.id}` },
        () => {
          if (process.env.NODE_ENV !== 'production') console.log('[SUNFLOWER Realtime] couple_daily_activities change detected');
          fetchStreakData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_streaks', filter: `couple_id=eq.${couple.id}` },
        () => {
          if (process.env.NODE_ENV !== 'production') console.log('[SUNFLOWER Realtime] couple_streaks change detected');
          fetchStreakData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id, supabase, fetchStreakData]);

  // Register Activity Helper
  const registerActivity = async (type: ActivityType) => {
    if (!couple?.id || !user?.id) return;
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[SUNFLOWER] record activity: user=${user.id}, date=${todayDateStr}, type=${type}`);
      }

      // Try inserting into couple_daily_activities table if it exists
      await supabase
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

      await fetchStreakData();
    } catch {
      // Table may not exist yet, fetchStreakData will still derive from messages/moods/memories
      fetchStreakData();
    }
  };

  // Consume 1 Rescue Water Token
  const consumeRescueWater = async () => {
    if (!couple?.id || streakData.water_tokens <= 0) return false;

    try {
      const newWater = Math.max(0, streakData.water_tokens - 1);
      await supabase
        .from('couple_streaks')
        .update({ water_tokens: newWater })
        .eq('couple_id', couple.id);

      setIsYesterdayMissed(false);
      await fetchStreakData();
      return true;
    } catch (err) {
      console.error('[SUNFLOWER] Consume water error:', err);
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
