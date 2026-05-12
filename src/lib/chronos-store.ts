import { useEffect, useState, useCallback } from "react";
import type { Task } from "./chronos-types";

const KEY = "chronos.tasks.v1";

function read(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
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
      if (bEnd) {
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

function addMinutes(t: string, m: number): string | null {
  const [h, mm] = t.split(":").map(Number);
  const total = h * 60 + mm + m;
  if (total >= 24 * 60) return null;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}
