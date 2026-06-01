import { useEffect, useState, useCallback } from "react";
import { CATEGORIES, TIME_BOUNDARIES, type Category, type Task } from "./chronos-types";

const KEY = "chronos.tasks.v1";
const CATEGORY_VALUES = new Set<Category>(CATEGORIES.map((c) => c.value));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function read(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTask) : [];
  } catch {
    return [];
  }
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    (task.description === undefined || typeof task.description === "string") &&
    typeof task.category === "string" &&
    CATEGORY_VALUES.has(task.category as Category) &&
    typeof task.date === "string" &&
    DATE_RE.test(task.date) &&
    typeof task.start === "string" &&
    TIME_RE.test(task.start) &&
    typeof task.end === "string" &&
    TIME_RE.test(task.end) &&
    (task.completed === undefined || typeof task.completed === "boolean") &&
    (task.autoBreak === undefined || typeof task.autoBreak === "boolean")
  );
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => read());

  useEffect(() => {
    const sync = () => setTasks(read());
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const persist = useCallback((next: Task[]) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    notify();
  }, []);

  const add = useCallback(
    (t: Task) => {
      const next = [...read(), t];
      persist(applyMovementBreaks(next));
    },
    [persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<Task>) => {
      const next = read().map((t) => (t.id === id ? { ...t, ...patch } : t));
      persist(applyMovementBreaks(next));
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      const next = read().filter((t) => t.id !== id);
      persist(applyMovementBreaks(next));
    },
    [persist],
  );

  return { tasks, add, update, remove };
}

// Story 10 — schedule a 5-min movement break right after any study block ≥ 90 min
function applyMovementBreaks(tasks: Task[]): Task[] {
  const cleaned = tasks.filter((t) => !t.autoBreak);
  const breaks: Task[] = [];
  for (const t of cleaned) {
    if (t.category !== "study") continue;
    const dur = minutesBetween(t.start, t.end);
    if (dur >= 90) {
      const bStart = t.end;
      const bEnd = addMinutes(t.end, 5);
      if (
        bEnd &&
        timeToMinutes(bEnd) <= TIME_BOUNDARIES.LATEST_HOUR * 60 &&
        !hasOverlap(cleaned, t.id, t.date, bStart, bEnd)
      ) {
        breaks.push({
          id: `break-${t.id}`,
          title: "Movement Snack 🤸",
          description: "3–5 min stretch / walk to refresh blood flow & focus.",
          category: "break",
          date: t.date,
          start: bStart,
          end: bEnd,
          autoBreak: true,
        });
      }
    }
  }
  return [...cleaned, ...breaks];
}

export function minutesBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

function hasOverlap(tasks: Task[], sourceId: string, date: string, start: string, end: string) {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  return tasks.some(
    (t) =>
      t.id !== sourceId &&
      t.date === date &&
      startMin < timeToMinutes(t.end) &&
      endMin > timeToMinutes(t.start),
  );
}

function timeToMinutes(t: string) {
  const [h, mm] = t.split(":").map(Number);
  return h * 60 + mm;
}

function addMinutes(t: string, m: number): string | null {
  const [h, mm] = t.split(":").map(Number);
  const total = h * 60 + mm + m;
  if (total >= 24 * 60) return null;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
