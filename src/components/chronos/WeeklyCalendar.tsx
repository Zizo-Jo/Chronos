import { useState, useMemo, useEffect } from "react";
import { addDays, format, startOfWeek, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Task } from "@/lib/chronos-types";
import { catColor, CATEGORIES } from "@/lib/chronos-types";
import { minutesBetween } from "@/lib/chronos-store";

interface Props {
  tasks: Task[];
  onAdd: (date: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}

const DAY_START = 6; // 6:00
const DAY_END = 23;  // 23:00
const HOUR_PX = 56;

export function WeeklyCalendar({ tasks, onAdd, onEdit, onDelete }: Props) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [now, setNow] = useState(new Date());
  const [selected, setSelected] = useState<Task | null>(null);

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  const weekStart = useMemo(() => startOfWeek(weekAnchor, { weekStartsOn: 1 }), [weekAnchor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const hours = useMemo(
    () => Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i),
    [],
  );

  const tasksByDay = (d: Date) => tasks.filter((t) => isSameDay(parseISO(t.date), d));

  return (
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekAnchor(new Date())}>
            Today
          </Button>
          <h2 className="font-display text-lg ml-2">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </h2>
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {CATEGORIES.map((c) => (
            <span key={c.value} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/40">
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, now);
          return (
            <div
              key={d.toISOString()}
              className={`px-2 py-2 text-center border-l ${isToday ? "bg-primary/10" : ""}`}
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {format(d, "EEE")}
              </div>
              <div className={`font-display text-lg ${isToday ? "text-primary" : ""}`}>
                {format(d, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
        {/* hours column */}
        <div>
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_PX }} className="text-[11px] text-muted-foreground pr-2 pt-1 text-right border-b">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((d) => {
          const dayTasks = tasksByDay(d);
          const isToday = isSameDay(d, now);
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const startMin = DAY_START * 60;
          const totalMin = (DAY_END - DAY_START + 1) * 60;
          const nowOffset = ((nowMin - startMin) / totalMin) * (HOUR_PX * (DAY_END - DAY_START + 1));

          return (
            <div
              key={d.toISOString()}
              className={`relative border-l ${isToday ? "bg-primary/[0.03]" : ""}`}
              onDoubleClick={() => onAdd(format(d, "yyyy-MM-dd"))}
            >
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="border-b border-dashed border-border/60" />
              ))}

              {dayTasks.map((t) => {
                const [sh, sm] = t.start.split(":").map(Number);
                const [eh, em] = t.end.split(":").map(Number);
                const top = ((sh * 60 + sm - startMin) / 60) * HOUR_PX;
                const height = Math.max(((eh - sh) * 60 + (em - sm)) / 60 * HOUR_PX, 22);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="absolute left-1 right-1 rounded-md px-2 py-1 text-left text-xs text-white shadow-sm hover:shadow-md transition-all hover:translate-y-[-1px] overflow-hidden"
                    style={{
                      top,
                      height,
                      background: catColor(t.category),
                      opacity: t.completed ? 0.55 : 1,
                    }}
                  >
                    <div className="font-semibold leading-tight truncate">
                      {t.completed ? "✓ " : ""}{t.title}
                    </div>
                    <div className="opacity-90 text-[10px]">{t.start}–{t.end}</div>
                  </button>
                );
              })}

              {isToday && nowOffset >= 0 && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: nowOffset }}
                >
                  <div className="h-px bg-destructive shadow-[0_0_8px_oklch(0.6_0.22_25)]" />
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <span>Double-click a day to add a task</span>
        <Button size="sm" onClick={() => onAdd(format(new Date(), "yyyy-MM-dd"))}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New task
        </Button>
      </div>

      {/* Task details (story 6.4) */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: catColor(selected.category) }} />
                  <DialogTitle className="font-display text-2xl">{selected.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="grid gap-2 text-sm">
                <div><span className="text-muted-foreground">When: </span>
                  {format(parseISO(selected.date), "EEE, MMM d")} · {selected.start} – {selected.end}
                  <span className="text-muted-foreground"> ({minutesBetween(selected.start, selected.end)} min)</span>
                </div>
                <div><span className="text-muted-foreground">Category: </span>{selected.category}</div>
                {selected.description && <p className="mt-1 text-foreground/90">{selected.description}</p>}
                {selected.autoBreak && (
                  <p className="text-xs text-muted-foreground mt-1">Auto-scheduled movement break.</p>
                )}
              </div>
              <DialogFooter className="gap-2">
                {!selected.autoBreak && (
                  <>
                    <Button variant="destructive" onClick={() => { onDelete(selected.id); setSelected(null); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                    <Button onClick={() => { onEdit(selected); setSelected(null); }}>
                      <Pencil className="h-4 w-4 mr-1" /> Reschedule
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
