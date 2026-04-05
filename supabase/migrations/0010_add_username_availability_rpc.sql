create or replace function public.is_username_available(candidate_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.user_profiles up
    where lower(up.username) = lower(btrim(candidate_username))
  );
$$;

grant execute on function public.is_username_available(text) to authenticated, anon;
