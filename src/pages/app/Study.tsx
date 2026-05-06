import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Clock, CheckCircle2, Circle, Trash2, BookOpen, GraduationCap,
  Sparkles, Loader2, CalendarClock, SkipForward, Hourglass, Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Subject { id: string; name: string; code: string | null; instructor: string | null; color: string; }
interface Exam { id: string; title: string; subject_id: string | null; exam_date: string; location: string | null; weight: number | null; notes: string | null; }
interface Task { id: string; title: string; course: string | null; subject_id: string | null; status: string; estimated_minutes: number | null; due_date: string | null; priority: string; }
interface StudyBlock {
  id: string; title: string; subject_id: string | null; task_id: string | null;
  scheduled_start: string; scheduled_end: string; duration_minutes: number;
  status: string; notes: string | null;
}

const SUBJECT_COLORS = ["#6366f1","#06b6d4","#10b981","#f59e0b","#ef4444","#a855f7","#ec4899","#14b8a6"];
const PLAN_WEEK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plan-week`;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function Study() {
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // dialog state
  const [subjOpen, setSubjOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [breakOpen, setBreakOpen] = useState(false);
  const [breakTask, setBreakTask] = useState<Task | null>(null);

  const [subjForm, setSubjForm] = useState({ name: "", code: "", instructor: "", color: SUBJECT_COLORS[0] });
  const [examForm, setExamForm] = useState({ title: "", subject_id: "", exam_date: "", location: "", weight: "", notes: "" });
  const [taskForm, setTaskForm] = useState({ title: "", subject_id: "", estimated_minutes: 60, priority: "medium", due_date: "", description: "" });
  const [breakForm, setBreakForm] = useState({ chunk_minutes: 30, count: 0 });

  const subjectsById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [s, e, t, b] = await Promise.all([
      supabase.from("subjects").select("*").order("created_at", { ascending: false }),
      supabase.from("exams").select("*").order("exam_date"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("study_blocks").select("*").order("scheduled_start"),
    ]);
    if (s.data) setSubjects(s.data as any);
    if (e.data) setExams(e.data as any);
    if (t.data) setTasks(t.data as any);
    if (b.data) setBlocks(b.data as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  // ---------- Subjects ----------
  const addSubject = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("subjects").insert({
      user_id: user.id, name: subjForm.name, code: subjForm.code || null,
      instructor: subjForm.instructor || null, color: subjForm.color,
    });
    if (error) return toast.error(error.message);
    toast.success("Subject added");
    setSubjOpen(false); setSubjForm({ name: "", code: "", instructor: "", color: SUBJECT_COLORS[0] });
    load();
  };
  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Subject removed"); load();
  };

  // ---------- Exams ----------
  const addExam = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("exams").insert({
      user_id: user.id,
      title: examForm.title,
      subject_id: examForm.subject_id || null,
      exam_date: new Date(examForm.exam_date).toISOString(),
      location: examForm.location || null,
      weight: examForm.weight ? Number(examForm.weight) : null,
      notes: examForm.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Exam added");
    setExamOpen(false);
    setExamForm({ title: "", subject_id: "", exam_date: "", location: "", weight: "", notes: "" });
    load();
  };
  const deleteExam = async (id: string) => {
    const { error } = await supabase.from("exams").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Exam removed"); load();
  };

  // ---------- Tasks ----------
  const addTask = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: taskForm.title,
      subject_id: taskForm.subject_id || null,
      course: taskForm.subject_id ? subjectsById[taskForm.subject_id]?.name ?? null : null,
      estimated_minutes: taskForm.estimated_minutes,
      priority: taskForm.priority,
      due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
      description: taskForm.description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Task added");
    setTaskOpen(false);
    setTaskForm({ title: "", subject_id: "", estimated_minutes: 60, priority: "medium", due_date: "", description: "" });
    load();
  };
  const toggleTask = async (t: Task) => {
    const next = t.status === "done" ? "todo" : "done";
    const { error } = await supabase.from("tasks").update({
      status: next, completed_at: next === "done" ? new Date().toISOString() : null,
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  };
  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Task removed"); load();
  };

  // ---------- Break into blocks ----------
  const openBreak = (t: Task) => {
    const total = t.estimated_minutes || 60;
    const chunk = 30;
    setBreakTask(t);
    setBreakForm({ chunk_minutes: chunk, count: Math.max(1, Math.ceil(total / chunk)) });
    setBreakOpen(true);
  };
  const submitBreak = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user || !breakTask) return;
    const startBase = new Date();
    startBase.setMinutes(0, 0, 0);
    if (startBase < new Date()) startBase.setHours(startBase.getHours() + 1);
    const rows = Array.from({ length: breakForm.count }).map((_, i) => {
      const start = new Date(startBase);
      start.setDate(start.getDate() + Math.floor(i / 4));
      start.setHours(start.getHours() + ((i % 4) * (breakForm.chunk_minutes + 10) / 60));
      const end = new Date(start.getTime() + breakForm.chunk_minutes * 60000);
      return {
        user_id: user.id,
        title: `${breakTask.title} — block ${i + 1}/${breakForm.count}`,
        subject_id: breakTask.subject_id,
        task_id: breakTask.id,
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        duration_minutes: breakForm.chunk_minutes,
        status: "planned",
        notes: "[manual-split]",
      };
    });
    const { error } = await supabase.from("study_blocks").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} study blocks created`);
    setBreakOpen(false); setBreakTask(null);
    load();
  };

  // ---------- Block status ----------
  const setBlockStatus = async (b: StudyBlock, status: "completed" | "skipped" | "delayed" | "planned") => {
    let updates: any = { status };
    if (status === "delayed") {
      const next = new Date(b.scheduled_start);
      next.setDate(next.getDate() + 1);
      const end = new Date(next.getTime() + b.duration_minutes * 60000);
      updates = { status: "planned", scheduled_start: next.toISOString(), scheduled_end: end.toISOString(), notes: `${b.notes || ""} [delayed]`.trim() };
    }
    const { error } = await supabase.from("study_blocks").update(updates).eq("id", b.id);
    if (error) return toast.error(error.message);
    if (status === "completed") {
      // also log a study session for analytics
      await supabase.from("study_sessions").insert({
        user_id: user!.id,
        subject: b.subject_id ? subjectsById[b.subject_id]?.name ?? "Study" : "Study",
        duration_minutes: b.duration_minutes,
      });
    }
    load();
  };
  const deleteBlock = async (id: string) => {
    const { error } = await supabase.from("study_blocks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  // ---------- AI weekly plan ----------
  const generateWeek = async () => {
    if (!session) { toast.error("Please sign in again"); return; }
    if (subjects.length === 0 && tasks.filter(t => t.status !== "done").length === 0) {
      toast.error("Add at least one subject or task first");
      return;
    }
    setGenerating(true);
    try {
      const resp = await fetch(PLAN_WEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to generate plan");
      toast.success(`Weekly plan ready — ${data.count ?? 0} blocks`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  // ---------- Derived ----------
  const today = new Date();
  const todayBlocks = blocks.filter((b) => isSameDay(new Date(b.scheduled_start), today))
    .sort((a, b) => +new Date(a.scheduled_start) - +new Date(b.scheduled_start));

  const weekBlocks = useMemo(() => {
    const days: Record<string, StudyBlock[]> = {};
    for (const b of blocks) {
      const d = new Date(b.scheduled_start);
      const key = d.toDateString();
      (days[key] ||= []).push(b);
    }
    return Object.entries(days)
      .sort(([a], [b]) => +new Date(a) - +new Date(b))
      .filter(([k]) => +new Date(k) >= +new Date(today.toDateString()));
  }, [blocks]);

  const upcomingExams = exams.filter((e) => +new Date(e.exam_date) >= +today).slice(0, 5);
  const openTasks = tasks.filter((t) => t.status !== "done");

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title={t("app.pages.studyTitle")}
        subtitle={t("app.pages.studySubtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateWeek} disabled={generating}
              className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
              Generate weekly plan
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="today" className="rounded-lg">Today</TabsTrigger>
          <TabsTrigger value="week" className="rounded-lg">Weekly plan</TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-lg">Subjects</TabsTrigger>
          <TabsTrigger value="exams" className="rounded-lg">Exams</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg">Tasks</TabsTrigger>
        </TabsList>

        {/* TODAY */}
        <TabsContent value="today">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold">Today's study plan</h2>
                <p className="text-xs text-muted-foreground">{todayBlocks.length} blocks</p>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
              ) : todayBlocks.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <Layers className="h-10 w-10 text-muted-foreground mx-auto opacity-50"/>
                  <p className="text-sm text-muted-foreground">No study blocks scheduled for today.</p>
                  <Button onClick={generateWeek} disabled={generating} variant="outline" className="rounded-xl gap-2">
                    <Sparkles className="h-4 w-4"/> Generate with AI
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayBlocks.map((b) => {
                    const subj = b.subject_id ? subjectsById[b.subject_id] : null;
                    return (
                      <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/60 transition-colors group">
                        <div className="h-10 w-1 rounded-full" style={{ backgroundColor: subj?.color || "hsl(var(--primary))" }}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${b.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{b.title}</p>
                            {b.status !== "planned" && <Badge variant="secondary" className="rounded-full text-[10px]">{b.status}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fmtTime(b.scheduled_start)} – {fmtTime(b.scheduled_end)} · {b.duration_minutes}m
                            {subj && <> · {subj.name}</>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title="Complete" onClick={() => setBlockStatus(b, "completed")}>
                            <CheckCircle2 className="h-4 w-4 text-primary"/>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title="Skip" onClick={() => setBlockStatus(b, "skipped")}>
                            <SkipForward className="h-4 w-4"/>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title="Delay 1 day" onClick={() => setBlockStatus(b, "delayed")}>
                            <Hourglass className="h-4 w-4"/>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:text-destructive" onClick={() => deleteBlock(b.id)}>
                            <Trash2 className="h-4 w-4"/>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary"/> Upcoming exams
              </h2>
              {upcomingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming exams.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingExams.map((e) => {
                    const subj = e.subject_id ? subjectsById[e.subject_id] : null;
                    const days = Math.ceil((+new Date(e.exam_date) - +today) / 86400000);
                    return (
                      <div key={e.id} className="p-3 rounded-xl bg-secondary/40">
                        <div className="flex items-center gap-2">
                          {subj && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subj.color }}/>}
                          <p className="text-sm font-medium truncate flex-1">{e.title}</p>
                          <Badge variant="secondary" className="rounded-full text-[10px]">{days}d</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{fmtDay(e.exam_date)} · {fmtTime(e.exam_date)}{subj && ` · ${subj.name}`}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* WEEK */}
        <TabsContent value="week">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">This week</h2>
              <p className="text-xs text-muted-foreground">{blocks.filter(b => +new Date(b.scheduled_start) >= +new Date(today.toDateString())).length} blocks total</p>
            </div>
            {weekBlocks.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <CalendarClock className="h-10 w-10 text-muted-foreground mx-auto opacity-50"/>
                <p className="text-sm text-muted-foreground">No upcoming study blocks. Generate a plan or split a task into blocks.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {weekBlocks.map(([day, list]) => (
                  <div key={day} className="rounded-2xl bg-secondary/30 p-4">
                    <p className="font-display font-semibold text-sm mb-3">{fmtDay(list[0].scheduled_start)}</p>
                    <div className="space-y-2">
                      {list.sort((a,b)=>+new Date(a.scheduled_start)-+new Date(b.scheduled_start)).map((b) => {
                        const subj = b.subject_id ? subjectsById[b.subject_id] : null;
                        return (
                          <div key={b.id} className="p-2.5 rounded-xl bg-background/60 group">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-1 rounded-full" style={{ backgroundColor: subj?.color || "hsl(var(--primary))" }}/>
                              <p className={`text-xs font-medium flex-1 truncate ${b.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{b.title}</p>
                              {b.status !== "planned" && <Badge variant="secondary" className="rounded-full text-[9px] px-1.5">{b.status}</Badge>}
                            </div>
                            <p className="text-[10px] text-muted-foreground ml-3 mt-0.5">{fmtTime(b.scheduled_start)} · {b.duration_minutes}m</p>
                            <div className="flex gap-1 mt-1.5 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setBlockStatus(b, "completed")} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">done</button>
                              <button onClick={() => setBlockStatus(b, "skipped")} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">skip</button>
                              <button onClick={() => setBlockStatus(b, "delayed")} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">+1d</button>
                              <button onClick={() => deleteBlock(b.id)} className="text-[10px] px-1.5 py-0.5 rounded text-destructive">×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* SUBJECTS */}
        <TabsContent value="subjects">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Subjects</h2>
              <Dialog open={subjOpen} onOpenChange={setSubjOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4"/>Add subject</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
                  <form onSubmit={addSubject} className="space-y-4">
                    <div className="space-y-2"><Label>Name</Label><Input required value={subjForm.name} onChange={(e)=>setSubjForm({...subjForm, name: e.target.value})} className="rounded-xl"/></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Code</Label><Input value={subjForm.code} onChange={(e)=>setSubjForm({...subjForm, code: e.target.value})} className="rounded-xl" placeholder="CS401"/></div>
                      <div className="space-y-2"><Label>Instructor</Label><Input value={subjForm.instructor} onChange={(e)=>setSubjForm({...subjForm, instructor: e.target.value})} className="rounded-xl"/></div>
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2 flex-wrap">
                        {SUBJECT_COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => setSubjForm({...subjForm, color: c})}
                            className={`h-8 w-8 rounded-full border-2 ${subjForm.color === c ? "border-foreground" : "border-transparent"}`}
                            style={{ backgroundColor: c }}/>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Create</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {subjects.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-50"/>
                <p className="text-sm text-muted-foreground">No subjects yet. Add one to start planning.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjects.map((s) => {
                  const subjTasks = tasks.filter(t => t.subject_id === s.id && t.status !== "done").length;
                  const subjExams = exams.filter(e => e.subject_id === s.id && +new Date(e.exam_date) >= +today).length;
                  return (
                    <div key={s.id} className="rounded-2xl bg-secondary/40 p-4 group relative">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                          <BookOpen className="h-5 w-5" style={{ color: s.color }}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.code || "—"}{s.instructor && ` · ${s.instructor}`}</p>
                        </div>
                        <button onClick={() => deleteSubject(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive">
                          <Trash2 className="h-4 w-4"/>
                        </button>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="secondary" className="rounded-full text-[10px]">{subjTasks} tasks</Badge>
                        <Badge variant="secondary" className="rounded-full text-[10px]">{subjExams} exams</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* EXAMS */}
        <TabsContent value="exams">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Exams & deadlines</h2>
              <Dialog open={examOpen} onOpenChange={setExamOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4"/>Add exam</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>New exam or deadline</DialogTitle></DialogHeader>
                  <form onSubmit={addExam} className="space-y-4">
                    <div className="space-y-2"><Label>Title</Label><Input required value={examForm.title} onChange={(e)=>setExamForm({...examForm, title: e.target.value})} className="rounded-xl"/></div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={examForm.subject_id} onValueChange={(v)=>setExamForm({...examForm, subject_id: v})}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Optional"/></SelectTrigger>
                        <SelectContent>{subjects.map((s)=>(<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Date & time</Label><Input type="datetime-local" required value={examForm.exam_date} onChange={(e)=>setExamForm({...examForm, exam_date: e.target.value})} className="rounded-xl"/></div>
                      <div className="space-y-2"><Label>Weight (%)</Label><Input type="number" min={0} max={100} value={examForm.weight} onChange={(e)=>setExamForm({...examForm, weight: e.target.value})} className="rounded-xl"/></div>
                    </div>
                    <div className="space-y-2"><Label>Location</Label><Input value={examForm.location} onChange={(e)=>setExamForm({...examForm, location: e.target.value})} className="rounded-xl"/></div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea value={examForm.notes} onChange={(e)=>setExamForm({...examForm, notes: e.target.value})} className="rounded-xl"/></div>
                    <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Create</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {exams.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto opacity-50"/>
                <p className="text-sm text-muted-foreground">No exams or deadlines yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exams.map((e) => {
                  const subj = e.subject_id ? subjectsById[e.subject_id] : null;
                  const days = Math.ceil((+new Date(e.exam_date) - +today) / 86400000);
                  const past = days < 0;
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 group">
                      {subj && <div className="h-10 w-1 rounded-full" style={{ backgroundColor: subj.color }}/>}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${past ? "text-muted-foreground line-through" : ""}`}>{e.title}</p>
                        <p className="text-xs text-muted-foreground">{fmtDay(e.exam_date)} · {fmtTime(e.exam_date)}{subj && ` · ${subj.name}`}{e.location && ` · ${e.location}`}{e.weight ? ` · ${e.weight}%` : ""}</p>
                      </div>
                      {!past && <Badge variant={days <= 7 ? "destructive" : "secondary"} className="rounded-full text-[10px]">{days}d</Badge>}
                      <button onClick={() => deleteExam(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Study tasks</h2>
              <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4"/>Add task</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>New study task</DialogTitle></DialogHeader>
                  <form onSubmit={addTask} className="space-y-4">
                    <div className="space-y-2"><Label>Title</Label><Input required value={taskForm.title} onChange={(e)=>setTaskForm({...taskForm, title: e.target.value})} className="rounded-xl"/></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select value={taskForm.subject_id} onValueChange={(v)=>setTaskForm({...taskForm, subject_id: v})}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Optional"/></SelectTrigger>
                          <SelectContent>{subjects.map((s)=>(<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={taskForm.priority} onValueChange={(v)=>setTaskForm({...taskForm, priority: v})}>
                          <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Estimated minutes</Label><Input type="number" min={5} value={taskForm.estimated_minutes} onChange={(e)=>setTaskForm({...taskForm, estimated_minutes: +e.target.value})} className="rounded-xl"/></div>
                      <div className="space-y-2"><Label>Due date</Label><Input type="datetime-local" value={taskForm.due_date} onChange={(e)=>setTaskForm({...taskForm, due_date: e.target.value})} className="rounded-xl"/></div>
                    </div>
                    <div className="space-y-2"><Label>Description</Label><Textarea value={taskForm.description} onChange={(e)=>setTaskForm({...taskForm, description: e.target.value})} className="rounded-xl"/></div>
                    <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Create</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {openTasks.length === 0 && tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No tasks yet — add one to get started.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => {
                  const subj = t.subject_id ? subjectsById[t.subject_id] : null;
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/40 transition-colors group">
                      <button onClick={() => toggleTask(t)}>
                        {t.status === "done" ? <CheckCircle2 className="h-5 w-5 text-primary"/> : <Circle className="h-5 w-5 text-muted-foreground"/>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${t.status === "done" && "line-through text-muted-foreground"}`}>{t.title}</p>
                          {t.priority === "high" && <Badge variant="destructive" className="rounded-full text-[10px]">high</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {subj?.name || t.course || "No subject"}
                          {t.due_date && ` · due ${fmtDay(t.due_date)}`}
                        </p>
                      </div>
                      {t.estimated_minutes && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3"/>{t.estimated_minutes}m</div>}
                      {t.status !== "done" && (
                        <Button size="sm" variant="outline" className="rounded-lg gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openBreak(t)}>
                          <Layers className="h-3.5 w-3.5"/> Split
                        </Button>
                      )}
                      <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Split task dialog */}
      <Dialog open={breakOpen} onOpenChange={setBreakOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Split into study blocks</DialogTitle></DialogHeader>
          {breakTask && (
            <form onSubmit={submitBreak} className="space-y-4">
              <p className="text-sm text-muted-foreground">Breaking <span className="font-medium text-foreground">{breakTask.title}</span> into focused blocks.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Block length (min)</Label><Input type="number" min={10} max={120} value={breakForm.chunk_minutes} onChange={(e)=>setBreakForm({...breakForm, chunk_minutes: +e.target.value})} className="rounded-xl"/></div>
                <div className="space-y-2"><Label>Number of blocks</Label><Input type="number" min={1} max={20} value={breakForm.count} onChange={(e)=>setBreakForm({...breakForm, count: +e.target.value})} className="rounded-xl"/></div>
              </div>
              <p className="text-xs text-muted-foreground">Blocks will be scheduled starting from the next hour.</p>
              <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Create {breakForm.count} blocks</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}