import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { Plus, CalendarDays, Target, Timer, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { useTasks } from "@/lib/chronos-store";
import type { Task } from "@/lib/chronos-types";
import { TaskDialog } from "@/components/chronos/TaskDialog";
import { WeeklyCalendar } from "@/components/chronos/WeeklyCalendar";
import { SingleFocus } from "@/components/chronos/SingleFocus";
import { FocusTimer } from "@/components/chronos/FocusTimer";
import { Dashboard } from "@/components/chronos/Dashboard";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Chronos — Your weekly focus calendar" },
      {
        name: "description",
        content:
          "Chronos is a clean, single-focus weekly calendar that helps students and routine-seekers plan, focus, and balance their time.",
      },
    ],
  }),
});

function Index() {
  const { tasks, add, update, remove } = useTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const openNew = (date?: string) => {
    setEditing(null);
    setDefaultDate(date);
    setDialogOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t);
    setDialogOpen(true);
  };
  const onSave = (t: Task) => {
    if (editing) update(editing.id, t);
    else add(t);
  };

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="oklch(0.55 0.2 268)" />
                  <stop offset="100%" stopColor="oklch(0.65 0.2 320)" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="13" stroke="url(#cg)" strokeWidth="2.25" />
              <path d="M16 8.5 V16 L21 19" stroke="url(#cg)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-lg tracking-tight">Chronos</span>
          </div>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-1" /> New task
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 sm:px-8 py-10 sm:py-14">
        <section className="mb-10 sm:mb-12">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Plan · Focus · Balance</p>
          <h2 className="font-display text-3xl sm:text-5xl leading-[1.05] max-w-3xl">
            Build a week that builds <span className="text-primary">you</span>.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl text-[15px] leading-relaxed">
            A calm weekly calendar with auto movement breaks, distraction-free focus, and a balance dashboard.
          </p>
        </section>

        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-xl h-10 bg-muted/60">
            <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1.5" />Calendar</TabsTrigger>
            <TabsTrigger value="focus"><Target className="h-4 w-4 mr-1.5" />Focus</TabsTrigger>
            <TabsTrigger value="timer"><Timer className="h-4 w-4 mr-1.5" />Timer</TabsTrigger>
            <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1.5" />Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <WeeklyCalendar tasks={tasks} onAdd={openNew} onEdit={openEdit} onDelete={remove} />
          </TabsContent>

          <TabsContent value="focus" className="mt-6">
            <SingleFocus
              tasks={tasks}
              onComplete={(id) => update(id, { completed: true })}
            />
          </TabsContent>

          <TabsContent value="timer" className="mt-6">
            <FocusTimer tasks={tasks} />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <Dashboard tasks={tasks} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mx-auto max-w-6xl px-5 sm:px-8 py-10 text-xs text-muted-foreground">
        Chronos MVP · data stored locally in your browser.
      </footer>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={defaultDate}
        initial={editing}
        onSave={onSave}
      />
    </div>
  );
}
