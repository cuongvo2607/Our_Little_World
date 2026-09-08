-- Notifications: in-app realtime, notification center, and Web Push subscriptions.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  action_type text,
  reference_id uuid,
  title text,
  body text,
  url text not null default '/',
  is_read boolean not null default false,
  push_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in (
      'quick_love',
      'message',
      'memory_created',
      'memory_viewed',
      'sunflower_watered',
      'streak_completed',
      'song_added',
      'time_capsule_ready'
    )
  ),
  constraint notifications_no_self_check check (sender_id <> recipient_id)
);

create index if not exists idx_notifications_recipient_created
  on public.notifications(recipient_id, created_at desc);

create index if not exists idx_notifications_recipient_unread
  on public.notifications(recipient_id, is_read, created_at desc);

create index if not exists idx_notifications_couple
  on public.notifications(couple_id);

alter table public.notifications enable row level security;

drop policy if exists "Recipients can select notifications" on public.notifications;
create policy "Recipients can select notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

drop policy if exists "Recipients can update read state" on public.notifications;
create policy "Recipients can update read state"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "Recipients can delete notifications" on public.notifications;
create policy "Recipients can delete notifications"
  on public.notifications for delete
  using (recipient_id = auth.uid());

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can select own push subscriptions" on public.push_subscriptions;
create policy "Users can select own push subscriptions"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own push subscriptions" on public.push_subscriptions;
create policy "Users can insert own push subscriptions"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own push subscriptions" on public.push_subscriptions;
create policy "Users can update own push subscriptions"
  on public.push_subscriptions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own push subscriptions" on public.push_subscriptions;
create policy "Users can delete own push subscriptions"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

create or replace function public.create_partner_notification(
  p_type text,
  p_action_type text default null,
  p_reference_id uuid default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid := auth.uid();
  v_couple_id uuid;
  v_recipient_id uuid;
  v_sender_name text;
  v_title text := 'Our Little World ❤️';
  v_body text;
  v_url text := '/';
  v_notification public.notifications;
begin
  if v_sender_id is null then
    raise exception 'Not authenticated';
  end if;

  select cm.couple_id into v_couple_id
  from public.couple_members cm
  where cm.user_id = v_sender_id
  limit 1;

  if v_couple_id is null then
    raise exception 'Couple not found';
  end if;

  select cm.user_id into v_recipient_id
  from public.couple_members cm
  where cm.couple_id = v_couple_id
    and cm.user_id <> v_sender_id
  limit 1;

  if v_recipient_id is null then
    raise exception 'Partner not found';
  end if;

  select coalesce(nullif(trim(p.display_name), ''), 'Người ấy') into v_sender_name
  from public.profiles p
  where p.id = v_sender_id;

  v_sender_name := coalesce(v_sender_name, 'Người ấy');

  if p_type = 'quick_love' then
    if p_action_type = 'miss_you' then
      v_body := '❤️ ' || v_sender_name || ' đang nhớ bạn';
    elsif p_action_type = 'love_you' then
      v_body := '💕 ' || v_sender_name || ' vừa nói yêu bạn';
    elsif p_action_type = 'hug' then
      v_body := '🤗 ' || v_sender_name || ' gửi bạn một cái ôm';
    else
      v_body := '💌 ' || v_sender_name || ' gửi bạn một lời yêu thương';
    end if;
    v_url := '/';
  elsif p_type = 'message' then
    v_body := '💬 ' || v_sender_name || ' gửi cho bạn một tin nhắn';
    v_url := '/messages';
  elsif p_type = 'memory_created' then
    v_body := '📸 ' || v_sender_name || ' vừa thêm một kỷ niệm mới';
    v_url := '/memories';
  elsif p_type = 'memory_viewed' then
    v_body := '👀 ' || v_sender_name || ' vừa xem kỷ niệm của bạn';
    v_url := '/memories';
  elsif p_type = 'sunflower_watered' then
    v_body := '🌻 ' || v_sender_name || ' đã tưới hoa hôm nay';
    v_url := '/';
  elsif p_type = 'song_added' then
    v_body := '🎵 ' || v_sender_name || ' vừa thêm một bài hát';
    v_url := '/';
  elsif p_type = 'time_capsule_ready' then
    v_body := '💌 Một lá thư tương lai đang chờ hai bạn';
    v_url := '/time-capsule';
  else
    raise exception 'Unsupported notification type';
  end if;

  insert into public.notifications (
    couple_id,
    sender_id,
    recipient_id,
    type,
    action_type,
    reference_id,
    title,
    body,
    url
  )
  values (
    v_couple_id,
    v_sender_id,
    v_recipient_id,
    p_type,
    p_action_type,
    p_reference_id,
    v_title,
    v_body,
    v_url
  )
  returning * into v_notification;

  return v_notification;
end;
$$;

grant execute on function public.create_partner_notification(text, text, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
