-- Robust memory view receipt writer.
-- Run this after 20260908_memory_views.sql.

create or replace function public.record_memory_view(p_memory_id uuid)
returns public.memory_views
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_memory record;
  v_view public.memory_views;
begin
  if v_viewer_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, couple_id, created_by
  into v_memory
  from public.memories
  where id = p_memory_id;

  if not found then
    raise exception 'Memory not found';
  end if;

  if not exists (
    select 1
    from public.couple_members cm
    where cm.couple_id = v_memory.couple_id
      and cm.user_id = v_viewer_id
  ) then
    raise exception 'Not allowed to view this memory';
  end if;

  if v_memory.created_by = v_viewer_id then
    select *
    into v_view
    from public.memory_views
    where memory_id = p_memory_id
      and viewer_id = v_viewer_id;

    return v_view;
  end if;

  insert into public.memory_views (memory_id, couple_id, viewer_id)
  values (p_memory_id, v_memory.couple_id, v_viewer_id)
  on conflict (memory_id, viewer_id) do nothing;

  select *
  into v_view
  from public.memory_views
  where memory_id = p_memory_id
    and viewer_id = v_viewer_id;

  return v_view;
end;
$$;

revoke all on function public.record_memory_view(uuid) from public;
grant execute on function public.record_memory_view(uuid) to authenticated;
