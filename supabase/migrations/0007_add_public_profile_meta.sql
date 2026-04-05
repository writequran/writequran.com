-- Migration 0007: Public profile metadata for polished leaderboard profiles

DROP FUNCTION IF EXISTS public.get_public_profile_meta(text);

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
  LEFT JOIN latest_practice lp ON lp.user_id = up.id
  LEFT JOIN ranked ON ranked.user_id = up.id
  WHERE lower(up.username) = lower(profile_username)
  LIMIT 1;
$meta$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_meta(text) TO authenticated, anon;
