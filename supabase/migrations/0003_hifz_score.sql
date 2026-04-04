-- Migration 0003: Hifz Score System

-- 1. Add Tracking to User Profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS streak_current int DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_last_active_date date;

-- 2. Add Tracking to Surah Progress
ALTER TABLE public.surah_progress
ADD COLUMN IF NOT EXISTS completed_ayat_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;

-- 3. Trigger to safely update the streak
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS trigger AS $$
DECLARE
  v_last_active date;
  v_current_streak int;
BEGIN
  -- We lock row if needed implicitly, but checking directly is fine
  SELECT streak_last_active_date, streak_current 
  INTO v_last_active, v_current_streak
  FROM public.user_profiles
  WHERE id = NEW.user_id;

  IF v_last_active IS NULL THEN
    UPDATE public.user_profiles 
    SET streak_current = 1, streak_last_active_date = DATE(NEW.last_practiced)
    WHERE id = NEW.user_id;
  ELSIF DATE(NEW.last_practiced) = v_last_active + interval '1 day' THEN
    UPDATE public.user_profiles 
    SET streak_current = v_current_streak + 1, streak_last_active_date = DATE(NEW.last_practiced)
    WHERE id = NEW.user_id;
  ELSIF DATE(NEW.last_practiced) > v_last_active + interval '1 day' THEN
    UPDATE public.user_profiles 
    SET streak_current = 1, streak_last_active_date = DATE(NEW.last_practiced)
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_surah_progress_updated ON public.surah_progress;
CREATE TRIGGER on_surah_progress_updated
  AFTER INSERT OR UPDATE ON public.surah_progress
  FOR EACH ROW
  EXECUTE PROCEDURE update_user_streak();

-- 4. Create the advanced leaderboard pulling function
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS table (
  user_id uuid,
  username text,
  total_letters_typed bigint,
  total_surahs_practiced bigint,
  total_ayat_completed bigint,
  accuracy_percentage numeric,
  streak_active int,
  hifz_score int
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      up.id as user_id, 
      coalesce(up.username, 'User_' || substr(up.id::text, 1, 6)) as username,
      coalesce(up.streak_current, 0) as streak_current,
      -- Consistency: cap at 25 days (1.5x)
      1.0 + (LEAST(coalesce(up.streak_current, 0), 25) * 0.02) as consistency_multiplier,
      coalesce(sum(sp.highest_index_reached), 0)::bigint as total_typed,
      coalesce(sum(sp.total_wrong_attempts), 0)::bigint as total_mistakes,
      count(sp.surah_number)::bigint as total_surahs,
      sum(coalesce(sp.completed_ayat_count, 0))::bigint as total_ayat,
      -- Calculate accuracy: typed / (typed + mistakes)
      CASE 
        WHEN coalesce(sum(sp.highest_index_reached), 0) + coalesce(sum(sp.total_wrong_attempts), 0) = 0 THEN 1.0
        ELSE coalesce(sum(sp.highest_index_reached), 0)::numeric / 
             (coalesce(sum(sp.highest_index_reached), 0) + coalesce(sum(sp.total_wrong_attempts), 0))
      END as raw_accuracy
    FROM public.user_profiles up
    LEFT JOIN public.surah_progress sp ON up.id = sp.user_id
    GROUP BY up.id, up.username, up.streak_current
  ),
  scored_users AS (
    SELECT 
      *,
      -- Quality multiplier
      CASE 
        WHEN raw_accuracy >= 0.95 THEN 1.0
        WHEN raw_accuracy >= 0.80 THEN 0.8 + ((raw_accuracy - 0.80) / 0.15) * 0.2
        ELSE 0.3
      END as accuracy_multiplier,
      -- Volume points (Surahs worth 1000, ayat worth 25, letters worth 0.1)
      (total_surahs * 1000) + (total_ayat * 25) + (total_typed * 0.1) as volume_points
    FROM user_stats
  )
  SELECT 
    su.user_id,
    su.username,
    su.total_typed as total_letters_typed,
    su.total_surahs as total_surahs_practiced,
    su.total_ayat as total_ayat_completed,
    ROUND(su.raw_accuracy * 100, 1) as accuracy_percentage,
    su.streak_current as streak_active,
    (su.volume_points * su.accuracy_multiplier * su.consistency_multiplier)::int as hifz_score
  FROM scored_users su
  ORDER BY hifz_score DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, anon;
