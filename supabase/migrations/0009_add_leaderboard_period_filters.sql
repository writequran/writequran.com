-- Migration 0009: Add leaderboard period filters

DROP FUNCTION IF EXISTS public.get_leaderboard_by_period(text);

CREATE OR REPLACE FUNCTION public.get_leaderboard_by_period(period_key text DEFAULT 'all_time')
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
AS $leaderboard_period$
  WITH filtered_progress AS (
    SELECT sp.*
    FROM public.surah_progress sp
    WHERE CASE
      WHEN lower(COALESCE(period_key, 'all_time')) = 'weekly' THEN sp.last_practiced >= timezone('utc'::text, now()) - interval '7 days'
      WHEN lower(COALESCE(period_key, 'all_time')) = 'monthly' THEN sp.last_practiced >= timezone('utc'::text, now()) - interval '30 days'
      ELSE true
    END
  ),
  user_stats AS (
    SELECT
      up.id AS user_id,
      up.username AS username,
      COALESCE(NULLIF(BTRIM(up.public_display_name), ''), up.username, 'User_' || substr(up.id::text, 1, 6)) AS public_display_name,
      COALESCE(up.streak_current, 0) AS streak_current,
      COALESCE(pref.show_on_leaderboard, true) AS show_on_leaderboard,
      COALESCE(pref.show_public_profile, true) AS show_public_profile,
      COUNT(fp.surah_number)::bigint AS total_surahs,
      SUM(CASE WHEN COALESCE(fp.is_completed, false) THEN 1 ELSE 0 END)::bigint AS total_completed_surahs,
      COALESCE(SUM(fp.completed_ayat_count), 0)::bigint AS total_ayat,
      GREATEST(
        COALESCE(SUM(CASE WHEN jsonb_typeof(fp.typed_indices) = 'array' THEN jsonb_array_length(fp.typed_indices) ELSE 0 END), 0),
        COALESCE(SUM(fp.highest_index_reached), 0)
      )::bigint AS total_typed,
      COALESCE(SUM(fp.total_wrong_attempts), 0)::bigint AS total_mistakes
    FROM public.user_profiles up
    LEFT JOIN public.user_preferences pref ON pref.user_id = up.id
    LEFT JOIN filtered_progress fp ON fp.user_id = up.id
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
    su.public_display_name ASC
  LIMIT 100;
$leaderboard_period$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard_by_period(text) TO authenticated, anon;
