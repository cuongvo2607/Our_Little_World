import { NextRequest, NextResponse } from 'next/server';
import { sendPushForNotification } from '@/lib/push';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AppNotification } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const result = await sendPushForNotification(admin, typedNotification);

    return NextResponse.json({
      ok: true,
      push: result.enabled ? 'sent' : 'disabled',
      sentCount: result.sentCount,
      removedInvalid: result.removedInvalid,
    });
  } catch (err) {
    console.error('[Push] POST error:', err);
    return NextResponse.json({ error: 'Could not send push notification' }, { status: 500 });
  }
}
