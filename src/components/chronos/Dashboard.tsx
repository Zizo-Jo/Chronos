import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Task } from "@/lib/chronos-types";
import { CATEGORIES, catColor, isAbandoned } from "@/lib/chronos-types";
import { minutesBetween } from "@/lib/chronos-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  tasks: Task[];
}

// ---------- Range helpers (NEW) ----------
type RangeKey = "week" | "month" | "year" | "all";

// Returns [startDate, endDate] inclusive in YYYY-MM-DD, or null for "all".
function getRange(key: RangeKey, today = new Date()): [string, string] | null {
  if (key === "all") return null;
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  if (key === "week") {
    // Monday as start of week
    const dow = (t.getDay() + 6) % 7;
    const start = new Date(t);
    start.setDate(t.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return [fmt(start), fmt(end)];
  }
  if (key === "month") {
    const start = new Date(t.getFullYear(), t.getMonth(), 1);
    const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return [fmt(start), fmt(end)];
  }
  // year
  const start = new Date(t.getFullYear(), 0, 1);
  const end = new Date(t.getFullYear(), 11, 31);
  return [fmt(start), fmt(end)];
}

export function Dashboard({ tasks }: Props) {
  // ---------- NEW: filter state ----------
  const [range, setRange] = useState<RangeKey>("week");
  const [nameQuery, setNameQuery] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);

  const activeRange = useMemo(() => getRange(range), [range]);
  const rangeLabel = useMemo(() => {
    if (!activeRange) return "All time";
    const [s, e] = activeRange;
    return `${s} → ${e}`;
  }, [activeRange]);

  // ---------- NEW: filtered tasks (by date range + name) ----------
  const filteredTasks = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return tasks.filter((t) => {
      if (activeRange) {
        const [s, e] = activeRange;
        if (t.date < s || t.date > e) return false;
      }
      if (q && !t.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, activeRange, nameQuery]);

  // ---------- NEW: autocomplete suggestions from existing task names ----------
  const suggestions = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    const inRange = activeRange
      ? tasks.filter((t) => t.date >= activeRange[0] && t.date <= activeRange[1])
      : tasks;
    const names = Array.from(new Set(inRange.map((t) => t.title).filter(Boolean)));
    const matches = q ? names.filter((n) => n.toLowerCase().includes(q)) : names;
    return matches.slice(0, 8);
  }, [tasks, activeRange, nameQuery]);

  const data = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const t of filteredTasks) {
      const d = minutesBetween(t.start, t.end);
      if (d <= 0) continue;
      acc[t.category] = (acc[t.category] ?? 0) + d;
    }
    return CATEGORIES.map((c) => ({
      name: c.label,
      value: acc[c.value] ?? 0,
      color: c.color,
      key: c.value,
    })).filter((d) => d.value > 0);
  }, [filteredTasks]);

  const total = data.reduce((s, d) => s + d.value, 0);

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-6">
      {/* ---------- NEW: Filter bar (range + search w/ suggestions) ---------- */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-soft)] flex flex-col sm:flex-row gap-6 sm:gap-8 sm:items-end">
        <div className="flex-1">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Time range
          </Label>
          <div className="mt-3 inline-flex rounded-md border bg-background p-1 gap-1">
            {ranges.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`px-3 h-8 text-sm rounded transition-colors ${
                  range === r.key
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{rangeLabel}</p>
        </div>

        <div className="flex-1 relative">
          <Label htmlFor="filter-name" className="text-xs uppercase tracking-wider text-muted-foreground">
            Search task name
          </Label>
          <Input
            id="filter-name"
            placeholder="Type to search…"
            value={nameQuery}
            onChange={(e) => {
              setNameQuery(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 120)}
            autoComplete="off"
            className="mt-1.5"
          />
          {showSuggest && suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setNameQuery(s);
                    setShowSuggest(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setNameQuery("");
            setRange("week");
          }}
          className="h-10 px-4 rounded-md border text-sm hover:bg-muted transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-xl mb-1">Time distribution</h3>
          <p className="text-sm text-muted-foreground mb-4">
            How your scheduled hours split across categories
            <span className="text-foreground"> · {ranges.find((r) => r.key === range)?.label}</span>
            {nameQuery && <span className="text-foreground"> · “{nameQuery}”</span>}.
          </p>

          {total === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              No tasks match the current filters.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  >
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) =>
                      `${Math.round((v / total) * 100)}% (${Math.round((v / 60) * 10) / 10}h)`
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-xl mb-4">Breakdown</h3>
          <div className="space-y-3">
            {data.length === 0 && (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
            {data.map((d) => {
              const pct = total ? (d.value / total) * 100 : 0;
              return (
                <div key={d.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {Math.round((d.value / 60) * 10) / 10}h · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <Stat label="Matched tasks" value={filteredTasks.filter((t) => !t.autoBreak).length} />
            <Stat label="In range" value={`${Math.round((total / 60) * 10) / 10}h`} />
            <Stat
              label="Completed"
              value={filteredTasks.filter((t) => t.completed).length}
              color={catColor("meal")}
            />
            <Stat
              label="Abandoned"
              value={filteredTasks.filter((t) => isAbandoned(t)).length}
              color="var(--destructive)"
            />
          </div>

          {/* Abandoned task list */}
          {filteredTasks.some((t) => isAbandoned(t)) && (
            <div className="mt-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Abandoned tasks
              </h4>
              <ul className="space-y-1.5 max-h-44 overflow-auto">
                {filteredTasks
                  .filter((t) => isAbandoned(t))
                  .sort((a, b) => (a.date + a.start < b.date + b.start ? 1 : -1))
                  .map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between text-sm rounded-md border bg-background px-3 py-1.5"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: catColor(t.category) }}
                        />
                        <span className="truncate">{t.title}</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                        {t.date} · {t.start}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="font-display text-2xl" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
