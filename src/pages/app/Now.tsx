import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Coffee } from "lucide-react";
import { toast } from "sonner";

type Block = { id: string; title: string; starts_at: string; ends_at: string; category: string; location: string | null; notes: string | null };

const categoryStyle: Record<string, string> = {
  class: "from-primary to-primary-glow",
  study: "from-primary-glow to-accent",
  focus: "from-accent to-primary",
  meal: "from-orange-400 to-amber-500",
  habit: "from-emerald-400 to-emerald-600",
  break: "from-muted-foreground/40 to-muted-foreground/20",
  other: "from-secondary to-secondary",
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Now() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [now, setNow] = useState(new Date());
  const [recovering, setRecovering] = useState(false);
  const [recoveryPlan, setRecoveryPlan] = useState<string | null>(null);
  const [recoveryFor, setRecoveryFor] = useState<string>("");

  const load = async () => {
    if (!user) return;
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const { data } = await supabase.from("schedules")
      .select("id, title, starts_at, ends_at, category, location, notes")
      .gte("starts_at", dayStart.toISOString()).lt("starts_at", dayEnd.toISOString())
      .order("starts_at");
    setBlocks((data ?? []) as any);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { current, next, missed } = useMemo(() => {
    const t = now.getTime();
    const sorted = [...blocks].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const current = sorted.find((b) => new Date(b.starts_at).getTime() <= t && new Date(b.ends_at).getTime() > t) || null;
    const next = sorted.find((b) => new Date(b.starts_at).getTime() > t) || null;
    const missed = sorted.filter((b) => new Date(b.ends_at).getTime() <= t);
    return { current, next, missed };
  }, [blocks, now]);

  const progress = useMemo(() => {
    if (!current) return 0;
    const s = new Date(current.starts_at).getTime();
    const e = new Date(current.ends_at).getTime();
    return Math.max(0, Math.min(100, ((now.getTime() - s) / (e - s)) * 100));
  }, [current, now]);

  const minsLeft = current ? Math.max(0, Math.round((new Date(current.ends_at).getTime() - now.getTime()) / 60000)) : 0;

  const askRecovery = async (block: Block) => {
    setRecovering(true);
    setRecoveryFor(block.title);
    setRecoveryPlan(null);
    const { data, error } = await supabase.functions.invoke("recovery-plan", {
      body: { missed_title: block.title, missed_at: block.starts_at, missed_notes: block.notes || "" },
    });
    setRecovering(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Couldn't get plan");
      return;
    }
    setRecoveryPlan((data as any).plan);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Right now</p>
        <p className="font-mono text-2xl mt-1">{fmtTime(now)}</p>
      </div>

      {current ? (
        <div className={`relative rounded-[2rem] p-10 md:p-14 bg-gradient-to-br ${categoryStyle[current.category] || categoryStyle.other} text-primary-foreground shadow-elevated overflow-hidden`}>
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-widest opacity-80">{current.category}</p>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mt-2 leading-[1.05]">{current.title}</h1>
            {current.location && <p className="opacity-80 mt-2">{current.location}</p>}
            <p className="mt-6 font-mono text-lg">{fmtTime(new Date(current.starts_at))} – {fmtTime(new Date(current.ends_at))}</p>
            <p className="mt-1 text-sm opacity-80">{minsLeft} min remaining</p>
            <div className="mt-6 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white/90 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      ) : next ? (
        <div className="glass rounded-[2rem] p-10 md:p-14 text-center">
          <Coffee className="h-10 w-10 mx-auto text-primary mb-4" />
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Free time</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">Nothing scheduled right now</h1>
          <p className="text-muted-foreground mt-4">Next up at {fmtTime(new Date(next.starts_at))}</p>
          <p className="font-display text-xl mt-1">{next.title}</p>
        </div>
      ) : (
        <div className="glass rounded-[2rem] p-10 md:p-14 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-4" />
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Day complete</h1>
          <p className="text-muted-foreground mt-3">Nothing left on the schedule today.</p>
        </div>
      )}

      {next && current && (
        <div className="glass rounded-2xl p-4 mt-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Up next</p>
            <p className="font-medium">{next.title}</p>
          </div>
          <p className="font-mono text-sm text-muted-foreground">{fmtTime(new Date(next.starts_at))}</p>
        </div>
      )}

      {missed.length > 0 && (
        <div className="glass rounded-3xl p-6 mt-6">
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400"/>Missed today
          </h2>
          <p className="text-xs text-muted-foreground mb-4">If something didn't happen as planned, ask AI for a recovery plan.</p>
          <div className="space-y-2">
            {missed.slice(-5).reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.category} · {fmtTime(new Date(m.starts_at))}</p>
                  <p className="font-medium text-sm truncate">{m.title}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg gap-2" onClick={()=>askRecovery(m)} disabled={recovering}>
                  {recovering && recoveryFor === m.title ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Sparkles className="h-3.5 w-3.5"/>}
                  Recover
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!recoveryPlan} onOpenChange={(o)=>{ if(!o) setRecoveryPlan(null); }}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader><DialogTitle>Recovery plan · {recoveryFor}</DialogTitle></DialogHeader>
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm">{recoveryPlan}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}