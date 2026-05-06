import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Flame, CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Habit { id: string; name: string; target_per_week: number; current_streak: number; last_completed_at: string | null; }

export default function Habits() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_per_week: 7 });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("habits").select("*").eq("active", true).order("created_at", { ascending: false });
    if (data) setHabits(data as any);
  };
  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    const { error } = await supabase.from("habits").insert({ user_id: user.id, name: form.name, target_per_week: form.target_per_week });
    if (error) return toast.error(error.message);
    toast.success("Habit added");
    setOpen(false); setForm({ name: "", target_per_week: 7 }); load();
  };

  const checkIn = async (h: Habit) => {
    const lastDay = h.last_completed_at ? new Date(h.last_completed_at).toDateString() : "";
    const today = new Date().toDateString();
    if (lastDay === today) return toast("Already checked in today");
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = lastDay === yesterday ? h.current_streak + 1 : 1;
    const { error } = await supabase.from("habits").update({
      current_streak: newStreak, last_completed_at: new Date().toISOString(),
    }).eq("id", h.id);
    if (error) return toast.error(error.message);
    toast.success(`Streak: ${newStreak} 🔥`); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={t("app.pages.habitsTitle")} subtitle={t("app.pages.habitsSubtitle")}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2 whitespace-nowrap"><Plus className="h-4 w-4"/>{t("app.pages.newHabit")}</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>New habit</DialogTitle></DialogHeader>
              <form onSubmit={add} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input required value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="rounded-xl"/></div>
                <div className="space-y-2"><Label>Target per week</Label><Input type="number" min={1} max={7} value={form.target_per_week} onChange={(e)=>setForm({...form, target_per_week: +e.target.value})} className="rounded-xl"/></div>
                <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {habits.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <p className="text-sm text-muted-foreground">{t("app.pages.noHabits")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((h) => {
            const doneToday = h.last_completed_at && new Date(h.last_completed_at).toDateString() === new Date().toDateString();
            return (
              <div key={h.id} className="glass rounded-2xl p-5 flex items-center gap-4 group">
                <button onClick={() => checkIn(h)} className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${doneToday ? "bg-gradient-primary shadow-glow" : "bg-secondary hover:bg-primary/20"}`}>
                  <CheckCircle2 className={`h-5 w-5 ${doneToday ? "text-primary-foreground" : "text-muted-foreground"}`}/>
                </button>
                <div className="flex-1">
                  <p className="font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground">Target: {h.target_per_week}× / week</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <Flame className="h-4 w-4 text-orange-400"/>{h.current_streak}
                </div>
                <button onClick={() => remove(h.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive">
                  <Trash2 className="h-4 w-4"/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
