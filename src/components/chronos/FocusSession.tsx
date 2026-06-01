import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, CheckCircle2, Coffee } from "lucide-react";
import type { Task } from "@/lib/chronos-types";
import { catColor } from "@/lib/chronos-types";
import { minutesBetween } from "@/lib/chronos-store";
import { toast } from "sonner";

interface Props {
  tasks: Task[];
  onComplete: (id: string) => void;
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type WindowWithWebKitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as WindowWithWebKitAudioContext).webkitAudioContext;
    if (!Ctx) return;
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
    o.onended = () => {
      void ctx.close();
    };
  } catch {
    /* no-op */
  }
}

// Helper: Calculate exactly at what remaining seconds the main timer pauses for breaks
function getBreakIntercepts(
  totalDurationMinutes: number,
): { triggerSeconds: number; breakNumber: number }[] {
  const totalSeconds = totalDurationMinutes * 60;
  if (totalDurationMinutes >= 90 && totalDurationMinutes <= 120) {
    return [{ triggerSeconds: Math.floor(totalSeconds / 2), breakNumber: 1 }];
  }
  if (totalDurationMinutes > 120) {
    const oneThird = Math.floor(totalSeconds / 3);
    return [
      { triggerSeconds: oneThird * 2, breakNumber: 1 },
      { triggerSeconds: oneThird, breakNumber: 2 },
    ];
  }
  return [];
}

// Helper: Generates the live message for the bottom banner
function getBreakStatusMessage(currentSecondsLeft: number, totalDurationMinutes: number): string {
  if (totalDurationMinutes < 90) return "";
  const intercepts = getBreakIntercepts(totalDurationMinutes);
  const nextIntercept = intercepts.find((i) => currentSecondsLeft > i.triggerSeconds);

  if (nextIntercept) {
    const secondsToBreak = currentSecondsLeft - nextIntercept.triggerSeconds;
    const minsToBreak = Math.ceil(secondsToBreak / 60);
    const breakLabel =
      intercepts.length > 1 ? `movement break ${nextIntercept.breakNumber}` : "movement break";
    return `🏃‍♂️ ${minsToBreak} min${minsToBreak > 1 ? "s" : ""} remaining until ${breakLabel}`;
  }
  return "💪 Final stretch! Focus until the finish line.";
}

export function FocusSession({ tasks, onComplete }: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  const today = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [now]);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.date === today && !t.completed && !t.autoBreak)
        .sort((a, b) => toMin(a.start) - toMin(b.start)),
    [tasks, today],
  );

  const auto =
    todayTasks.find((t) => toMin(t.start) <= nowMin && toMin(t.end) > nowMin) ??
    todayTasks.find((t) => toMin(t.start) > nowMin) ??
    null;

  const [taskId, setTaskId] = useState<string>("");
  useEffect(() => {
    if (!taskId && auto) setTaskId(auto.id);
    if (taskId && !todayTasks.some((t) => t.id === taskId)) setTaskId(auto?.id ?? "");
  }, [auto, taskId, todayTasks]);

  const selected = todayTasks.find((t) => t.id === taskId) ?? auto ?? null;

  // --- Core Timer States ---
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // --- New Break States ---
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakRemaining, setBreakRemaining] = useState(5 * 60);

  const totalDurationMinutes = selected ? minutesBetween(selected.start, selected.end) : 0;

  useEffect(() => {
    if (!started && selected) {
      setRemaining(totalDurationMinutes * 60);
      setIsOnBreak(false);
    }
    if (!selected) {
      setRemaining(0);
      setRunning(false);
      setStarted(false);
      setIsOnBreak(false);
    }
  }, [selected, started, totalDurationMinutes]);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = window.setInterval(() => {
      // 1. If we are currently inside an active 5-minute movement snack
      if (isOnBreak) {
        setBreakRemaining((br) => {
          if (br <= 1) {
            setIsOnBreak(false);
            beep();
            toast.success("Break over! Back to work layout. 💪");
            return 0;
          }
          return br - 1;
        });
      } else {
        // 2. Standard Work Timer Countdown
        setRemaining((r) => {
          if (r <= 1) {
            window.clearInterval(intervalRef.current!);
            setRunning(false);
            beep();
            toast.success("Focus session completed! 🎉");
            return 0;
          }

          const nextSeconds = r - 1;
          const intercepts = getBreakIntercepts(totalDurationMinutes);
          const hitIntercept = intercepts.some((i) => i.triggerSeconds === nextSeconds);

          if (hitIntercept) {
            setIsOnBreak(true);
            setBreakRemaining(5 * 60); // Kickoff 5-minute break countdown
            beep();
            toast.info("Time for a movement break! Stand up and stretch 🏃‍♂️");
          }

          return nextSeconds;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, isOnBreak, totalDurationMinutes]);

  const start = () => {
    if (!selected) {
      toast.error("No task to focus on.");
      return;
    }
    if (!started) setStarted(true);
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    setStarted(false);
    setIsOnBreak(false);
    if (selected) setRemaining(totalDurationMinutes * 60);
  };

  const markCompleted = () => {
    if (!selected) return;
    setRunning(false);
    setStarted(false);
    setIsOnBreak(false);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    onComplete(selected.id);
    toast.success(`Marked "${selected.title}" as completed.`);
  };

  const totalSec = selected ? totalDurationMinutes * 60 : 0;
  const pct = totalSec ? (remaining / totalSec) * 100 : 0;

  // Format based on whether the break clock or main clock is active
  const displaySeconds = isOnBreak ? breakRemaining : remaining;
  const mm = String(Math.floor(displaySeconds / 60)).padStart(2, "0");
  const ss = String(displaySeconds % 60).padStart(2, "0");

  if (!selected) {
    return (
      <div className="rounded-2xl border bg-card p-12 shadow-[var(--shadow-soft)] text-center">
        <Coffee className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="font-display text-3xl mt-4">Nothing to focus on</h2>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
          You have no remaining tasks scheduled for today. Add one in the calendar to start a focus
          session.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-8 sm:p-12 shadow-[var(--shadow-soft)]">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {isOnBreak
            ? "⚡ Movement Break"
            : running
              ? "Focusing on"
              : started
                ? "Paused"
                : "Up next"}
        </div>

        {!running && todayTasks.length > 1 && !isOnBreak && (
          <select
            value={selected.id}
            onChange={(e) => {
              setStarted(false);
              setRunning(false);
              setTaskId(e.target.value);
            }}
            className="mt-3 h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {todayTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.start}–{t.end} · {t.title}
              </option>
            ))}
          </select>
        )}

        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold text-white"
          style={{ background: isOnBreak ? "#22c55e" : catColor(selected.category) }}
        >
          {isOnBreak ? "BREAK" : selected.category.toUpperCase()}
        </div>
        <h1 className="font-display text-4xl sm:text-5xl mt-4 leading-tight [overflow-wrap:anywhere]">
          {isOnBreak ? "Time to Move & Stretch!" : selected.title}
        </h1>
        <div className="mt-2 text-sm text-muted-foreground">
          {selected.start} → {selected.end} · {totalDurationMinutes} min
        </div>
      </div>

      <div className="relative mx-auto h-64 w-64 mt-8">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-muted)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isOnBreak ? "#22c55e" : catColor(selected.category)}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={
              isOnBreak ? `${(breakRemaining / 300) * 282.7} 282.7` : `${(pct / 100) * 282.7} 282.7`
            }
            style={{ transition: "stroke-dasharray 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-6xl tabular-nums">
            {mm}:{ss}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {isOnBreak ? "stretching" : running ? "in focus" : started ? "paused" : "ready"}
          </div>
        </div>
      </div>

      {/* ⚡ THE LIVE MOVEMENT BREAK SENTENCE SUB-BANNER */}
      {!isOnBreak && totalDurationMinutes >= 90 && (
        <p className="text-sm font-medium text-center text-emerald-600 dark:text-emerald-400 mt-6 animate-pulse">
          {getBreakStatusMessage(remaining, totalDurationMinutes)}
        </p>
      )}

      {isOnBreak && (
        <p className="text-sm font-medium text-center text-amber-500 mt-6 animate-bounce">
          🏃‍♂️ Step away from the screen, look far away, roll your shoulders!
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {!running ? (
          <Button size="lg" onClick={start}>
            <Play className="h-4 w-4 mr-2" /> {started ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={pause}>
            <Pause className="h-4 w-4 mr-2" /> Pause
          </Button>
        )}
        <Button size="lg" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset
        </Button>
        <Button
          size="lg"
          variant="default"
          onClick={markCompleted}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" /> Mark completed
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Timer length is auto-set from this task's calendar duration. Finishing early? Hit "Mark
        completed" to stop the timer and close out the task.
      </p>
    </div>
  );
}
