-- Update trigger to auto-generate username from email prefix if missing in metadata
create or replace function public.handle_new_user()
returns trigger as $$
declare
  candidate_username text;
  final_username text;
  is_available boolean;
begin
  if TG_OP = 'INSERT' then
    candidate_username := new.raw_user_meta_data->>'username';
    
    if candidate_username is null then
      -- Auto-generate from email prefix
      candidate_username := lower(split_part(new.email, '@', 1));
      -- Clean characters: keep only a-z, 0-9, ., _
      candidate_username := regexp_replace(candidate_username, '[^a-z0-9._]', '', 'g');
      
      -- Ensure it starts with a letter
      if not (candidate_username ~ '^[a-z]') then
        candidate_username := 'u_' || candidate_username;
      end if;
      
      -- Ensure minimum length of 3
      if length(candidate_username) < 3 then
        candidate_username := rpad(candidate_username, 3, '0');
      end if;

      -- Check availability in user_profiles
      select not exists (select 1 from public.user_profiles where username = candidate_username) into is_available;
      
      if is_available then
        final_username := candidate_username;
      else
        -- Append suffix if taken (first 4 chars of UUID)
        final_username := substr(candidate_username, 1, 15) || substr(new.id::text, 1, 4);
      end if;
    else
      final_username := candidate_username;
    end if;

    insert into public.user_profiles (id, email, username)
    values (new.id, new.email, final_username);

  elsif TG_OP = 'UPDATE' then
    update public.user_profiles 
    set username = new.raw_user_meta_data->>'username'
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;
