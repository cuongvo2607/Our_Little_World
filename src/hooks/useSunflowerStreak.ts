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
    id: 'derived-streak',
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
        console.log('[SUNFLOWER] Deriving streak data for couple:', couple.id);
      }

      // Parallel fetch from love_messages, moods, memories (100% existing DB tables)
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

      // Extract today activities
      const todayUserMap = dateUserMap[todayDateStr] || {};
      const myAct = todayUserMap[user.id] || null;
      let partnerAct: DailyActivity | null = null;

      if (partnerId && todayUserMap[partnerId]) {
        partnerAct = todayUserMap[partnerId];
      } else {
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
      const isDateCompleted = (dk: string) => {
        const uMap = dateUserMap[dk];
        if (!uMap) return false;
        const activeUsers = Object.keys(uMap);
        return activeUsers.length >= 2;
      };

      const todayDateObj = new Date();
      const yesterdayDateObj = new Date();
      yesterdayDateObj.setDate(todayDateObj.getDate() - 1);
      const yesterdayDateStr = getVietnamDateString(yesterdayDateObj);

      let currentStreak = 0;
      const todayCompleted = isDateCompleted(todayDateStr);

      if (todayCompleted) {
        currentStreak = 1;
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
        for (let i = 0; i < allDates.length; i++) {
          if (isDateCompleted(allDates[i])) {
            tempStreak += 1;
            maxStreak = Math.max(maxStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }
      }
      maxStreak = Math.max(maxStreak, currentStreak);

      const yesterdayCompleted = isDateCompleted(yesterdayDateStr);
      const pastDates = allDates.filter((d) => d < yesterdayDateStr);
      const hasPriorActivity = pastDates.some((d) => isDateCompleted(d));

      if (!yesterdayCompleted && hasPriorActivity && currentStreak === 0) {
        setIsYesterdayMissed(true);
      } else {
        setIsYesterdayMissed(false);
      }

      setStreakData({
        id: 'derived-streak',
        couple_id: couple.id,
        current_streak: currentStreak,
        max_streak: maxStreak,
        water_tokens: 1,
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

  // Realtime listener across existing tables ONLY
  useEffect(() => {
    if (!couple?.id) return;

    const channelName = `sunflower-realtime-${couple.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'love_messages', filter: `couple_id=eq.${couple.id}` },
        () => fetchStreakData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'moods', filter: `couple_id=eq.${couple.id}` },
        () => fetchStreakData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memories', filter: `couple_id=eq.${couple.id}` },
        () => fetchStreakData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id, supabase, fetchStreakData]);

  const registerActivity = async (type: ActivityType) => {
    fetchStreakData();
  };

  const consumeRescueWater = async () => {
    setIsYesterdayMissed(false);
    await fetchStreakData();
    return true;
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
