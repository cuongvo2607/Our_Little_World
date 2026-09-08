import { SupabaseClient } from '@supabase/supabase-js';
import { AppNotification, NotificationType } from '@/types';

export const NOTIFICATION_TITLE = 'Our Little World ❤️';

export function formatNotificationTime(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hôm qua';
  return `${diffDays} ngày trước`;
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function supportsWebPush() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function createPartnerNotification(
  supabase: SupabaseClient,
  type: NotificationType,
  actionType?: string | null,
  referenceId?: string | null
) {
  const { data, error } = await supabase.rpc('create_partner_notification', {
    p_type: type,
    p_action_type: actionType || null,
    p_reference_id: referenceId || null,
  });

  if (error) throw error;

  const notification = data as AppNotification;
  if (notification?.id) {
    fetch('/api/notifications/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: notification.id }),
    }).catch((err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Notifications] Push dispatch failed:', err);
      }
    });
  }

  return notification;
}
