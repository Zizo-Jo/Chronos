import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, Shield, User, Sparkles, Loader2, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";

type Profile = {
  full_name: string;
  university: string;
  major: string;
  monthly_budget: string;
  study_goals: string;
  nutrition_goals: string;
  wake_time: string;
  sleep_time: string;
  focus_style: string;
  planning_style: string;
  nutrition_preference: string;
};

const empty: Profile = {
  full_name: "", university: "", major: "", monthly_budget: "",
  study_goals: "", nutrition_goals: "", wake_time: "", sleep_time: "",
  focus_style: "", planning_style: "", nutrition_preference: "",
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("light", !dark); }, [dark]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("user_profiles")
        .select("full_name, university, major, monthly_budget, study_goals, nutrition_goals, wake_time, sleep_time, focus_style, planning_style, nutrition_preference")
        .eq("id", user.id).maybeSingle();
      setProfile({
        full_name: data?.full_name ?? "",
        university: data?.university ?? "",
        major: data?.major ?? "",
        monthly_budget: data?.monthly_budget != null ? String(data.monthly_budget) : "",
        study_goals: data?.study_goals ?? "",
        nutrition_goals: data?.nutrition_goals ?? "",
        wake_time: data?.wake_time ?? "",
        sleep_time: data?.sleep_time ?? "",
        focus_style: (data as any)?.focus_style ?? "",
        planning_style: (data as any)?.planning_style ?? "",
        nutrition_preference: (data as any)?.nutrition_preference ?? "",
      });
      setLoading(false);
    })();
  }, [user]);

  const set = (k: keyof Profile, v: string) => setProfile((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("user_profiles").update({
      full_name: profile.full_name || null,
      university: profile.university || null,
      major: profile.major || null,
      monthly_budget: profile.monthly_budget ? Number(profile.monthly_budget) : null,
      study_goals: profile.study_goals || null,
      nutrition_goals: profile.nutrition_goals || null,
      wake_time: profile.wake_time || null,
      sleep_time: profile.sleep_time || null,
      focus_style: profile.focus_style || null,
      planning_style: profile.planning_style || null,
      nutrition_preference: profile.nutrition_preference || null,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const tables = [
        "user_profiles","tasks","subjects","exams","study_blocks","study_sessions",
        "schedules","focus_sessions","habits","meals","meal_plans","grocery_items",
        "expenses","income","budgets","ai_messages","notifications","analytics_logs",
      ];
      const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: user.id, email: user.email };
      for (const t of tables) {
        const col = t === "user_profiles" ? "id" : "user_id";
        const { data } = await supabase.from(t as any).select("*").eq(col, user.id);
        out[t] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zentryx-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data was exported");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Your account was deleted");
      await signOut();
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Could not delete account");
    } finally {
      setDeleting(false);
    }
  };

  const Section = ({ icon: Icon, title, desc, children }: any) => (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="h-10 w-10 rounded-xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={t("app.pages.settingsTitle")} subtitle={t("app.pages.settingsSubtitle")} />

      {loading ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading your profile…
        </div>
      ) : (
      <div className="space-y-5">
        <Section icon={User} title="Profile" desc="Your personal info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label>
              <Input value={profile.full_name} onChange={(e)=>set("full_name", e.target.value)} placeholder="Your full name" className="rounded-xl"/>
            </div>
            <div className="space-y-2"><Label>Email</Label>
              <Input value={user?.email ?? ""} disabled className="rounded-xl"/>
            </div>
            <div className="space-y-2"><Label>University</Label>
              <Input value={profile.university} onChange={(e)=>set("university", e.target.value)} placeholder="e.g. MIT" className="rounded-xl"/>
            </div>
            <div className="space-y-2"><Label>Major</Label>
              <Input value={profile.major} onChange={(e)=>set("major", e.target.value)} placeholder="e.g. Mathematics" className="rounded-xl"/>
            </div>
            <div className="space-y-2"><Label>Monthly budget ($)</Label>
              <Input type="number" value={profile.monthly_budget} onChange={(e)=>set("monthly_budget", e.target.value)} placeholder="e.g. 800" className="rounded-xl"/>
            </div>
            <div className="space-y-2"><Label>Wake time</Label>
              <Input type="time" value={profile.wake_time} onChange={(e)=>set("wake_time", e.target.value)} className="rounded-xl"/>
            </div>
            <div className="space-y-2"><Label>Sleep time</Label>
              <Input type="time" value={profile.sleep_time} onChange={(e)=>set("sleep_time", e.target.value)} className="rounded-xl"/>
            </div>
          </div>
          <div className="space-y-2"><Label>Study goals</Label>
            <Textarea value={profile.study_goals} onChange={(e)=>set("study_goals", e.target.value)} placeholder="What do you want to achieve?" className="rounded-xl"/>
          </div>
          <div className="space-y-2"><Label>Nutrition goals</Label>
            <Textarea value={profile.nutrition_goals} onChange={(e)=>set("nutrition_goals", e.target.value)} placeholder="e.g. 2200 kcal, 150g protein" className="rounded-xl"/>
          </div>
        </Section>

        <Section icon={dark ? Moon : Sun} title="Appearance" desc="Theme and visual preferences">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Dark mode</p><p className="text-xs text-muted-foreground">Easier on the eyes at night</p></div>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </Section>

        <Section icon={Sparkles} title="AI Preferences" desc="How Zentryx assists you">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Focus style</Label>
              <Select value={profile.focus_style || undefined} onValueChange={(v)=>set("focus_style", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deep">Deep work</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="sprints">Short sprints</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Planning style</Label>
              <Select value={profile.planning_style || undefined} onValueChange={(v)=>set("planning_style", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nutrition preference</Label>
              <Select value={profile.nutrition_preference || undefined} onValueChange={(v)=>set("nutrition_preference", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="omnivore">Omnivore</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="pescatarian">Pescatarian</SelectItem>
                  <SelectItem value="high-protein">High protein</SelectItem>
                  <SelectItem value="low-carb">Low carb</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">The AI Assistant uses these preferences when planning your day, study and meals.</p>
        </Section>

        <Section icon={Shield} title="Privacy" desc="Your data, your rules">
          <div className="pt-2 flex flex-wrap gap-2">
            <Button onClick={exportData} disabled={exporting} variant="outline" className="rounded-xl glass border-glass-border gap-2">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export data
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 gap-2">
                  <Trash2 className="h-4 w-4" /> Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes your account and all your data — tasks, schedule, meals,
                    finance entries, focus history and chats. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAccount}
                    disabled={deleting}
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : "Yes, delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>

        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={save} disabled={saving} className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Saving</> : "Save changes"}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}