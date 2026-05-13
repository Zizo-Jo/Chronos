import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Coffee } from "lucide-react";
import type { Task } from "@/lib/chronos-types";
import { catColor } from "@/lib/chronos-types";
import { format, parseISO } from "date-fns";

interface Props {
  tasks: Task[];
  onComplete: (id: string) => void;
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function SingleFocus({ tasks, onComplete }: Props) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  const today = format(now, "yyyy-MM-dd");
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.date === today && !t.completed)
        .sort((a, b) => toMin(a.start) - toMin(b.start)),
    [tasks, today],
  );

  const current = todayTasks.find((t) => toMin(t.start) <= nowMin && toMin(t.end) > nowMin);
  const upcoming = todayTasks.find((t) => toMin(t.start) > nowMin);
  const focus = current ?? upcoming ?? null;

  return (
    <div className="rounded-2xl border bg-card p-8 sm:p-12 shadow-[var(--shadow-soft)] min-h-[420px] flex flex-col items-center justify-center text-center">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {format(now, "EEEE · HH:mm")}
      </div>

      {!focus ? (
        <div className="mt-8 space-y-3">
          <Coffee className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="font-display text-3xl">All clear for today</h2>
          <p className="text-muted-foreground max-w-sm">
            No more tasks scheduled. Time to rest, or add something new to your week.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 text-xs font-semibold text-muted-foreground">
            {current ? "RIGHT NOW" : "UP NEXT"}
          </div>
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold text-white"
            style={{ background: catColor(focus.category) }}
          >
            {focus.category.toUpperCase()}
          </div>
          <h1 className="font-display text-5xl sm:text-6xl mt-6 max-w-2xl leading-tight">
            {focus.title}
          </h1>
          {focus.description && (
            <p className="mt-4 text-muted-foreground max-w-md">{focus.description}</p>
          )}
          <div className="mt-6 text-2xl font-display text-foreground/80">
            {focus.start} <span className="text-muted-foreground">→</span> {focus.end}
          </div>
          {focus.date && (
            <div className="mt-1 text-xs text-muted-foreground">
              {format(parseISO(focus.date), "EEE, MMM d")}
            </div>
          )}

          {current && (
            <Button size="lg" className="mt-10" onClick={() => onComplete(current.id)}>
              <CheckCircle2 className="h-5 w-5 mr-2" /> Mark completed
            </Button>
          )}
        </>
      )}

      <div className="mt-10 text-xs text-muted-foreground">
        {todayTasks.length} task{todayTasks.length === 1 ? "" : "s"} remaining today
      </div>
    </div>
  );
}
