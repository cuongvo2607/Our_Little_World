import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AppNotification } from '@/types';

export const runtime = 'nodejs';

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:hello@ourlittleworld.app';

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!configureWebPush()) {
      return NextResponse.json({ ok: true, push: 'disabled' });
    }

    const { notificationId } = await request.json();
    if (!notificationId) {
      return NextResponse.json({ error: 'Missing notificationId' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .maybeSingle();

    if (notificationError) throw notificationError;
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const typedNotification = notification as AppNotification;
    if (typedNotification.sender_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', typedNotification.recipient_id);

    if (subscriptionsError) throw subscriptionsError;

    const payload = JSON.stringify({
      notificationId: typedNotification.id,
      type: typedNotification.type,
      title: typedNotification.title || 'Our Little World ❤️',
      body: typedNotification.body || 'Bạn có một thông báo mới',
      url: typedNotification.url || '/',
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
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            invalidSubscriptionIds.push(subscription.id);
            return;
          }
          console.warn('[Push] Could not send notification:', err?.statusCode || err?.message || err);
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
        .eq('id', typedNotification.id);
    }

    return NextResponse.json({ ok: true, sentCount, removedInvalid: invalidSubscriptionIds.length });
  } catch (err) {
    console.error('[Push] POST error:', err);
    return NextResponse.json({ error: 'Could not send push notification' }, { status: 500 });
  }
}
