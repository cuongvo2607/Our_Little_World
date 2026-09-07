import { createClient } from '@/lib/supabase/client';
import { getVietnamDateString } from '@/lib/utils';
import { ActivityType } from '@/types';

/**
 * Registers a daily activity for the current user in couple_daily_activities table
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

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SUNFLOWER] record activity: user=${user.id}, date=${todayDateStr}, type=${activityType}`);
    }

    // Upsert activity row for today into couple_daily_activities
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
  } catch (err) {
    // Catch gracefully if table does not exist or network is offline
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SUNFLOWER] Activity registration notice:', err);
    }
  }
}
