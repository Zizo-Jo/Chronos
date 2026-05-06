import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, ArrowLeft, GraduationCap, Wallet, HeartPulse, Sunrise, Moon, Sun, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const GOALS = [
  { id: "study", label: "Study", desc: "Stay on top of classes & exams", icon: GraduationCap },
  { id: "money", label: "Money", desc: "Track spending & save more", icon: Wallet },
  { id: "health", label: "Health", desc: "Eat better, sleep, move daily", icon: HeartPulse },
];

const CHRONOTYPES = [
  { id: "morning", label: "Morning person", desc: "Sharpest before noon", icon: Sunrise },
  { id: "balanced", label: "Balanced", desc: "Steady all day", icon: Sun },
  { id: "night", label: "Night owl", desc: "Comes alive after dark", icon: Moon },
];

const STEPS_TOTAL = 6;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [studyHours, setStudyHours] = useState(3);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [chronotype, setChronotype] = useState("balanced");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.onboarding_completed) { navigate("/app", { replace: true }); return; }
      setFullName(data?.full_name || user.user_metadata?.full_name || "");
      setChecking(false);
    })();
  }, [user, loading, navigate]);

  const toggleGoal = (id: string) =>
    setGoals((g) => g.includes(id) ? g.filter(x => x !== id) : [...g, id]);

  const canNext = () => {
    if (step === 0) return fullName.trim().length > 0;
    if (step === 1) return goals.length > 0;
    if (step === 2) return wakeTime && sleepTime;
    if (step === 3) return true;
    if (step === 4) return monthlyBudget !== "" && Number(monthlyBudget) >= 0;
    if (step === 5) return !!chronotype;
    return false;
  };

  const next = () => setStep((s) => Math.min(STEPS_TOTAL - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("user_profiles").upsert({
      id: user.id,
      full_name: fullName,
      goals,
      wake_time: wakeTime,
      sleep_time: sleepTime,
      availability: { study_hours_per_day: studyHours },
      monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : null,
      chronotype,
      study_goals: goals.includes("study") ? `~${studyHours}h focused study/day` : null,
      nutrition_goals: goals.includes("health") ? "Balanced meals, consistent sleep" : null,
      onboarding_completed: true,
    });
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Fire-and-forget first AI plan
    supabase.functions.invoke("plan-day").catch(() => {});
    toast.success("You're all set — generating your first plan…");
    navigate("/app", { replace: true });
  };

  if (loading || checking) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>;
  }

  const progress = ((step + 1) / STEPS_TOTAL) * 100;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 md:p-8">
      <div className="pointer-events-none absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-primary/25 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[140px]" />

      <div className="relative z-10 glass-strong rounded-[2rem] p-6 md:p-10 w-full max-w-xl shadow-elevated animate-fade-in">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold tracking-tight">Zentryx</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{step + 1} / {STEPS_TOTAL}</span>
        </div>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden mb-8">
          <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div key={step} className="animate-fade-in space-y-6 min-h-[320px]">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Welcome 👋</h1>
                <p className="text-muted-foreground mt-2">Zentryx organizes your study, money, and health in one place. This takes 30 seconds.</p>
              </div>
              <div className="space-y-2">
                <Label>What should we call you?</Label>
                <Input autoFocus value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Your name" className="h-12 rounded-xl text-base" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">What do you want to focus on?</h2>
                <p className="text-muted-foreground mt-1 text-sm">Pick one or more. You can change this later.</p>
              </div>
              <div className="grid gap-3">
                {GOALS.map(({ id, label, desc, icon: Icon }) => {
                  const active = goals.includes(id);
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => toggleGoal(id)}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                        active ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                      {active && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Your daily rhythm</h2>
                <p className="text-muted-foreground mt-1 text-sm">We use this to plan your day around real life.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Wake up</Label>
                  <Input type="time" value={wakeTime} onChange={(e)=>setWakeTime(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Sleep</Label>
                  <Input type="time" value={sleepTime} onChange={(e)=>setSleepTime(e.target.value)} className="h-12 rounded-xl" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">How much can you commit?</h2>
                <p className="text-muted-foreground mt-1 text-sm">Realistic focused hours per day.</p>
              </div>
              <div className="rounded-2xl border-2 border-border p-6 text-center">
                <div className="font-display text-5xl font-bold tabular-nums">{studyHours}<span className="text-2xl text-muted-foreground">h</span></div>
                <div className="text-xs text-muted-foreground mt-1">per day</div>
                <input
                  type="range" min={1} max={10} step={1}
                  value={studyHours}
                  onChange={(e)=>setStudyHours(Number(e.target.value))}
                  className="w-full mt-5 accent-primary"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                  <span>1h</span><span>10h</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Monthly budget</h2>
                <p className="text-muted-foreground mt-1 text-sm">For tracking spending. Use 0 if you'd rather skip.</p>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number" min={0} step="1"
                    value={monthlyBudget}
                    onChange={(e)=>setMonthlyBudget(e.target.value)}
                    placeholder="1200"
                    className="h-12 rounded-xl pl-8 text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">When are you sharpest?</h2>
                <p className="text-muted-foreground mt-1 text-sm">We'll schedule deep work in your peak window.</p>
              </div>
              <div className="grid gap-3">
                {CHRONOTYPES.map(({ id, label, desc, icon: Icon }) => {
                  const active = chronotype === id;
                  return (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setChronotype(id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all",
                        active ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center",
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                      {active && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-8">
          <Button
            type="button" variant="ghost"
            onClick={back}
            disabled={step === 0 || saving}
            className="rounded-xl gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < STEPS_TOTAL - 1 ? (
            <Button
              type="button"
              onClick={next}
              disabled={!canNext()}
              className="h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 px-6"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={finish}
              disabled={!canNext() || saving}
              className="h-11 rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 px-6"
            >
              {saving ? "Setting up…" : <>Enter Zentryx <Sparkles className="h-4 w-4" /></>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
