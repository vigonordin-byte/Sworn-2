-- Guideline 5.1.1(v): an app that creates accounts must let the user delete
-- one from inside the app. The client can never do this directly — removing a
-- row from auth.users needs the service_role key, and that key must not exist
-- anywhere in a shipped binary. So deletion runs here instead, as a function
-- that is allowed to reach auth.users but can only ever act on the caller's
-- own id.
--
-- Run once in the Supabase SQL editor.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  -- security definer runs as the owner, so the caller's identity is the only
  -- thing standing between this and every other account. Without this guard
  -- an unauthenticated call would delete with uid null and match nothing —
  -- silently succeeding, which is the wrong answer to give.
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.events   where user_id = uid;
  delete from public.oaths    where user_id = uid;
  delete from public.profiles where id      = uid;
  delete from auth.users      where id      = uid;
end;
$$;

-- Only a signed-in user may call it, and only ever for themselves.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
