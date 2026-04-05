-- Migration 0005: Public display names for leaderboard/privacy

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS public_display_name text;

UPDATE public.user_profiles
SET public_display_name = username
WHERE public_display_name IS NULL
  AND username IS NOT NULL;

DROP POLICY IF EXISTS "Users can update own public display name" ON public.user_profiles;
CREATE POLICY "Users can update own public display name"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.user_profiles (id, email, username, public_display_name)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'username'
    );
  elsif TG_OP = 'UPDATE' then
    update public.user_profiles
    set username = new.raw_user_meta_data->>'username',
        public_display_name = coalesce(public.user_profiles.public_display_name, new.raw_user_meta_data->>'username')
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

DROP FUNCTION IF EXISTS public.get_leaderboard_base();
DROP FUNCTION IF EXISTS public.get_leaderboard();
DROP FUNCTION IF EXISTS public.get_leaderboard_profile(text);

CREATE OR REPLACE FUNCTION public.get_leaderboard_base()
RETURNS TABLE (
  global_rank bigint,
  user_id uuid,
  username text,
  public_display_name text,
  total_letters_typed bigint,
  total_surahs_practiced bigint,
  total_completed_surahs bigint,
  total_ayat_completed bigint,
  accuracy_percentage numeric,
  streak_active int,
  hifz_score int
)
LANGUAGE sql
SECURITY DEFINER
AS $base$
  WITH user_stats AS (
    SELECT
      up.id AS user_id,
      up.username AS username,
      COALESCE(NULLIF(BTRIM(up.public_display_name), ''), up.username, 'User_' || substr(up.id::text, 1, 6)) AS public_display_name,
      COALESCE(up.streak_current, 0) AS streak_current,
      COUNT(sp.surah_number)::bigint AS total_surahs,
      SUM(CASE WHEN COALESCE(sp.is_completed, false) THEN 1 ELSE 0 END)::bigint AS total_completed_surahs,
      COALESCE(SUM(sp.completed_ayat_count), 0)::bigint AS total_ayat,
      GREATEST(
        COALESCE(SUM(CASE WHEN jsonb_typeof(sp.typed_indices) = 'array' THEN jsonb_array_length(sp.typed_indices) ELSE 0 END), 0),
        COALESCE(SUM(sp.highest_index_reached), 0)
      )::bigint AS total_typed,
      COALESCE(SUM(sp.total_wrong_attempts), 0)::bigint AS total_mistakes
    FROM public.user_profiles up
    LEFT JOIN public.surah_progress sp ON up.id = sp.user_id
    WHERE up.username IS NOT NULL
    GROUP BY up.id, up.username, up.public_display_name, up.streak_current
  ),
  active_users AS (
    SELECT
      us.*,
      CASE
        WHEN us.total_typed + us.total_mistakes = 0 THEN 1.0
        ELSE us.total_typed::numeric / (us.total_typed + us.total_mistakes)
      END AS raw_accuracy,
      1.0 + (LEAST(us.streak_current, 21) * 0.012) AS consistency_multiplier
    FROM user_stats us
    WHERE us.total_surahs > 0
       OR us.total_completed_surahs > 0
       OR us.total_ayat > 0
       OR us.total_typed > 0
  ),
  scored_users AS (
    SELECT
      au.*,
      CASE
        WHEN au.raw_accuracy >= 0.98 THEN 1.10
        WHEN au.raw_accuracy >= 0.90 THEN 0.95 + ((au.raw_accuracy - 0.90) / 0.08) * 0.15
        WHEN au.raw_accuracy >= 0.75 THEN 0.70 + ((au.raw_accuracy - 0.75) / 0.15) * 0.25
        ELSE 0.55
      END AS accuracy_multiplier,
      (
        (au.total_completed_surahs * 300) +
        (au.total_ayat * 60) +
        (au.total_typed * 0.12) -
        (au.total_mistakes * 0.6)
      ) AS volume_points
    FROM active_users au
  )
  SELECT
    row_number() OVER (
      ORDER BY
        (su.volume_points * su.accuracy_multiplier * su.consistency_multiplier)::int DESC,
        su.total_completed_surahs DESC,
        su.total_ayat DESC,
        su.total_typed DESC,
        su.public_display_name ASC
    ) AS global_rank,
    su.user_id,
    su.username,
    su.public_display_name,
    su.total_typed AS total_letters_typed,
    su.total_surahs AS total_surahs_practiced,
    su.total_completed_surahs,
    su.total_ayat AS total_ayat_completed,
    ROUND(su.raw_accuracy * 100, 1) AS accuracy_percentage,
    su.streak_current AS streak_active,
    (su.volume_points * su.accuracy_multiplier * su.consistency_multiplier)::int AS hifz_score
  FROM scored_users su
  ORDER BY
    (su.volume_points * su.accuracy_multiplier * su.consistency_multiplier)::int DESC,
    su.total_completed_surahs DESC,
    su.total_ayat DESC,
    su.total_typed DESC,
    su.public_display_name ASC;
$base$;

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  global_rank bigint,
  user_id uuid,
  username text,
  public_display_name text,
  total_letters_typed bigint,
  total_surahs_practiced bigint,
  total_completed_surahs bigint,
  total_ayat_completed bigint,
  accuracy_percentage numeric,
  streak_active int,
  hifz_score int
)
LANGUAGE sql
SECURITY DEFINER
AS $leaderboard$
  SELECT * FROM public.get_leaderboard_base() LIMIT 100;
$leaderboard$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_profile(profile_username text)
RETURNS TABLE (
  global_rank bigint,
  user_id uuid,
  username text,
  public_display_name text,
  total_letters_typed bigint,
  total_surahs_practiced bigint,
  total_completed_surahs bigint,
  total_ayat_completed bigint,
  accuracy_percentage numeric,
  streak_active int,
  hifz_score int
)
LANGUAGE sql
SECURITY DEFINER
AS $profile$
  WITH leaderboard_base AS (
    SELECT * FROM public.get_leaderboard_base()
  )
  SELECT
    lb.global_rank,
    lb.user_id,
    lb.username,
    lb.public_display_name,
    lb.total_letters_typed,
    lb.total_surahs_practiced,
    lb.total_completed_surahs,
    lb.total_ayat_completed,
    lb.accuracy_percentage,
    lb.streak_active,
    lb.hifz_score
  FROM leaderboard_base lb
  WHERE lower(lb.username) = lower(profile_username)
  LIMIT 1;
$profile$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_profile(text) TO authenticated, anon;
