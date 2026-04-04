-- Add username to user_profiles
alter table public.user_profiles add column if not exists username text unique;

-- Update auth trigger to insert/update username from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.user_profiles (id, email, username)
    values (new.id, new.email, new.raw_user_meta_data->>'username');
  elsif TG_OP = 'UPDATE' then
    update public.user_profiles 
    set username = new.raw_user_meta_data->>'username'
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute procedure public.handle_new_user();

-- Create get_leaderboard RPC
create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  username text,
  total_letters_typed bigint,
  total_surahs_practiced bigint
) as $$
begin
  return query
  select 
    up.id as user_id, 
    coalesce(up.username, 'User_' || substr(up.id::text, 1, 6)) as username,
    coalesce(sum(sp.highest_index_reached), 0)::bigint as total_letters_typed,
    count(sp.surah_number)::bigint as total_surahs_practiced
  from public.user_profiles up
  left join public.surah_progress sp on up.id = sp.user_id
  group by up.id, up.username
  order by total_letters_typed desc
  limit 100;
end;
$$ language plpgsql security definer;

-- Expose RPC securely
grant execute on function public.get_leaderboard() to authenticated, anon;
