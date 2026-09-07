import { ActivityType } from '@/types';

/**
 * Registers a daily activity for the current user.
 * Activity is automatically recorded via real-time listeners on messages, moods, and memories.
 */
export async function registerUserActivity(activityType: ActivityType = 'message') {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Activity] Registered activity:', activityType);
  }
}
