import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('couple_members')
      .select('couple_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No couple found' }, { status: 404 });
    }

    const { data: capsules, error } = await supabase
      .from('time_capsules')
      .select('*')
      .eq('couple_id', member.couple_id)
      .order('unlock_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();

    // Server-side redaction: remove message content if unlock_at is in the future
    const sanitizedCapsules = (capsules || []).map((cap) => {
      const unlockDate = new Date(cap.unlock_at);
      const isLocked = now < unlockDate;

      return {
        id: cap.id,
        couple_id: cap.couple_id,
        created_by: cap.created_by,
        title: cap.title,
        unlock_at: cap.unlock_at,
        opened_at: cap.opened_at,
        created_at: cap.created_at,
        is_locked: isLocked,
        // Conceal letter text until unlocked!
        message: isLocked ? null : cap.message,
      };
    });

    return NextResponse.json({ data: sanitizedCapsules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
