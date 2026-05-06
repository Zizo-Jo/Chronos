import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee, BookOpen, Brain, Wind, Activity, Trophy, History, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const presets = [
  { name: "Deep Work", duration: 90, icon: Brain, type: "deep" },
  { name: "Pomodoro", duration: 25, icon: BookOpen, type: "pomodoro" },
  { name: "Quick Sprint", duration: 15, icon: Coffee, type: "sprint" },
] as const;

const breakSuggestions = [
  "Stretch your shoulders & neck for 60 seconds",
  "Drink a full glass of water",
  "Look at something 20ft away for 20 seconds (20-20-20 rule)",
  "Step outside for fresh air",
  "Do 10 squats or 10 push-ups",
  "Tidy your desk for 2 minutes",
  "Walk to another room and back",
];

const movementSnacks = [
  "20 jumping jacks",
  "10 desk push-ups",
  "30s plank",
  "Walk 50 steps",
  "Shoulder rolls x 10",
  "Calf raises x 20",
];

type Session = {
  id: string;
  duration_minutes: number;
  session_type: string;
  notes: string | null;
  started_at: string;
  completed: boolean;
};

type Task = { id: string; title: string; status: string };

export default function Focus() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [minutesToday, setMinutesToday] = useState(0);
  const [history, setHistory] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState<string>("");
  const [showBreak, setShowBreak] = useState(false);
  const [breakTip, setBreakTip] = useState("");
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"in" | "hold" | "out">("in");
  const [snackTimer, setSnackTimer] = useState(true);
  const tickRef = useRef<number>();
  const breathRef = useRef<number>();
  const snackRef = useRef<number>();

  const currentTask = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);
  const focusPoints = useMemo(
    () => history.reduce((s, r) => s + Math.round(r.duration_minutes / 5), 0),
    [history]
  );

  useEffect(() => { setRemaining(duration * 60); setRunning(false); }, [duration]);

  // Timer tick
  useEffect(() => {
    if (!running) return;
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          logSession();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running]);

  // Movement snack reminders every 30 min while running
  useEffect(() => {
    if (!running || !snackTimer) return;
    snackRef.current = window.setInterval(() => {
      const tip = movementSnacks[Math.floor(Math.random() * movementSnacks.length)];
      toast("🤸 Movement snack", { description: tip });
    }, 30 * 60 * 1000);
    return () => clearInterval(snackRef.current);
  }, [running, snackTimer]);

  // Breathing animation cycle (4-7-8)
  useEffect(() => {
    if (!showBreathing) return;
    const cycle = () => {
      setBreathPhase("in");
      const t1 = window.setTimeout(() => setBreathPhase("hold"), 4000);
      const t2 = window.setTimeout(() => setBreathPhase("out"), 4000 + 7000);
      const t3 = window.setTimeout(cycle, 4000 + 7000 + 8000);
      breathRef.current = t3;
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    };
    const cleanup = cycle();
    return cleanup;
  }, [showBreathing]);

  const loadAll = async () => {
    if (!user) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const [{ data: todayData }, { data: hist }, { data: t }] = await Promise.all([
      supabase.from("focus_sessions").select("duration_minutes").gte("started_at", today.toISOString()),
      supabase.from("focus_sessions").select("*").order("started_at", { ascending: false }).limit(20),
      supabase.from("tasks").select("id,title,status").neq("status", "done").order("created_at", { ascending: false }).limit(50),
    ]);
    if (todayData) {
      setSessionsToday(todayData.length);
      setMinutesToday(todayData.reduce((s, r) => s + r.duration_minutes, 0));
    }
    if (hist) setHistory(hist as Session[]);
    if (t) setTasks(t as Task[]);
  };
  useEffect(() => { loadAll(); }, [user]);

  const logSession = async () => {
    if (!user) return;
    const session_type = duration === 90 ? "deep" : duration === 25 ? "pomodoro" : duration <= 15 ? "sprint" : "custom";
    const note = currentTask ? `Task: ${currentTask.title}` : null;
    await supabase.from("focus_sessions").insert({
      user_id: user.id, duration_minutes: duration, session_type, notes: note,
    });
    const points = Math.round(duration / 5);
    toast.success(`Session complete! +${points} focus points 🎯`);
    setBreakTip(breakSuggestions[Math.floor(Math.random() * breakSuggestions.length)]);
    setShowBreak(true);
    loadAll();
  };

  const total = duration * 60;
  const pct = ((total - remaining) / total) * 100;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={t("app.pages.focusTitle")} subtitle={t("app.pages.focusSubtitle")} />

      <div className="glass-strong rounded-[2.5rem] p-10 md:p-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-60" />
        <div className="relative z-10">
          <div className="relative mx-auto w-72 h-72 md:w-80 md:h-80 flex items-center justify-center mb-8">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" stroke="hsl(var(--muted) / 0.4)" strokeWidth="3" fill="none" />
              <circle
                cx="50" cy="50" r="46" fill="none"
                stroke="url(#focus-grad)" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 289} 289`}
                style={{ transition: "stroke-dasharray 1s linear" }}
              />
              <defs>
                <linearGradient id="focus-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            <div className={`relative ${running ? "animate-pulse-glow rounded-full" : ""}`}>
              <p className="font-display text-6xl md:text-7xl font-bold tabular-nums tracking-tighter">{mm}:{ss}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">{running ? t("app.pages.inFlow") : t("app.pages.paused")}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center mb-8">
            <Button
              size="lg"
              onClick={() => setRunning((r) => !r)}
              className="h-14 px-8 rounded-2xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2"
            >
              {running ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
              {running ? t("app.pages.pause") : t("app.pages.start")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => setRemaining(duration*60)} className="h-14 rounded-2xl glass border-glass-border">
              <RotateCcw className="h-5 w-5"/>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            {presets.map((p) => (
              <button
                key={p.name}
                onClick={() => setDuration(p.duration)}
                className={`glass rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 ${duration === p.duration ? "ring-2 ring-primary shadow-glow" : ""}`}
              >
                <p.icon className="h-4 w-4 text-primary mb-2" />
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.duration} min</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current task + quick actions */}
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Current task</p>
          </div>
          <Select value={taskId} onValueChange={setTaskId}>
            <SelectTrigger className="rounded-xl glass border-glass-border">
              <SelectValue placeholder="Pick a task to focus on (optional)" />
            </SelectTrigger>
            <SelectContent>
              {tasks.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No open tasks</div>}
              {tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
          {currentTask && (
            <p className="text-sm mt-3 text-muted-foreground">Focusing on: <span className="text-foreground font-medium">{currentTask.title}</span></p>
          )}
        </div>
        <div className="glass rounded-2xl p-4 flex flex-col gap-2">
          <Button variant="outline" className="rounded-xl glass border-glass-border justify-start gap-2" onClick={() => setShowBreathing(true)}>
            <Wind className="h-4 w-4 text-primary" /> Breathing exercise
          </Button>
          <Button variant="outline" className="rounded-xl glass border-glass-border justify-start gap-2" onClick={() => {
            const tip = movementSnacks[Math.floor(Math.random() * movementSnacks.length)];
            toast("🤸 Movement snack", { description: tip });
          }}>
            <Activity className="h-4 w-4 text-primary" /> Movement snack
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground px-1 mt-1">
            <input type="checkbox" checked={snackTimer} onChange={(e) => setSnackTimer(e.target.checked)} />
            Reminders every 30 min
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-4 text-center"><p className="font-display text-2xl font-bold">{sessionsToday}</p><p className="text-xs text-muted-foreground">sessions today</p></div>
        <div className="glass rounded-2xl p-4 text-center"><p className="font-display text-2xl font-bold">{Math.floor(minutesToday/60)}h {minutesToday%60}m</p><p className="text-xs text-muted-foreground">deep work</p></div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="font-display text-2xl font-bold">{minutesToday === 0 ? "—" : Math.min(100, Math.round((minutesToday / 240) * 100))}</p>
          <p className="text-xs text-muted-foreground">focus score</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="font-display text-2xl font-bold">{focusPoints}</p>
          </div>
          <p className="text-xs text-muted-foreground">focus points</p>
        </div>
      </div>

      {/* Session history */}
      <div className="mt-6 glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold">Session history</h2>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet — start your first focus block.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {history.map((s) => (
              <li key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.notes || `${s.session_type} session`}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{s.duration_minutes}m</span>
                  <span className="inline-flex items-center gap-1 text-xs text-primary"><Trophy className="h-3 w-3" />+{Math.round(s.duration_minutes/5)}</span>
                  {s.completed && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Break suggestion dialog */}
      <Dialog open={showBreak} onOpenChange={setShowBreak}>
        <DialogContent className="glass-strong rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Coffee className="h-5 w-5 text-primary"/> Take a break</DialogTitle>
            <DialogDescription>Recover before the next block.</DialogDescription>
          </DialogHeader>
          <p className="text-base">{breakTip}</p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBreakTip(breakSuggestions[Math.floor(Math.random() * breakSuggestions.length)])}>Another</Button>
            <Button className="rounded-xl bg-gradient-primary text-primary-foreground" onClick={() => { setShowBreak(false); setShowBreathing(true); }}>Breathe instead</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Breathing dialog (4-7-8) */}
      <Dialog open={showBreathing} onOpenChange={(o) => { setShowBreathing(o); if (!o && breathRef.current) clearTimeout(breathRef.current); }}>
        <DialogContent className="glass-strong rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wind className="h-5 w-5 text-primary"/> 4-7-8 Breathing</DialogTitle>
            <DialogDescription>Inhale 4s, hold 7s, exhale 8s. Repeat.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            <div
              className="rounded-full bg-gradient-primary shadow-glow transition-all ease-in-out"
              style={{
                width: breathPhase === "in" ? 220 : breathPhase === "hold" ? 220 : 110,
                height: breathPhase === "in" ? 220 : breathPhase === "hold" ? 220 : 110,
                transitionDuration: breathPhase === "in" ? "4000ms" : breathPhase === "out" ? "8000ms" : "0ms",
              }}
            />
            <p className="mt-6 font-display text-2xl capitalize">{breathPhase === "in" ? "Inhale" : breathPhase === "hold" ? "Hold" : "Exhale"}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
