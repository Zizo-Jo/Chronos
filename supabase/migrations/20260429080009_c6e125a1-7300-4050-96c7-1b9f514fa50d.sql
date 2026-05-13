-- SUBJECTS
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  instructor TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subj select own" ON public.subjects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "subj insert own" ON public.subjects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subj update own" ON public.subjects FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "subj delete own" ON public.subjects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EXAMS
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  exam_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  weight NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam select own" ON public.exams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exam insert own" ON public.exams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam update own" ON public.exams FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exam delete own" ON public.exams FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TASKS: add subject link
ALTER TABLE public.tasks ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- STUDY BLOCKS
CREATE TABLE public.study_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sblock select own" ON public.study_blocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sblock insert own" ON public.study_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sblock update own" ON public.study_blocks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sblock delete own" ON public.study_blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER study_blocks_updated_at BEFORE UPDATE ON public.study_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_study_blocks_user_start ON public.study_blocks(user_id, scheduled_start);
CREATE INDEX idx_exams_user_date ON public.exams(user_id, exam_date);