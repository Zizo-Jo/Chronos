import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Brain, Clock, Target, Flame, BarChart3, Loader2, CheckCircle2, XCircle,
  Wallet, UtensilsCrossed, TrendingUp, Sun,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, Legend, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Focus = { duration_minutes: number; started_at: string };
type Task = { status: string; due_date: string | null; completed_at: string | null; estimated_minutes: number | null; created_at: string };
type Study = { duration_minutes: number; started_at: string };
type Expense = { amount: number; occurred_at: string; category: string };
type MealPlan = { week_start: string; cooked: boolean };

const DAY_MS = 86400000;
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d = new Date()) { const x = startOfDay(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; }
function fmtDay(d: Date) { return d.toLocaleDateString(undefined, { weekday: "short" }); }

export default function Analytics() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [focus, setFocus] = useState<Focus[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [study, setStudy] = useState<Study[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const week = new Date(); week.setDate(week.getDate() - 6); week.setHours(0,0,0,0);
      const month = new Date(); month.setDate(month.getDate() - 29); month.setHours(0,0,0,0);
      const eightWeeks = new Date(); eightWeeks.setDate(eightWeeks.getDate() - 55); eightWeeks.setHours(0,0,0,0);

      const [f, t, s, e, m] = await Promise.all([
        supabase.from("focus_sessions").select("duration_minutes, started_at").eq("completed", true).gte("started_at", eightWeeks.toISOString()),
        supabase.from("tasks").select("status, due_date, completed_at, estimated_minutes, created_at").gte("created_at", eightWeeks.toISOString()),
        supabase.from("study_sessions").select("duration_minutes, started_at").gte("started_at", eightWeeks.toISOString()),
        supabase.from("expenses").select("amount, occurred_at, category").gte("occurred_at", month.toISOString()),
        supabase.from("meal_plans").select("week_start, cooked").gte("week_start", eightWeeks.toISOString().slice(0,10)),
      ]);
      setFocus((f.data ?? []) as any);
      setTasks((t.data ?? []) as any);
      setStudy((s.data ?? []) as any);
      setExpenses((e.data ?? []) as any);
      setMeals((m.data ?? []) as any);
      setLoading(false);
    })();
  }, [user]);

  // ---- Focus per day (last 7) + score ----
  const days7 = useMemo(() => {
    const out: { d: string; date: Date; mins: number; score: number }[] = [];
    const today = startOfDay();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today); day.setDate(today.getDate() - i);
      const next = new Date(day.getTime() + DAY_MS);
      const mins = focus.filter(x => {
        const t = new Date(x.started_at).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).reduce((s, r) => s + (r.duration_minutes || 0), 0);
      out.push({ d: fmtDay(day), date: day, mins, score: Math.min(100, Math.round((mins / 240) * 100)) });
    }
    return out;
  }, [focus]);

  const avgFocus = useMemo(() => {
    const non = days7.filter(d => d.score > 0);
    return non.length ? Math.round(non.reduce((s,d)=>s+d.score,0) / non.length) : 0;
  }, [days7]);

  // ---- Planned vs actual (per day, last 7) ----
  const plannedActual = useMemo(() => {
    const today = startOfDay();
    return days7.map((row) => {
      const next = new Date(row.date.getTime() + DAY_MS);
      // Planned = sum of estimated_minutes for tasks due that day
      const planned = tasks
        .filter(t => t.due_date && new Date(t.due_date) >= row.date && new Date(t.due_date) < next)
        .reduce((s, t) => s + (t.estimated_minutes || 30), 0);
      return { d: row.d, planned, actual: row.mins };
    });
  }, [days7, tasks]);

  // ---- Tasks completed / missed ----
  const taskStats = useMemo(() => {
    const now = new Date();
    let completed = 0, missed = 0;
    for (const t of tasks) {
      if (t.status === "done" || t.completed_at) completed++;
      else if (t.due_date && new Date(t.due_date) < now) missed++;
    }
    return { completed, missed, completionRate: completed + missed > 0 ? Math.round((completed / (completed + missed)) * 100) : 0 };
  }, [tasks]);

  // ---- Study hours per week (last 8 weeks) ----
  const studyWeeks = useMemo(() => {
    const out: { w: string; hours: number }[] = [];
    const thisWeek = startOfWeek();
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(thisWeek); ws.setDate(thisWeek.getDate() - i * 7);
      const we = new Date(ws.getTime() + 7 * DAY_MS);
      const mins = study.filter(s => {
        const t = new Date(s.started_at).getTime();
        return t >= ws.getTime() && t < we.getTime();
      }).reduce((s, r) => s + (r.duration_minutes || 0), 0);
      out.push({ w: `${ws.getMonth()+1}/${ws.getDate()}`, hours: +(mins / 60).toFixed(1) });
    }
    return out;
  }, [study]);

  // ---- Spending trends (last 30 days) ----
  const spendDays = useMemo(() => {
    const out: { d: string; total: number }[] = [];
    const today = startOfDay();
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today); day.setDate(today.getDate() - i);
      const next = new Date(day.getTime() + DAY_MS);
      const total = expenses.filter(e => {
        const t = new Date(e.occurred_at).getTime();
        return t >= day.getTime() && t < next.getTime();
      }).reduce((s, r) => s + Number(r.amount || 0), 0);
      out.push({ d: `${day.getMonth()+1}/${day.getDate()}`, total: +total.toFixed(2) });
    }
    return out;
  }, [expenses]);
  const spendTotal = useMemo(() => spendDays.reduce((s, r) => s + r.total, 0), [spendDays]);

  // ---- Meal plan adherence (this week) ----
  const mealAdherence = useMemo(() => {
    const ws = startOfWeek().toISOString().slice(0,10);
    const week = meals.filter(m => m.week_start === ws);
    if (week.length === 0) return { rate: 0, cooked: 0, total: 0 };
    const cooked = week.filter(m => m.cooked).length;
    return { rate: Math.round((cooked / week.length) * 100), cooked, total: week.length };
  }, [meals]);

  // ---- Peak productivity windows ----
  const peakHours = useMemo(() => {
    const buckets = Array.from({ length: 6 }, (_, i) => ({
      label: ["12-4a","4-8a","8a-12p","12-4p","4-8p","8p-12a"][i],
      mins: 0,
    }));
    for (const f of focus) {
      const h = new Date(f.started_at).getHours();
      buckets[Math.floor(h / 4)].mins += f.duration_minutes || 0;
    }
    const peak = buckets.reduce((m, b) => b.mins > m.mins ? b : m, buckets[0]);
    return { buckets, peak };
  }, [focus]);

  const hasData = focus.length || tasks.length || study.length || expenses.length || meals.length;

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <PageHeader title={t("app.pages.analyticsTitle")} subtitle={t("app.pages.analyticsSubtitle")} />
        <div className="glass rounded-3xl p-16 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto"/></div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <PageHeader title={t("app.pages.analyticsTitle")} subtitle={t("app.pages.analyticsSubtitle")} />
        <div className="glass rounded-3xl p-16 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40"/>
          <p>No analytics yet.</p>
          <p className="text-xs mt-2">Use the app a bit — your trends will show up here.</p>
        </div>
      </div>
    );
  }

  const tooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 };
  const axisProps = { stroke: "hsl(var(--muted-foreground))", fontSize: 11, tickLine: false, axisLine: false } as const;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title={t("app.pages.analyticsTitle")} subtitle={t("app.pages.analyticsSubtitle")} />

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Focus Score" value={avgFocus || "—"} hint="last 7 days" icon={<Target className="h-4 w-4"/>} accent />
        <StatCard label="Tasks Done" value={taskStats.completed} hint={`${taskStats.completionRate}% completion`} icon={<CheckCircle2 className="h-4 w-4"/>} />
        <StatCard label="Missed" value={taskStats.missed} hint="overdue & open" icon={<XCircle className="h-4 w-4"/>} />
        <StatCard label="Peak Window" value={peakHours.peak.mins > 0 ? peakHours.peak.label : "—"} hint="most focused hours" icon={<Sun className="h-4 w-4"/>} />
      </div>

      {/* Planned vs Actual + Focus score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6">
          <h2 className="font-display text-xl font-semibold mb-1">Planned vs Actual</h2>
          <p className="text-sm text-muted-foreground mb-4">Minutes planned (tasks due) vs minutes actually focused</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plannedActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false}/>
                <XAxis dataKey="d" {...axisProps}/>
                <YAxis {...axisProps}/>
                <Tooltip cursor={{fill: "hsl(var(--muted) / 0.3)"}} contentStyle={tooltipStyle}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Bar dataKey="planned" name="Planned (min)" fill="hsl(var(--muted-foreground) / 0.5)" radius={[8,8,0,0]}/>
                <Bar dataKey="actual" name="Actual (min)" fill="hsl(var(--primary))" radius={[8,8,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="font-display text-xl font-semibold mb-1">Focus Score</h2>
          <p className="text-sm text-muted-foreground mb-4">Daily focus quality (0–100)</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days7}>
                <defs>
                  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" {...axisProps}/>
                <Tooltip cursor={{fill: "hsl(var(--muted) / 0.3)"}} contentStyle={tooltipStyle}/>
                <Bar dataKey="score" fill="url(#bg)" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Study hours + Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-xl font-semibold">Study Hours / Week</h2>
            <Brain className="h-4 w-4 text-muted-foreground"/>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Last 8 weeks</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studyWeeks}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false}/>
                <XAxis dataKey="w" {...axisProps}/>
                <YAxis {...axisProps}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-xl font-semibold">Spending Trend</h2>
            <Wallet className="h-4 w-4 text-muted-foreground"/>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Last 30 days · total <span className="text-foreground font-medium">${spendTotal.toFixed(2)}</span></p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendDays}>
                <defs>
                  <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false}/>
                <XAxis dataKey="d" {...axisProps} interval={4}/>
                <YAxis {...axisProps}/>
                <Tooltip contentStyle={tooltipStyle}/>
                <Area type="monotone" dataKey="total" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#spend)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Peak productivity + Meal adherence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-xl font-semibold">Peak Productivity Windows</h2>
            <TrendingUp className="h-4 w-4 text-muted-foreground"/>
          </div>
          <p className="text-sm text-muted-foreground mb-4">When you focus most (minutes by 4-hour window)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false}/>
                <XAxis dataKey="label" {...axisProps}/>
                <YAxis {...axisProps}/>
                <Tooltip cursor={{fill: "hsl(var(--muted) / 0.3)"}} contentStyle={tooltipStyle}/>
                <Bar dataKey="mins" radius={[10,10,0,0]}>
                  {peakHours.buckets.map((b, i) => (
                    <Cell key={i} fill={b.label === peakHours.peak.label ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {peakHours.peak.mins > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              You focus best between <span className="text-foreground font-medium">{peakHours.peak.label}</span> — schedule deep work then.
            </p>
          )}
        </div>

        <div className="glass rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-xl font-semibold">Meal Adherence</h2>
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground"/>
          </div>
          <p className="text-sm text-muted-foreground mb-6">This week's plan</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative h-40 w-40">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="hsl(var(--muted) / 0.4)" strokeWidth="8" fill="none"/>
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(mealAdherence.rate / 100) * 276} 276`}
                  style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-3xl font-bold">{mealAdherence.rate}%</p>
                <p className="text-xs text-muted-foreground">{mealAdherence.cooked}/{mealAdherence.total || 0} meals</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              {mealAdherence.total === 0 ? "No meal plan this week." : mealAdherence.rate >= 70 ? "On track 🎯" : "Try cooking 1 more meal this week."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
