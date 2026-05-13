import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Flame, Sparkles, TrendingUp, Wallet, UtensilsCrossed, Target, ArrowRight, Play, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Schedule = { id: string; starts_at: string; title: string; location: string | null; category: string };
type Meal = { id: string; meal_type: string; name: string; calories: number; consumed_at: string };
type Expense = { amount: number; category: string; occurred_at: string };
type Budget = { category: string; monthly_limit: number };
type Task = { id: string; title: string; description: string | null; due_date: string | null; estimated_minutes: number | null; status: string };

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d = new Date()) { const x = startOfDay(d); x.setDate(x.getDate() - x.getDay()); return x; }
function startOfMonth(d = new Date()) { const x = startOfDay(d); x.setDate(1); return x; }

export default function Dashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [firstName, setFirstName] = useState<string>("");
  const [calorieTarget, setCalorieTarget] = useState<number | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number | null>(null);

  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [expensesWeek, setExpensesWeek] = useState<Expense[]>([]);
  const [expensesMonth, setExpensesMonth] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [focusToday, setFocusToday] = useState<number>(0);
  const [focusYesterday, setFocusYesterday] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = startOfDay();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const wkStart = startOfWeek();
    const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 7);
    const moStart = startOfMonth();

    (async () => {
      const [profileRes, schedRes, mealRes, expWkRes, expMoRes, budRes, focusTRes, focusYRes, habRes, taskRes] = await Promise.all([
        supabase.from("user_profiles").select("full_name, monthly_budget, nutrition_goals").eq("id", user.id).maybeSingle(),
        supabase.from("schedules").select("id, starts_at, title, location, category").gte("starts_at", today.toISOString()).lt("starts_at", tomorrow.toISOString()).order("starts_at"),
        supabase.from("meals").select("id, meal_type, name, calories, consumed_at").gte("consumed_at", today.toISOString()).lt("consumed_at", tomorrow.toISOString()).order("consumed_at"),
        supabase.from("expenses").select("amount, category, occurred_at").gte("occurred_at", wkStart.toISOString()).lt("occurred_at", wkEnd.toISOString()),
        supabase.from("expenses").select("amount, category, occurred_at").gte("occurred_at", moStart.toISOString()),
        supabase.from("budgets").select("category, monthly_limit"),
        supabase.from("focus_sessions").select("duration_minutes").eq("completed", true).gte("started_at", today.toISOString()).lt("started_at", tomorrow.toISOString()),
        supabase.from("focus_sessions").select("duration_minutes").eq("completed", true).gte("started_at", yesterday.toISOString()).lt("started_at", today.toISOString()),
        supabase.from("habits").select("current_streak").eq("active", true).order("current_streak", { ascending: false }).limit(1),
        supabase.from("tasks").select("id, title, description, due_date, estimated_minutes, status").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(1),
      ]);

      const fullName = profileRes.data?.full_name ?? user.email?.split("@")[0] ?? "";
      setFirstName(fullName.split(" ")[0] || "there");
      setMonthlyBudget(profileRes.data?.monthly_budget ? Number(profileRes.data.monthly_budget) : null);
      const ng = profileRes.data?.nutrition_goals?.match(/(\d{3,5})/);
      setCalorieTarget(ng ? parseInt(ng[1], 10) : null);

      setSchedule(schedRes.data ?? []);
      setMeals(mealRes.data ?? []);
      setExpensesWeek((expWkRes.data ?? []).map(e => ({ ...e, amount: Number(e.amount) })));
      setExpensesMonth((expMoRes.data ?? []).map(e => ({ ...e, amount: Number(e.amount) })));
      setBudgets((budRes.data ?? []).map(b => ({ ...b, monthly_limit: Number(b.monthly_limit) })));
      setFocusToday((focusTRes.data ?? []).reduce((s, r: any) => s + (r.duration_minutes || 0), 0));
      setFocusYesterday((focusYRes.data ?? []).reduce((s, r: any) => s + (r.duration_minutes || 0), 0));
      setStreak(habRes.data?.[0]?.current_streak ?? 0);
      setNextTask(taskRes.data?.[0] ?? null);
      setLoading(false);
    })();
  }, [user]);

  const planMyDay = async () => {
    if (!user || planning) return;
    setPlanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("plan-day");
      if (error) {
        const msg = (error as any)?.context?.error || error.message || "Failed to plan day";
        if (msg.includes("not connected")) toast.error("AI is not connected yet.");
        else if (msg.toLowerCase().includes("rate")) toast.error("Rate limit exceeded. Try again shortly.");
        else if (msg.toLowerCase().includes("credit")) toast.error("AI credits exhausted.");
        else toast.error(msg);
        return;
      }
      const blocks = (data as any)?.blocks ?? [];
      if (blocks.length === 0) {
        toast("No plan generated — add some tasks first.");
      } else {
        toast.success(`Day planned: ${blocks.length} blocks added.`);
      }
      // Refresh dashboard
      const today = startOfDay();
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      const { data: schedRefresh } = await supabase.from("schedules")
        .select("id, starts_at, title, location, category")
        .gte("starts_at", today.toISOString()).lt("starts_at", tomorrow.toISOString())
        .order("starts_at");
      setSchedule(schedRefresh ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to plan day");
    } finally {
      setPlanning(false);
    }
  };

  const caloriesToday = useMemo(() => meals.reduce((s, m) => s + (m.calories || 0), 0), [meals]);
  const spentMonth = useMemo(() => expensesMonth.reduce((s, e) => s + e.amount, 0), [expensesMonth]);
  const budgetLeft = monthlyBudget !== null ? monthlyBudget - spentMonth : null;
  const budgetPct = monthlyBudget && monthlyBudget > 0 ? Math.max(0, Math.min(100, (spentMonth / monthlyBudget) * 100)) : 0;

  const focusScore = useMemo(() => {
    // Score = % of a 4-hour deep work goal capped at 100
    const goal = 240;
    return Math.min(100, Math.round((focusToday / goal) * 100));
  }, [focusToday]);
  const focusDelta = focusYesterday > 0 ? Math.round(((focusToday - focusYesterday) / focusYesterday) * 100) : null;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expensesWeek) map[e.category] = (map[e.category] || 0) + e.amount;
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 3);
  }, [expensesWeek]);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(i18n.language || undefined, { weekday: "long", month: "long", day: "numeric" });
  const greeting = today.getHours() < 12
    ? t("app.pages.greetingMorning")
    : today.getHours() < 18
      ? t("app.pages.greetingAfternoon")
      : t("app.pages.greetingEvening");

  const now = Date.now();
  const activeIdx = schedule.findIndex((s, i) => {
    const start = new Date(s.starts_at).getTime();
    const next = schedule[i + 1] ? new Date(schedule[i + 1].starts_at).getTime() : start + 60 * 60 * 1000;
    return now >= start && now < next;
  });

  return (
    <div className="space-y-8 max-w-[1500px] mx-auto animate-fade-in">
      {/* Command Center hero */}
      <section className="relative overflow-hidden rounded-[2rem] glass-strong p-7 md:p-10">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gradient-primary opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">{dateLabel}</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              {greeting},<br className="sm:hidden" /> <span className="gradient-text">{firstName || "there"}</span>.
            </h1>
            <p className="text-muted-foreground mt-3 max-w-md leading-relaxed">
              {loading
                ? t("dashboard.gatheringDay")
                : schedule.length === 0 && !nextTask
                  ? t("dashboard.quietCenter")
                  : `${t("dashboard.eventsAhead", { count: schedule.length })}${nextTask ? t("dashboard.withTaskFocus") : ""}.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Link to="/app/focus">
              <Button variant="outline" className="rounded-xl glass border-glass-border gap-2 h-11 px-5 whitespace-nowrap">
                <Play className="h-4 w-4" /> {t("app.pages.focusBtn")}
              </Button>
            </Link>
            <Button
              onClick={planMyDay}
              disabled={planning}
              className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 h-11 px-6 whitespace-nowrap"
            >
              <Sparkles className={`h-4 w-4 ${planning ? "animate-pulse" : ""}`} />
              {planning ? t("app.pages.planning") : t("app.pages.planMyDay")}
            </Button>
          </div>
        </div>
      </section>

      {/* Top metrics */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[148px] rounded-3xl" />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t("app.pages.focusScore")}
          value={focusToday === 0 ? "—" : focusScore}
          hint={focusToday === 0 ? "No focus yet today" : focusDelta === null ? `${focusToday} min today` : `${focusDelta >= 0 ? "+" : ""}${focusDelta}% vs yesterday`}
          icon={<Target className="h-4 w-4" />}
          accent
        >
          <div className="mt-4 h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${focusScore}%` }} />
          </div>
        </StatCard>
        <StatCard
          label={t("app.pages.budgetLeft")}
          value={budgetLeft === null ? "—" : `$${Math.max(0, budgetLeft).toFixed(0)}`}
          hint={monthlyBudget === null ? "Set a monthly budget" : `of $${monthlyBudget.toFixed(0)} monthly`}
          icon={<Wallet className="h-4 w-4" />}
        >
          <div className="mt-4 h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${budgetPct}%` }} />
          </div>
        </StatCard>
        <StatCard
          label={t("app.pages.caloriesToday")}
          value={meals.length === 0 ? "—" : caloriesToday.toLocaleString()}
          hint={calorieTarget ? `of ${calorieTarget.toLocaleString()} target` : meals.length === 0 ? "Log a meal to start" : `${meals.length} meal${meals.length === 1 ? "" : "s"} logged`}
          icon={<UtensilsCrossed className="h-4 w-4" />}
        >
          <div className="mt-4 flex gap-1">
            {["breakfast","lunch","snack","dinner"].map((mt, i) => {
              const has = meals.some(m => m.meal_type === mt);
              return <div key={i} className={`h-1.5 flex-1 rounded-full ${has ? "bg-primary-glow" : "bg-muted/40"}`} />;
            })}
          </div>
        </StatCard>
        <StatCard
          label={t("app.pages.streak")}
          value={streak === 0 ? "—" : <span className="flex items-center gap-2">{streak} <Flame className="h-6 w-6 text-orange-400" /></span>}
          hint={streak === 0 ? "Build a habit to start" : streak >= 7 ? "On fire!" : "Keep it going"}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's plan */}
        <div className="lg:col-span-8 glass rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold">{t("app.pages.todaysPlan")}</h2>
              <p className="text-sm text-muted-foreground">{schedule.length} event{schedule.length === 1 ? "" : "s"}</p>
            </div>
            <Link to="/app/calendar"><Button variant="ghost" size="sm" className="rounded-lg gap-1 whitespace-nowrap">{t("app.common.viewAll")} <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
              ))}
            </div>
          ) : schedule.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-5 w-5" />}
              title={t("app.pages.blankCanvas")}
              description={t("app.pages.blankCanvasDesc")}
              action={
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button size="sm" onClick={planMyDay} disabled={planning} className="rounded-lg bg-gradient-primary text-primary-foreground hover:opacity-90 gap-1.5 whitespace-nowrap">
                    <Sparkles className="h-3.5 w-3.5" /> {t("app.pages.planWithAi")}
                  </Button>
                  <Link to="/app/calendar">
                    <Button size="sm" variant="outline" className="rounded-lg gap-1.5 whitespace-nowrap"><Plus className="h-3.5 w-3.5" /> {t("app.pages.addEvent")}</Button>
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="space-y-2">
              {schedule.map((s, i) => {
                const time = new Date(s.starts_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
                const active = i === activeIdx;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      active ? "bg-gradient-primary/15 border border-primary/30 shadow-glow" : "hover:bg-secondary/40 border border-transparent"
                    }`}
                  >
                    <div className="font-mono text-sm text-muted-foreground w-14 tabular-nums">{time}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.title}</p>
                      {s.location && <p className="text-xs text-muted-foreground truncate">{s.location}</p>}
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full ${
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                    }`}>{s.category}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Next task hero */}
        <div className="lg:col-span-4 glass-strong rounded-3xl p-7 relative overflow-hidden gradient-border">
          <div className="absolute -top-20 -right-20 h-44 w-44 bg-gradient-primary opacity-30 blur-3xl" />
          <div className="relative z-10 flex flex-col h-full">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-2">{t("app.pages.nextUp")}</span>
            {nextTask ? (
              <>
                <h3 className="font-display text-2xl font-bold leading-tight mb-3 break-words">{nextTask.title}</h3>
                {nextTask.description && <p className="text-sm text-muted-foreground mb-6">{nextTask.description}</p>}
                <div className="space-y-3 mb-6">
                  {nextTask.estimated_minutes && (
                    <div className="flex items-center gap-3 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /> {nextTask.estimated_minutes} {t("app.common.minutes")}</div>
                  )}
                  {nextTask.due_date && (
                    <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /> Due {new Date(nextTask.due_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                  )}
                </div>
                <div className="mt-auto" />
                <Link to="/app/study"><Button className="w-full rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">{t("app.pages.openTask")}</Button></Link>
              </>
            ) : (
              <>
                <h3 className="font-display text-2xl font-bold leading-tight mb-3">{t("app.pages.nothingOnDeck")}</h3>
                <p className="text-sm text-muted-foreground mb-6">{t("app.pages.blankCanvasDesc")}</p>
                <div className="mt-auto" />
                <Link to="/app/study">
                  <Button className="w-full rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2">
                    <Plus className="h-4 w-4" /> {t("app.pages.createFirstTask")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Budget summary */}
        <div className="lg:col-span-4 glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Budget</h3>
            <Link to="/app/finance"><Button variant="ghost" size="sm" className="rounded-lg text-xs">Details</Button></Link>
          </div>
          <p className="font-display text-3xl font-bold">
            {budgetLeft === null ? "—" : `$${Math.max(0, budgetLeft).toFixed(2)}`}
          </p>
          <p className="text-xs text-muted-foreground mb-5">
            {monthlyBudget === null ? "Set a monthly budget in settings" : "Remaining this month"}
          </p>
          {categoryTotals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses logged this week.</p>
          ) : (
            <div className="space-y-3">
              {categoryTotals.map(([label, value], i) => {
                const max = categoryTotals[0][1] || 1;
                const pct = (value / max) * 100;
                const colors = ["bg-primary", "bg-accent", "bg-primary-glow"];
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground capitalize">{label}</span><span className="font-medium">${value.toFixed(0)}</span></div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden"><div className={`h-full ${colors[i]} rounded-full`} style={{width: `${pct}%`}} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Meals */}
        <div className="lg:col-span-4 glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Today's Meals</h3>
            <Link to="/app/nutrition"><Button variant="ghost" size="sm" className="rounded-lg text-xs">Details</Button></Link>
          </div>
          {meals.length === 0 ? (
            <EmptyState
              compact
              icon={<UtensilsCrossed className="h-5 w-5" />}
              title="No meals yet"
              description="Log what you eat to track energy and nutrition."
              action={
                <Link to="/app/nutrition">
                  <Button size="sm" variant="outline" className="rounded-lg gap-1.5"><Plus className="h-3.5 w-3.5" /> Log a meal</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {meals.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/60">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.meal_type}</p>
                    <p className="text-sm font-medium">{m.name}</p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{m.calories} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI suggestion */}
        <div className="lg:col-span-4 glass-strong rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-glow" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center"><Sparkles className="h-3.5 w-3.5 text-primary-foreground" /></div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">AI Suggestion</p>
            </div>
            <p className="text-sm leading-relaxed mb-5">
              {focusToday === 0 && meals.length === 0
                ? "Start by logging a meal or running a focus session — I'll personalize tips as your data grows."
                : focusToday < 60
                  ? "You're under an hour of focus today. A 25-minute Pomodoro now could lift your score significantly."
                  : streak === 0
                    ? "Add a daily habit to build momentum — streaks compound fast."
                    : "Great pace today. Consider scheduling tomorrow's deep-work block while motivation is high."}
            </p>
            <div className="flex gap-2">
              <Link to="/app/assistant"><Button size="sm" className="rounded-lg bg-gradient-primary text-primary-foreground hover:opacity-90">Ask AI</Button></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
