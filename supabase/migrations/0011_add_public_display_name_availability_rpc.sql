create or replace function public.is_public_display_name_available(
  candidate_display_name text,
  current_user_id uuid default null
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    not exists (
      select 1
      from public.user_profiles up
      where up.public_display_name is not null
        and lower(up.public_display_name) = lower(btrim(candidate_display_name))
        and (current_user_id is null or up.id <> current_user_id)
    )
    and
    not exists (
      select 1
      from public.reserved_names rn
      where rn.kind = 'public_display_name'
        and lower(rn.name) = lower(btrim(candidate_display_name))
    );
$$;

grant execute on function public.is_public_display_name_available(text, uuid) to authenticated, anon;
