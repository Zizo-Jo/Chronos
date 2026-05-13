CREATE TABLE public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'other',
  recurring BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inc select own" ON public.income FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inc insert own" ON public.income FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inc update own" ON public.income FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "inc delete own" ON public.income FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER income_updated_at BEFORE UPDATE ON public.income FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_income_user_date ON public.income(user_id, received_at);