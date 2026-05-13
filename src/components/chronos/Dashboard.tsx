import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Task } from "@/lib/chronos-types";
import { CATEGORIES, catColor } from "@/lib/chronos-types";
import { minutesBetween } from "@/lib/chronos-store";

interface Props {
  tasks: Task[];
}

export function Dashboard({ tasks }: Props) {
  const data = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const t of tasks) {
      const d = Math.max(minutesBetween(t.start, t.end), 0);
      acc[t.category] = (acc[t.category] ?? 0) + d;
    }
    return CATEGORIES.map((c) => ({
      name: c.label,
      value: acc[c.value] ?? 0,
      color: c.color,
      key: c.value,
    })).filter((d) => d.value > 0);
  }, [tasks]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-xl mb-1">Time distribution</h3>
        <p className="text-sm text-muted-foreground mb-4">
          How your scheduled hours split across categories.
        </p>

        {total === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Add tasks to see your balance.
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
                  formatter={(v: number) => `${Math.round((v / total) * 100)}% (${Math.round(v / 60 * 10) / 10}h)`}
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
                    {Math.round(d.value / 60 * 10) / 10}h · {Math.round(pct)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Stat label="Total tasks" value={tasks.filter((t) => !t.autoBreak).length} />
          <Stat label="Scheduled" value={`${Math.round(total / 60 * 10) / 10}h`} />
          <Stat
            label="Completed"
            value={tasks.filter((t) => t.completed).length}
            color={catColor("meal")}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="font-display text-2xl" style={color ? { color } : undefined}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
