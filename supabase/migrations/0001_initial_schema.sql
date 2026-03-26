-- Create user_profiles linking automatically to Supabase Auth
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- current_progress_state (Live resumable state)
create table if not exists public.current_progress_state (
  user_id uuid references public.user_profiles(id) on delete cascade not null primary key,
  surah_number int not null,
  ayah_number int,
  global_index int not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- user_preferences
create table if not exists public.user_preferences (
  user_id uuid references public.user_profiles(id) on delete cascade not null primary key,
  theme text default 'light' not null,
  visibility_mode text default 'hidden' not null,
  show_keyboard boolean default false not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- surah_progress (Historical Max)
create table if not exists public.surah_progress (
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  surah_number int not null,
  highest_index_reached int default 0 not null,
  total_mistake_events int default 0 not null,
  total_wrong_attempts int default 0 not null,
  last_practiced timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, surah_number)
);

-- mistake_stats (Granular Tracker)
create table if not exists public.mistake_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  surah_number int not null,
  ayah_number int not null,
  global_index int not null,
  expected_char text not null,
  wrong_attempts int default 1 not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, surah_number, ayah_number, global_index, expected_char)
);

-- review_history (Future Tracking)
create table if not exists public.review_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  surah_number int not null,
  ayah_number int not null,
  score_improvement int not null,
  reviewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- weak_spots (Dynamic Aggregation View for API Consumption)
create or replace view public.weak_spots as
select 
  user_id, 
  surah_number, 
  ayah_number,
  min(global_index) as min_global_index,
  count(id) as total_mistake_events,
  sum(wrong_attempts) as total_wrong_attempts,
  (count(id) * 2 + sum(wrong_attempts)) as difficulty_score
from public.mistake_stats
group by user_id, surah_number, ayah_number
order by difficulty_score desc;

-- Enable RLS Across The Board
alter table public.user_profiles enable row level security;
alter table public.current_progress_state enable row level security;
alter table public.user_preferences enable row level security;
alter table public.surah_progress enable row level security;
alter table public.mistake_stats enable row level security;
alter table public.review_history enable row level security;

-- Create Policies (Strict user_id isolation bounds)

create policy "Users can view own profile" 
on public.user_profiles for select using (auth.uid() = id);

create policy "Users can freely manage their progress state" 
on public.current_progress_state for all using (auth.uid() = user_id);

create policy "Users can freely manage their preferences" 
on public.user_preferences for all using (auth.uid() = user_id);

create policy "Users can freely manage their surah progress" 
on public.surah_progress for all using (auth.uid() = user_id);

create policy "Users can safely inject and query their granular mistake logs" 
on public.mistake_stats for all using (auth.uid() = user_id);

create policy "Users can safely insert and read review history" 
on public.review_history for all using (auth.uid() = user_id);
