import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Sparkles } from "lucide-react"; // 👈 Añadido Sparkles para el botón mágico
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  TASK_LIMITS,
  TIME_BOUNDARIES,
  type Task,
  type Category,
  isPast,
} from "@/lib/chronos-types";
import { minutesBetween } from "@/lib/chronos-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string;
  defaultStart?: string;
  initial?: Task | null;
  onSave: (t: Task) => void;
  tasks: Task[]; // 👈 ¡NUEVO! Ahora el diálogo conoce todas las tareas del sistema
}

const addHour = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const nh = Math.min(TIME_BOUNDARIES.LATEST_HOUR, (h ?? 0) + 1);
  return `${String(nh).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const isTimeWithinBoundaries = (time: string): boolean => {
  const minutes = timeToMinutes(time);
  const earliestMinutes = TIME_BOUNDARIES.EARLIEST_HOUR * 60;
  const latestMinutes = TIME_BOUNDARIES.LATEST_HOUR * 60;
  return minutes >= earliestMinutes && minutes <= latestMinutes;
};

const createTaskId = () => {
  const randomUUID = globalThis.crypto?.randomUUID;
  return typeof randomUUID === "function"
    ? randomUUID.call(globalThis.crypto)
    : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function TaskDialog({
  open,
  onOpenChange,
  defaultDate,
  defaultStart,
  initial,
  onSave,
  tasks,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("study");
  const [date, setDate] = useState(defaultDate ?? toISO(new Date()));
  const [start, setStart] = useState(defaultStart ?? "09:00");
  const [end, setEnd] = useState(defaultStart ? addHour(defaultStart) : "10:00");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setTitle(initial.title);
        setDescription(initial.description ?? "");
        setCategory(initial.category);
        setDate(initial.date);
        setStart(initial.start);
        setEnd(initial.end);
      } else {
        setTitle("");
        setDescription("");
        setCategory("study");
        setDate(defaultDate ?? toISO(new Date()));
        setStart(defaultStart ?? "09:00");
        setEnd(defaultStart ? addHour(defaultStart) : "10:00");
      }
    }
  }, [open, initial, defaultDate, defaultStart]);

  // ---------- Algoritmo de Auto-Reschedule ----------
  // ---------- Advanced Future-Only Multi-Day Auto-Reschedule ----------
  const handleAutoReschedule = () => {
    // 1. Calculate current duration (default to 60 mins if invalid)
    const currentDuration = minutesBetween(start, end);
    const duration = currentDuration > 0 ? currentDuration : 60;

    const timeToMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const minToTime = (m: number) => {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };

    // Strict 09:00 to 21:00 operational window constraints
    const ALLOWED_START = 9 * 60; // 540 mins
    const ALLOWED_END = 21 * 60; // 1260 mins

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // If the currently selected date is in the past, start searching from today
    let checkDate = fromISO(date);
    if (date < todayStr) {
      checkDate = fromISO(todayStr);
    }

    let foundSlot = false;
    let finalDateStr = date;
    let finalStartMin = 0;

    // Look ahead up to 7 days to find a free opening
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;

      let searchStartMin = ALLOWED_START;

      // CRITICAL FIX: If we are scanning today, start searching from right NOW (rounded up to next 15-min mark)
      if (currentDateStr === todayStr) {
        const currentMin = now.getHours() * 60 + now.getMinutes();
        const roundedCurrentMin = Math.ceil(currentMin / 15) * 15;
        searchStartMin = Math.max(ALLOWED_START, roundedCurrentMin);
      }

      // Gather existing busy blocks for this specific iteration date
      const dayTasks = tasks.filter((t) => t.date === currentDateStr && t.id !== initial?.id);
      const busyIntervals = dayTasks.map((t) => ({
        s: timeToMin(t.start),
        e: timeToMin(t.end),
      }));

      // Search through the day's available timeline step-by-step
      for (let current = searchStartMin; current + duration <= ALLOWED_END; current += 15) {
        const currentEnd = current + duration;
        const hasOverlap = busyIntervals.some((busy) => current < busy.e && currentEnd > busy.s);

        if (!hasOverlap) {
          finalStartMin = current;
          finalDateStr = currentDateStr;
          foundSlot = true;
          break; // Found an open slot! Exit inner loop
        }
      }

      if (foundSlot) break; // Exit multi-day search loop

      // Advance calendar object tracking to the next logical day
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // 4. Apply findings and alert user smoothly
    if (foundSlot) {
      const newStart = minToTime(finalStartMin);
      const newEnd = minToTime(finalStartMin + duration);

      setStart(newStart);
      setEnd(newEnd);
      setDate(finalDateStr); // Automatically shifts calendar date picker if forced into future days

      if (finalDateStr === date) {
        toast.success(`Smart slot found today! Shifted to ${newStart} – ${newEnd} ✨`);
      } else {
        toast.success(
          `Today was full/passed. Found slot on ${finalDateStr} at ${newStart} – ${newEnd} 📆`,
        );
      }
    } else {
      toast.error("No free slots available between 09:00 and 21:00 in the next 7 days.");
    }
  };

  const submit = () => {
    if (!title.trim()) return toast.error("Title is required.");
    if (title.length > TASK_LIMITS.TITLE_MAX)
      return toast.error(`Title must be ${TASK_LIMITS.TITLE_MAX} characters or less.`);
    if (description.length > TASK_LIMITS.DESCRIPTION_MAX)
      return toast.error(`Description must be ${TASK_LIMITS.DESCRIPTION_MAX} characters or less.`);
    if (!start) return toast.error("Beginning hour is required.");
    if (!end) return toast.error("Finishing hour is required.");
    if (!isTimeWithinBoundaries(start))
      return toast.error(
        `Start time must be between ${TIME_BOUNDARIES.EARLIEST_TIME} (6:00 AM) and ${TIME_BOUNDARIES.LATEST_TIME} (11:00 PM).`,
      );
    if (!isTimeWithinBoundaries(end))
      return toast.error(
        `End time must be between ${TIME_BOUNDARIES.EARLIEST_TIME} (6:00 AM) and ${TIME_BOUNDARIES.LATEST_TIME} (11:00 PM).`,
      );
    if (minutesBetween(start, end) <= 0)
      return toast.error("Finishing hour must be after the starting hour.");
    // Block scheduling in the past for NEW tasks. Rescheduling is allowed
    // (so users can fix an abandoned task by moving it forward).
    if (!initial && isPast(date, start)) {
      return toast.error(
        "You can't add a task before the current time. Pick a future slot or reschedule an existing task.",
      );
    }

    onSave({
      id: initial?.id ?? createTaskId(),
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date,
      start,
      end,
      completed: initial?.completed ?? false,
    });
    onOpenChange(false);
    toast.success(initial ? "Task rescheduled." : "Task added to calendar.");
  };

  const selectedDate = fromISO(date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Reschedule task" : "New task"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Title *</Label>
              <span
                className={`text-xs ${title.length > TASK_LIMITS.TITLE_MAX ? "text-red-500 font-semibold" : "text-muted-foreground"}`}
              >
                {title.length} / {TASK_LIMITS.TITLE_MAX}
              </span>
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Linear algebra study"
              maxLength={TASK_LIMITS.TITLE_MAX}
              className={title.length > TASK_LIMITS.TITLE_MAX ? "border-red-500 bg-red-50/30" : ""}
            />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="desc">Description</Label>
              <span
                className={`text-xs ${description.length > TASK_LIMITS.DESCRIPTION_MAX ? "text-red-500 font-semibold" : "text-muted-foreground"}`}
              >
                {description.length} / {TASK_LIMITS.DESCRIPTION_MAX}
              </span>
            </div>
            <Textarea
              id="desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={TASK_LIMITS.DESCRIPTION_MAX}
              className={
                description.length > TASK_LIMITS.DESCRIPTION_MAX
                  ? "border-red-500 bg-red-50/30"
                  : ""
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.filter((c) => c.value !== "break").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(selectedDate, "PPP", { locale: enUS })
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    locale={enUS}
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) {
                        setDate(toISO(d));
                        setPickerOpen(false);
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="start">Start</Label>
              <Input
                id="start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                min={TIME_BOUNDARIES.EARLIEST_TIME}
                max={TIME_BOUNDARIES.LATEST_TIME}
                className={!isTimeWithinBoundaries(start) ? "border-red-500 bg-red-50/30" : ""}
              />
              {!isTimeWithinBoundaries(start) && (
                <p className="text-xs text-red-500 font-semibold">
                  ⚠️ Must be between 6:00 AM and 11:00 PM
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="end">End</Label>
              <Input
                id="end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                min={TIME_BOUNDARIES.EARLIEST_TIME}
                max={TIME_BOUNDARIES.LATEST_TIME}
                className={!isTimeWithinBoundaries(end) ? "border-red-500 bg-red-50/30" : ""}
              />
              {!isTimeWithinBoundaries(end) && (
                <p className="text-xs text-red-500 font-semibold">
                  ⚠️ Must be between 6:00 AM and 11:00 PM
                </p>
              )}
            </div>
          </div>

          {/* ⚡ BOTÓN MÁGICO DE AUTO-RESCHEDULE AÑADIDO ABAJO DE LAS HORAS */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-1.5 mt-1"
            onClick={handleAutoReschedule}
          >
            <Sparkles className="h-3.5 w-3.5" /> Auto-Reschedule (Find Smart Slot)
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              title.length > TASK_LIMITS.TITLE_MAX ||
              description.length > TASK_LIMITS.DESCRIPTION_MAX ||
              !isTimeWithinBoundaries(start) ||
              !isTimeWithinBoundaries(end)
            }
          >
            {initial ? "Save changes" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
