import { createClient } from '@/lib/supabase/client';
import { getVietnamDateString } from '@/lib/utils';
import { ActivityType } from '@/types';

/**
 * Registers a daily activity for the current user and triggers streak updates
 */
export async function registerUserActivity(activityType: ActivityType = 'message') {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { data: member } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member?.couple_id) return;

    const todayDateStr = getVietnamDateString();

    // 1. Upsert activity row for today
    await supabase
      .from('couple_daily_activities')
      .upsert(
        {
          couple_id: member.couple_id,
          user_id: user.id,
          activity_date: todayDateStr,
          activity_type: activityType,
        },
        { onConflict: 'couple_id, user_id, activity_date' }
      );

    // 2. Check if BOTH partners have completed an activity today
    const { data: todayActs } = await supabase
      .from('couple_daily_activities')
      .select('user_id')
      .eq('couple_id', member.couple_id)
      .eq('activity_date', todayDateStr);

    const uniqueUsers = new Set((todayActs || []).map((a) => a.user_id));

    if (uniqueUsers.size >= 2) {
      // Both partners completed! Fetch current streak
      const { data: streakRow } = await supabase
        .from('couple_streaks')
        .select('*')
        .eq('couple_id', member.couple_id)
        .maybeSingle();

      // Only increment if not already calculated today
      if (streakRow?.last_calculated_date !== todayDateStr) {
        const currentStreak = (streakRow?.current_streak || 0) + 1;
        const maxStreak = Math.max(currentStreak, streakRow?.max_streak || 0);

        await supabase
          .from('couple_streaks')
          .upsert(
            {
              couple_id: member.couple_id,
              current_streak: currentStreak,
              max_streak: maxStreak,
              last_calculated_date: todayDateStr,
            },
            { onConflict: 'couple_id' }
          );
      }
    }
  } catch (err) {
    console.error('[Activity] Error registering activity:', err);
  }
}
