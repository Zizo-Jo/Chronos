import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Event = { id: string; title: string; starts_at: string; ends_at: string; category: string; location?: string | null };

const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const hours = Array.from({ length: 14 }, (_, i) => 7 + i); // 7 AM .. 8 PM

function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; }

const categoryColor: Record<string, string> = {
  class: "bg-gradient-primary",
  study: "bg-primary-glow/70",
  focus: "bg-accent/70",
  meal: "bg-orange-400/70",
  habit: "bg-emerald-500/70",
  break: "bg-muted",
  other: "bg-secondary",
};

export default function CalendarPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoForm, setAutoForm] = useState({ date: new Date().toISOString().slice(0, 10), buffer: "10" });
  const [autoLoading, setAutoLoading] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", start: "", end: "", category: "class", location: "" });

  const weekEnd = useMemo(() => { const e = new Date(weekStart); e.setDate(e.getDate()+7); return e; }, [weekStart]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("schedules")
      .select("id, title, starts_at, ends_at, category, location")
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .order("starts_at");
    setEvents((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user, weekStart]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const starts_at = new Date(`${form.date}T${form.start}`).toISOString();
    const ends_at = new Date(`${form.date}T${form.end}`).toISOString();
    const { error } = await supabase.from("schedules").insert({
      user_id: user.id, title: form.title, starts_at, ends_at, category: form.category, location: form.location || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Event added");
    setOpen(false);
    setForm({ title: "", date: "", start: "", end: "", category: "class", location: "" });
    load();
  };

  const monthLabel = weekStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const runAutoSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAutoLoading(true);
    const { data, error } = await supabase.functions.invoke("auto-schedule", {
      body: { date: autoForm.date, buffer_minutes: Number(autoForm.buffer) || 10 },
    });
    setAutoLoading(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Couldn't auto-schedule");
      return;
    }
    toast.success(`Filled ${(data as any)?.inserted ?? 0} blocks`);
    setAutoOpen(false);
    load();
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title={t("app.pages.calendarTitle")} subtitle={`${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${monthLabel}`}
        action={<div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-xl glass border-glass-border" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }}><ChevronLeft className="h-4 w-4"/></Button>
          <Button variant="outline" size="icon" className="rounded-xl glass border-glass-border" onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }}><ChevronRight className="h-4 w-4"/></Button>
          <Dialog open={autoOpen} onOpenChange={setAutoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl glass border-glass-border gap-2"><Sparkles className="h-4 w-4"/>Auto-schedule</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Auto-schedule a day</DialogTitle></DialogHeader>
              <form onSubmit={runAutoSchedule} className="space-y-4">
                <p className="text-sm text-muted-foreground">AI fills the gaps around your fixed commitments (class, work, gym, appointments) with study, focus, meal, and break blocks. Existing auto-filled blocks for that day are replaced.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Date</Label>
                    <Input required type="date" value={autoForm.date} onChange={(e)=>setAutoForm({...autoForm, date: e.target.value})} className="rounded-xl"/>
                  </div>
                  <div className="space-y-2"><Label>Buffer (min)</Label>
                    <Input required type="number" min={0} max={60} value={autoForm.buffer} onChange={(e)=>setAutoForm({...autoForm, buffer: e.target.value})} className="rounded-xl"/>
                  </div>
                </div>
                <Button type="submit" disabled={autoLoading} className="w-full rounded-xl bg-gradient-primary text-primary-foreground gap-2">
                  {autoLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>Planning…</> : <><Sparkles className="h-4 w-4"/>Fill my day</>}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2"><Plus className="h-4 w-4"/>Add event</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
              <form onSubmit={add} className="space-y-4">
                <div className="space-y-2"><Label>Title</Label><Input required value={form.title} onChange={(e)=>setForm({...form, title: e.target.value})} className="rounded-xl"/></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-3"><Label>Date</Label><Input required type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} className="rounded-xl"/></div>
                  <div className="space-y-2"><Label>Start</Label><Input required type="time" value={form.start} onChange={(e)=>setForm({...form, start: e.target.value})} className="rounded-xl"/></div>
                  <div className="space-y-2"><Label>End</Label><Input required type="time" value={form.end} onChange={(e)=>setForm({...form, end: e.target.value})} className="rounded-xl"/></div>
                  <div className="space-y-2"><Label>Category</Label>
                    <Select value={form.category} onValueChange={(v)=>setForm({...form, category: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                      <SelectContent>{Object.keys(categoryColor).map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Location (optional)</Label><Input value={form.location} onChange={(e)=>setForm({...form, location: e.target.value})} className="rounded-xl"/></div>
                <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>} />

      <div className="glass rounded-3xl p-4 md:p-6 overflow-x-auto">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto"/></div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalIcon className="h-10 w-10 mx-auto mb-3 opacity-40"/>
            <p>No events yet for this week.</p>
          </div>
        ) : (
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-2 mb-2">
            <div></div>
            {dayNames.map((d, i) => {
              const dt = new Date(weekStart); dt.setDate(dt.getDate() + i);
              const isToday = dt.toDateString() === new Date().toDateString();
              return (
                <div key={d} className={`text-center py-2 rounded-xl ${isToday ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  <p className="text-[10px] uppercase tracking-widest">{d}</p>
                  <p className="font-display font-semibold">{dt.getDate()}</p>
                </div>
              );
            })}
          </div>

          <div className="relative grid grid-cols-[60px_repeat(7,1fr)] gap-2">
            {hours.map((h) => (
              <div key={h} className="contents">
                <div className="text-xs text-muted-foreground font-mono pt-1">{String(h).padStart(2,"0")}:00</div>
                {dayNames.map((_, di) => (<div key={di} className="h-14 rounded-lg border border-border/30"></div>))}
              </div>
            ))}
            {events.map((ev) => {
              const start = new Date(ev.starts_at);
              const end = new Date(ev.ends_at);
              const day = Math.floor((start.getTime() - weekStart.getTime()) / 86400000);
              if (day < 0 || day > 6) return null;
              const startH = start.getHours() + start.getMinutes() / 60;
              const lenH = Math.max(0.5, (end.getTime() - start.getTime()) / 3600000);
              if (startH < hours[0] || startH > hours[hours.length - 1] + 1) return null;
              return (
                <div key={ev.id}
                  className={`absolute ${categoryColor[ev.category] || "bg-secondary"} rounded-xl px-2 py-1.5 text-xs font-medium text-white shadow-card overflow-hidden`}
                  style={{
                    left: `calc(60px + ((100% - 60px) / 7) * ${day} + 8px)`,
                    width: `calc(((100% - 60px) / 7) - 16px)`,
                    top: `${(startH - hours[0]) * 64}px`,
                    height: `${lenH * 64 - 8}px`,
                  }}>
                  <p className="truncate">{ev.title}</p>
                  {ev.location && <p className="text-[10px] opacity-80 truncate">{ev.location}</p>}
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}