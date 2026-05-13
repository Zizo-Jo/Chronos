ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS student_status text,
  ADD COLUMN IF NOT EXISTS monthly_budget numeric,
  ADD COLUMN IF NOT EXISTS study_goals text,
  ADD COLUMN IF NOT EXISTS nutrition_goals text,
  ADD COLUMN IF NOT EXISTS wake_time time,
  ADD COLUMN IF NOT EXISTS sleep_time time,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;