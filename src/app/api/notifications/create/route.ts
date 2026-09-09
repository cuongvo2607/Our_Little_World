import { NextRequest, NextResponse } from 'next/server';
import { PushDispatchResult, sendPushForNotification } from '@/lib/push';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AppNotification, NotificationType } from '@/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const type = body?.type as NotificationType | undefined;

    if (!type) {
      return NextResponse.json({ error: 'Missing notification type' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('create_partner_notification', {
      p_type: type,
      p_action_type: body?.actionType || null,
      p_reference_id: body?.referenceId || null,
    });

    if (error) throw error;

    const notification = data as AppNotification;
    let push: PushDispatchResult = { enabled: false, sentCount: 0, removedInvalid: 0 };

    try {
      const admin = createAdminClient();
      push = await sendPushForNotification(admin, notification);
    } catch (pushError) {
      console.warn('[Notifications] Push dispatch skipped:', pushError);
    }

    return NextResponse.json({ ok: true, notification, push });
  } catch (err) {
    console.error('[Notifications] Create POST error:', err);
    return NextResponse.json({ error: 'Could not create notification' }, { status: 500 });
  }
}
