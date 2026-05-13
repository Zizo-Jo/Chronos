import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { Task } from "@/lib/chronos-types";
import { catColor } from "@/lib/chronos-types";
import { toast } from "sonner";

interface Props {
  tasks: Task[];
}

const PRESETS = [15, 25, 45];

function beep() {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.type = "sine";
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    o.start();
    o.stop(ctx.currentTime + 1.3);
  } catch {
    /* no-op */
  }
}

export function FocusTimer({ tasks }: Props) {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const intervalRef = useRef<number | null>(null);

  const selected = tasks.find((t) => t.id === taskId) ?? null;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(intervalRef.current!);
          setRunning(false);
          beep();
          toast.success("Focus session completed! 🎉");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = () => {
    if (!selected) {
      toast.error("Pick a task first.");
      return;
    }
    if (remaining === 0) setRemaining(minutes * 60);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(minutes * 60);
  };

  const setPreset = (m: number) => {
    setMinutes(m);
    setRemaining(m * 60);
    setRunning(false);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const total = minutes * 60;
  const pct = total ? (remaining / total) * 100 : 0;

  const todayTasks = tasks.filter(
    (t) => !t.completed && !t.autoBreak && t.date === new Date().toISOString().slice(0, 10),
  );

  return (
    <div className="rounded-2xl border bg-card p-8 shadow-[var(--shadow-soft)]">
      {running && selected ? (
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Focusing on</div>
          <div className="font-display text-2xl mt-1">{selected.title}</div>
          <p className="text-xs text-muted-foreground mt-2">Other tasks are hidden — stay on this one.</p>
        </div>
      ) : (
        <div className="mb-6">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Select task</label>
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className="mt-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Choose a task for today —</option>
            {todayTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.start} · {t.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative mx-auto h-64 w-64">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-muted)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={selected ? catColor(selected.category) : "var(--color-primary)"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 282.7} 282.7`}
            style={{ transition: "stroke-dasharray 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-6xl tabular-nums">{mm}:{ss}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {running ? "in focus" : "ready"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p}
            variant={minutes === p ? "default" : "outline"}
            size="sm"
            onClick={() => setPreset(p)}
            disabled={running}
          >
            {p}m
          </Button>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {!running ? (
          <Button size="lg" onClick={start}>
            <Play className="h-4 w-4 mr-2" /> Start Timer
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={() => setRunning(false)}>
            <Pause className="h-4 w-4 mr-2" /> Pause
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset
        </Button>
      </div>
    </div>
  );
}
