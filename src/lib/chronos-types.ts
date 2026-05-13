export type Category = "study" | "gym" | "meal" | "life" | "other" | "break";

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
