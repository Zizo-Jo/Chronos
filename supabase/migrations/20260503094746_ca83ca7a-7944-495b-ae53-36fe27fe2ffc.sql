
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS availability jsonb,
  ADD COLUMN IF NOT EXISTS chronotype text;
