-- Migration 0008: Professional settings privacy controls

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean DEFAULT true NOT NULL;

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS show_public_profile boolean DEFAULT true NOT NULL;

UPDATE public.user_preferences
SET show_on_leaderboard = true
WHERE show_on_leaderboard IS NULL;

UPDATE public.user_preferences
SET show_public_profile = true
WHERE show_public_profile IS NULL;

DROP FUNCTION IF EXISTS public.get_public_profile_meta(text);
DROP FUNCTION IF EXISTS public.get_leaderboard_profile(text);
DROP FUNCTION IF EXISTS public.get_leaderboard();
DROP FUNCTION IF EXISTS public.get_leaderboard_base();

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
      COALESCE(pref.show_on_leaderboard, true) AS show_on_leaderboard,
      COALESCE(pref.show_public_profile, true) AS show_public_profile,
      COUNT(sp.surah_number)::bigint AS total_surahs,
      SUM(CASE WHEN COALESCE(sp.is_completed, false) THEN 1 ELSE 0 END)::bigint AS total_completed_surahs,
      COALESCE(SUM(sp.completed_ayat_count), 0)::bigint AS total_ayat,
      GREATEST(
        COALESCE(SUM(CASE WHEN jsonb_typeof(sp.typed_indices) = 'array' THEN jsonb_array_length(sp.typed_indices) ELSE 0 END), 0),
        COALESCE(SUM(sp.highest_index_reached), 0)
      )::bigint AS total_typed,
      COALESCE(SUM(sp.total_wrong_attempts), 0)::bigint AS total_mistakes
    FROM public.user_profiles up
    LEFT JOIN public.user_preferences pref ON pref.user_id = up.id
    LEFT JOIN public.surah_progress sp ON up.id = sp.user_id
    WHERE up.username IS NOT NULL
    GROUP BY up.id, up.username, up.public_display_name, up.streak_current, pref.show_on_leaderboard, pref.show_public_profile
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
    WHERE (us.total_surahs > 0
       OR us.total_completed_surahs > 0
       OR us.total_ayat > 0
       OR us.total_typed > 0)
      AND us.show_on_leaderboard
      AND us.show_public_profile
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
  WITH target_user AS (
    SELECT
      up.id,
      up.username,
      COALESCE(NULLIF(BTRIM(up.public_display_name), ''), up.username, 'User_' || substr(up.id::text, 1, 6)) AS public_display_name,
      COALESCE(up.streak_current, 0) AS streak_current
    FROM public.user_profiles up
    LEFT JOIN public.user_preferences pref ON pref.user_id = up.id
    WHERE lower(up.username) = lower(profile_username)
      AND (auth.uid() = up.id OR COALESCE(pref.show_public_profile, true))
    LIMIT 1
  ),
  user_stats AS (
    SELECT
      tu.id AS user_id,
      tu.username,
      tu.public_display_name,
      tu.streak_current,
      COUNT(sp.surah_number)::bigint AS total_surahs,
      SUM(CASE WHEN COALESCE(sp.is_completed, false) THEN 1 ELSE 0 END)::bigint AS total_completed_surahs,
      COALESCE(SUM(sp.completed_ayat_count), 0)::bigint AS total_ayat,
      GREATEST(
        COALESCE(SUM(CASE WHEN jsonb_typeof(sp.typed_indices) = 'array' THEN jsonb_array_length(sp.typed_indices) ELSE 0 END), 0),
        COALESCE(SUM(sp.highest_index_reached), 0)
      )::bigint AS total_typed,
      COALESCE(SUM(sp.total_wrong_attempts), 0)::bigint AS total_mistakes
    FROM target_user tu
    LEFT JOIN public.surah_progress sp ON sp.user_id = tu.id
    GROUP BY tu.id, tu.username, tu.public_display_name, tu.streak_current
  ),
  scored_user AS (
    SELECT
      us.*,
      CASE
        WHEN us.total_typed + us.total_mistakes = 0 THEN 100.0
        ELSE ROUND((us.total_typed::numeric / (us.total_typed + us.total_mistakes)) * 100, 1)
      END AS accuracy_percentage,
      CASE
        WHEN us.total_typed + us.total_mistakes = 0 THEN 1.0
        ELSE us.total_typed::numeric / (us.total_typed + us.total_mistakes)
      END AS raw_accuracy,
      1.0 + (LEAST(us.streak_current, 21) * 0.012) AS consistency_multiplier
    FROM user_stats us
  ),
  weighted_user AS (
    SELECT
      su.*,
      CASE
        WHEN su.raw_accuracy >= 0.98 THEN 1.10
        WHEN su.raw_accuracy >= 0.90 THEN 0.95 + ((su.raw_accuracy - 0.90) / 0.08) * 0.15
        WHEN su.raw_accuracy >= 0.75 THEN 0.70 + ((su.raw_accuracy - 0.75) / 0.15) * 0.25
        ELSE 0.55
      END AS accuracy_multiplier,
      (
        (su.total_completed_surahs * 300) +
        (su.total_ayat * 60) +
        (su.total_typed * 0.12) -
        (su.total_mistakes * 0.6)
      ) AS volume_points
    FROM scored_user su
  )
  SELECT
    ranked.global_rank,
    wu.user_id,
    wu.username,
    wu.public_display_name,
    wu.total_typed AS total_letters_typed,
    wu.total_surahs AS total_surahs_practiced,
    wu.total_completed_surahs,
    wu.total_ayat AS total_ayat_completed,
    wu.accuracy_percentage,
    wu.streak_current AS streak_active,
    (wu.volume_points * wu.accuracy_multiplier * wu.consistency_multiplier)::int AS hifz_score
  FROM weighted_user wu
  LEFT JOIN public.get_leaderboard_base() ranked ON ranked.user_id = wu.user_id
  LIMIT 1;
$profile$;

CREATE OR REPLACE FUNCTION public.get_public_profile_meta(profile_username text)
RETURNS TABLE (
  user_id uuid,
  username text,
  public_display_name text,
  created_at timestamp with time zone,
  streak_last_active_date date,
  last_practiced_at timestamp with time zone,
  global_rank bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $meta$
  WITH ranked AS (
    SELECT global_rank, user_id
    FROM public.get_leaderboard_base()
  ),
  latest_practice AS (
    SELECT
      sp.user_id,
      MAX(sp.last_practiced) AS last_practiced_at
    FROM public.surah_progress sp
    GROUP BY sp.user_id
  )
  SELECT
    up.id AS user_id,
    up.username,
    COALESCE(NULLIF(BTRIM(up.public_display_name), ''), up.username, 'User_' || substr(up.id::text, 1, 6)) AS public_display_name,
    up.created_at,
    up.streak_last_active_date,
    lp.last_practiced_at,
    ranked.global_rank
  FROM public.user_profiles up
  LEFT JOIN public.user_preferences pref ON pref.user_id = up.id
  LEFT JOIN latest_practice lp ON lp.user_id = up.id
  LEFT JOIN ranked ON ranked.user_id = up.id
  WHERE lower(up.username) = lower(profile_username)
    AND (auth.uid() = up.id OR COALESCE(pref.show_public_profile, true))
  LIMIT 1;
$meta$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_profile(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile_meta(text) TO authenticated, anon;
