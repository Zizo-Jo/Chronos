import type { Task } from "@/lib/chronos-types";
import { SingleFocus } from "./SingleFocus";
import { FocusTimer } from "./FocusTimer";

interface Props {
  tasks: Task[];
  onComplete: (id: string) => void;
}

/**
 * Combined Focus + Timer section.
 * Left: single-focus card (current/next task, mark complete early).
 * Right: Pomodoro-style focus timer tied to today's tasks.
 */
export function FocusSession({ tasks, onComplete }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SingleFocus tasks={tasks} onComplete={onComplete} />
      <FocusTimer tasks={tasks} />
    </div>
  );
}
