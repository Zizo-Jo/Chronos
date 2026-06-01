export type Category = "study" | "gym" | "meal" | "life" | "other" | "break";

export const TASK_LIMITS = {
  TITLE_MAX: 30,
  DESCRIPTION_MAX: 100,
} as const;

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: Category;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  completed?: boolean;
  /** auto-generated movement break (story 10) */
  autoBreak?: boolean;
}

export const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: "study", label: "Study", color: "var(--cat-study)" },
  { value: "gym", label: "Gym", color: "var(--cat-gym)" },
  { value: "meal", label: "Meal", color: "var(--cat-meal)" },
  { value: "life", label: "Life", color: "var(--cat-life)" },
  { value: "other", label: "Other", color: "var(--cat-other)" },
  { value: "break", label: "Movement Break", color: "var(--cat-break)" },
];

export const catColor = (c: Category) =>
  CATEGORIES.find((x) => x.value === c)?.color ?? "var(--cat-other)";

/**
 * A task is "abandoned" when its end time is in the past but the user
 * never marked it complete. Auto-breaks are excluded.
 */
export function isAbandoned(t: Task, now: Date = new Date()): boolean {
  if (t.completed || t.autoBreak) return false;
  const [eh, em] = t.end.split(":").map(Number);
  const end = new Date(`${t.date}T00:00:00`);
  end.setHours(eh, em, 0, 0);
  return end.getTime() < now.getTime();
}

/**
 * True if the given date (YYYY-MM-DD) + time (HH:mm) is strictly before now.
 */
export function isPast(date: string, time: string, now: Date = new Date()): boolean {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.getTime() < now.getTime();
}
