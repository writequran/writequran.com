-- Migration 0006: Make public display names unique

-- Normalize blanks to NULL so the fallback logic can still work cleanly.
UPDATE public.user_profiles
SET public_display_name = NULL
WHERE public_display_name IS NOT NULL
  AND BTRIM(public_display_name) = '';

-- Resolve existing duplicates deterministically before adding the unique index.
WITH normalized_names AS (
  SELECT
    id,
    public_display_name,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(BTRIM(public_display_name))
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.user_profiles
  WHERE public_display_name IS NOT NULL
    AND BTRIM(public_display_name) <> ''
),
duplicates AS (
  SELECT
    id,
    public_display_name,
    duplicate_rank
  FROM normalized_names
  WHERE duplicate_rank > 1
)
UPDATE public.user_profiles up
SET public_display_name = CONCAT(duplicates.public_display_name, ' #', duplicates.duplicate_rank)
FROM duplicates
WHERE up.id = duplicates.id;

-- Enforce uniqueness for non-empty public names, case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_public_display_name_unique_idx
ON public.user_profiles (LOWER(BTRIM(public_display_name)))
WHERE public_display_name IS NOT NULL
  AND BTRIM(public_display_name) <> '';
