import webpush from 'web-push';
import { SupabaseClient } from '@supabase/supabase-js';
import { AppNotification } from '@/types';

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushSendError = {
  statusCode?: number;
  message?: string;
};

export type PushDispatchResult = {
  enabled: boolean;
  sentCount: number;
  removedInvalid: number;
};

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@ourlittleworld.app';

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPushForNotification(
  admin: SupabaseClient,
  notification: AppNotification
): Promise<PushDispatchResult> {
  if (!configureWebPush()) {
    return { enabled: false, sentCount: 0, removedInvalid: 0 };
  }

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', notification.recipient_id);

  if (subscriptionsError) throw subscriptionsError;

  const payload = JSON.stringify({
    notificationId: notification.id,
    type: notification.type,
    title: notification.title || 'Our Little World ❤️',
    body: notification.body || 'Bạn có một thông báo mới',
    url: notification.url || '/',
  });

  const invalidSubscriptionIds: string[] = [];
  let sentCount = 0;

  await Promise.allSettled(
    ((subscriptions || []) as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        sentCount += 1;
      } catch (error) {
        const err = error as PushSendError;
        if (err.statusCode === 404 || err.statusCode === 410) {
          invalidSubscriptionIds.push(subscription.id);
          return;
        }
        console.warn('[Push] Could not send notification:', err.statusCode || err.message || err);
      }
    })
  );

  if (invalidSubscriptionIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', invalidSubscriptionIds);
  }

  if (sentCount > 0) {
    await admin
      .from('notifications')
      .update({ push_sent_at: new Date().toISOString() })
      .eq('id', notification.id);
  }

  return {
    enabled: true,
    sentCount,
    removedInvalid: invalidSubscriptionIds.length,
  };
}
