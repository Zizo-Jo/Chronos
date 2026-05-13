# Chronos — MVP

Chronos is a calm, single-screen **weekly calendar + focus app** for students and routine-seekers.
It helps you plan tasks across the week, see only what matters *right now* via a Single-Focus view,
run a Pomodoro-style focus timer, and check whether your week is balanced — all without the noise of
a typical productivity tool.

Data is stored entirely in the browser (localStorage), so the MVP runs with **zero backend setup**.

---

## How to run

```bash
# 1. Install dependencies (one-time)
bun install        # or: npm install

# 2. Start the dev server
bun run dev        # or: npm run dev

# 3. Open the app
# → http://localhost:8080  (or whichever port Vite prints)
```

Tech stack: **React 19 + TanStack Start (Vite 7) + Tailwind v4 + shadcn/ui + Recharts**.

---

## How to use (quick tour)

1. Click **New task** (or double-click a day in the calendar) to add a task with title, description,
   category, date, and start/end time.
2. Switch tabs to:
   - **Calendar** — full weekly view, click any block to view / reschedule / delete
   - **Focus** — distraction-free dashboard showing only your current activity
   - **Timer** — pick a task and run a focus countdown (with audio alert)
   - **Dashboard** — pie chart of how your time is split across categories

---

## User-story → code map

The MVP implements **8 user stories** from the acceptance-criteria sheet. Each is mapped to the file(s)
that satisfy its acceptance criteria.

| Story | What it does | Where it lives in the code |
|---|---|---|
| **Story 1** — Add tasks to the calendar (title / start / end mandatory; end > start) | Validated form with inline error toasts for empty title, empty start, empty end, and end ≤ start | `src/components/chronos/TaskDialog.tsx` (`submit()`), validation rules in the same file |
| **Story 3** — "Single-Focus" dashboard showing only the current activity, advancing on completion | Hides past + future tasks; only shows the task whose time window contains *now*; "Mark completed" advances to the next scheduled task | `src/components/chronos/SingleFocus.tsx` |
| **Story 4** — Remove tasks from the calendar | Delete button in the task-detail dialog calls `remove(id)` and the entry disappears from the calendar | `src/components/chronos/WeeklyCalendar.tsx` (detail dialog) + `remove` in `src/lib/chronos-store.ts` |
| **Story 5** — Reschedule a task (change start / end) | "Reschedule" button reopens the same form pre-filled with the task; saving updates the entry | `src/components/chronos/WeeklyCalendar.tsx` → `TaskDialog.tsx` (edit mode) |
| **Story 6** — Clear, intuitive weekly calendar (visible schedule, color per category, current day/time highlighted, click for details) | Weekly grid with category color blocks, current-day column highlight, live "now" indicator line, click-to-open task details | `src/components/chronos/WeeklyCalendar.tsx`, color tokens in `src/styles.css` (`--cat-*`) |
| **Story 10** — Auto "Movement Snack" breaks for long study blocks (≥ 90 min) | When the calendar is updated, study blocks ≥ 90 min automatically get a 5-minute movement-break block scheduled right after | `applyMovementBreaks()` in `src/lib/chronos-store.ts` |
| **Story 13** — Dashboard pie chart of time distribution; same category colors as the calendar; auto-updates on changes | Recharts pie + breakdown bars sharing the same `--cat-*` CSS variables; recomputes via `useMemo` on every task change | `src/components/chronos/Dashboard.tsx` |
| **Story 16** — Simple focus timer; hides other tasks; audio alert on completion | Circular countdown bound to a chosen task, hides task picker while running, plays a Web-Audio beep + toast at 00:00 | `src/components/chronos/FocusTimer.tsx` (`beep()` + countdown effect) |

Supporting files:

- `src/routes/index.tsx` — single-page shell with tabs (Calendar / Focus / Timer / Dashboard) and the New-Task dialog wiring
- `src/lib/chronos-types.ts` — `Task` type and the shared category palette
- `src/lib/chronos-store.ts` — localStorage-backed task store + Story 10 movement-break logic
- `src/styles.css` — design tokens (including `--cat-study`, `--cat-gym`, `--cat-meal`, `--cat-life`, `--cat-other`, `--cat-break`)

---

## Notes

- This is an MVP: no auth, no sync, no AI. Everything is local-first to keep the focus on the
  acceptance criteria.
- To reset all data, run `localStorage.removeItem('chronos.tasks.v1')` in the browser console.
