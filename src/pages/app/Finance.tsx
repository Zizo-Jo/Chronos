import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus, TrendingUp, TrendingDown, Wallet, PiggyBank,
  ArrowUpRight, ArrowDownRight, Trash2, Sparkles, Loader2, AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Expense { id: string; name: string; amount: number; category: string; occurred_at: string; }
interface Income { id: string; name: string; amount: number; source: string; recurring: boolean; received_at: string; }

const EXP_CATEGORIES = ["food", "transport", "books", "fun", "subscription", "rent", "health", "other"];
const INC_SOURCES = ["job", "scholarship", "family", "gift", "other"];
const ADVICE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/savings-advice`;

function startOfMonth(d = new Date()) { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = x.getDay(); const diff = (day + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - diff); x.setHours(0,0,0,0); return x;
}

export default function Finance() {
  const { user, session } = useAuth();
  const { t: tFn } = useTranslation();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [expOpen, setExpOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [budOpen, setBudOpen] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);

  const [expForm, setExpForm] = useState({ name: "", amount: "", category: "food", occurred_at: "" });
  const [incForm, setIncForm] = useState({ name: "", amount: "", source: "job", recurring: false, received_at: "" });
  const [budgetInput, setBudgetInput] = useState("");

  const [advice, setAdvice] = useState<string>("");
  const [adviceLoading, setAdviceLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [e, i, p] = await Promise.all([
      supabase.from("expenses").select("*").order("occurred_at", { ascending: false }),
      supabase.from("income").select("*").order("received_at", { ascending: false }),
      supabase.from("user_profiles").select("monthly_budget").eq("id", user.id).maybeSingle(),
    ]);
    if (e.data) setExpenses(e.data as any);
    if (i.data) setIncome(i.data as any);
    setBudget(p.data?.monthly_budget != null ? Number(p.data.monthly_budget) : null);
    setBudgetInput(p.data?.monthly_budget != null ? String(p.data.monthly_budget) : "");
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  // ---------- mutations ----------
  const addExpense = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    const amount = parseFloat(expForm.amount);
    if (!expForm.name.trim() || isNaN(amount) || amount <= 0) return toast.error("Enter a valid name and amount");
    if (expForm.name.length > 100) return toast.error("Name too long");
    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      name: expForm.name.trim().slice(0, 100),
      amount,
      category: expForm.category,
      occurred_at: expForm.occurred_at ? new Date(expForm.occurred_at).toISOString() : new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    setExpOpen(false); setExpForm({ name: "", amount: "", category: "food", occurred_at: "" });
    load();
  };
  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const addIncome = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    const amount = parseFloat(incForm.amount);
    if (!incForm.name.trim() || isNaN(amount) || amount <= 0) return toast.error("Enter a valid name and amount");
    if (incForm.name.length > 100) return toast.error("Name too long");
    const { error } = await supabase.from("income").insert({
      user_id: user.id,
      name: incForm.name.trim().slice(0, 100),
      amount,
      source: incForm.source,
      recurring: incForm.recurring,
      received_at: incForm.received_at ? new Date(incForm.received_at).toISOString() : new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Income added");
    setIncOpen(false); setIncForm({ name: "", amount: "", source: "job", recurring: false, received_at: "" });
    load();
  };
  const deleteIncome = async (id: string) => {
    const { error } = await supabase.from("income").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveBudget = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!user) return;
    const v = parseFloat(budgetInput);
    if (isNaN(v) || v < 0) return toast.error("Enter a valid budget");
    const { error } = await supabase.from("user_profiles").update({ monthly_budget: v }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Monthly budget saved");
    setBudOpen(false);
    load();
  };

  // ---------- AI advice ----------
  const getAdvice = async () => {
    if (!session) { toast.error("Please sign in again"); return; }
    setAdviceOpen(true);
    setAdviceLoading(true);
    setAdvice("");
    try {
      const resp = await fetch(ADVICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to get advice");
      setAdvice(data.advice);
    } catch (e: any) {
      toast.error(e.message || "Failed to get advice");
      setAdviceOpen(false);
    } finally {
      setAdviceLoading(false);
    }
  };

  // ---------- derived ----------
  const monthStart = startOfMonth();
  const weekStart = startOfWeek();

  const monthExpenses = useMemo(() => expenses.filter((e) => +new Date(e.occurred_at) >= +monthStart), [expenses]);
  const monthIncome = useMemo(() => income.filter((i) => +new Date(i.received_at) >= +monthStart), [income]);
  const weekExpenses = useMemo(() => expenses.filter((e) => +new Date(e.occurred_at) >= +weekStart), [expenses]);

  const totalSpentMonth = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalIncomeMonth = monthIncome.reduce((s, e) => s + Number(e.amount), 0);
  const weekSpent = weekExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const baseBudget = budget ?? totalIncomeMonth;
  const remaining = baseBudget - totalSpentMonth;
  const usedPct = baseBudget > 0 ? Math.min(100, (totalSpentMonth / baseBudget) * 100) : 0;

  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const expectedPct = (dayOfMonth / daysInMonth) * 100;
  const overspending = baseBudget > 0 && usedPct > expectedPct + 10;
  const overBudget = baseBudget > 0 && remaining < 0;

  const byCat = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of monthExpenses) totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  // weekly summary for last 4 weeks
  const weeklySummary = useMemo(() => {
    const weeks: { label: string; total: number }[] = [];
    for (let w = 0; w < 4; w++) {
      const ws = new Date(weekStart); ws.setDate(ws.getDate() - 7 * w);
      const we = new Date(ws); we.setDate(we.getDate() + 7);
      const total = expenses.filter((e) => {
        const t = +new Date(e.occurred_at);
        return t >= +ws && t < +we;
      }).reduce((s, e) => s + Number(e.amount), 0);
      weeks.unshift({ label: w === 0 ? "This week" : `${w}w ago`, total });
    }
    return weeks;
  }, [expenses, weekStart]);
  const maxWeek = Math.max(1, ...weeklySummary.map((w) => w.total));

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title={tFn("app.pages.financeTitle")}
        subtitle={tFn("app.pages.financeSubtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={getAdvice} variant="outline" className="rounded-xl gap-2">
              <Sparkles className="h-4 w-4"/> AI savings advice
            </Button>
            <Dialog open={budOpen} onOpenChange={setBudOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2"><Wallet className="h-4 w-4"/>{budget != null ? "Edit budget" : "Set budget"}</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>Monthly budget</DialogTitle></DialogHeader>
                <form onSubmit={saveBudget} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Limit ($)</Label>
                    <Input type="number" min={0} step="0.01" required value={budgetInput} onChange={(e)=>setBudgetInput(e.target.value)} className="rounded-xl"/>
                  </div>
                  <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={incOpen} onOpenChange={setIncOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2"><ArrowDownRight className="h-4 w-4"/>Add income</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>New income</DialogTitle></DialogHeader>
                <form onSubmit={addIncome} className="space-y-4">
                  <div className="space-y-2"><Label>Name</Label><Input required maxLength={100} value={incForm.name} onChange={(e)=>setIncForm({...incForm, name: e.target.value})} className="rounded-xl" placeholder="Part-time job"/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={incForm.amount} onChange={(e)=>setIncForm({...incForm, amount: e.target.value})} className="rounded-xl"/></div>
                    <div className="space-y-2"><Label>Source</Label>
                      <Select value={incForm.source} onValueChange={(v)=>setIncForm({...incForm, source: v})}>
                        <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                        <SelectContent>{INC_SOURCES.map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Date received</Label><Input type="date" value={incForm.received_at} onChange={(e)=>setIncForm({...incForm, received_at: e.target.value})} className="rounded-xl"/></div>
                  <div className="flex items-center justify-between rounded-xl border border-input p-3">
                    <div><Label className="cursor-pointer">Recurring monthly</Label><p className="text-xs text-muted-foreground">Track this every month</p></div>
                    <Switch checked={incForm.recurring} onCheckedChange={(v)=>setIncForm({...incForm, recurring: v})}/>
                  </div>
                  <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={expOpen} onOpenChange={setExpOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2"><Plus className="h-4 w-4"/>Add expense</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
                <form onSubmit={addExpense} className="space-y-4">
                  <div className="space-y-2"><Label>Name</Label><Input required maxLength={100} value={expForm.name} onChange={(e)=>setExpForm({...expForm, name: e.target.value})} className="rounded-xl"/></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={expForm.amount} onChange={(e)=>setExpForm({...expForm, amount: e.target.value})} className="rounded-xl"/></div>
                    <div className="space-y-2"><Label>Category</Label>
                      <Select value={expForm.category} onValueChange={(v)=>setExpForm({...expForm, category: v})}>
                        <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                        <SelectContent>{EXP_CATEGORIES.map(c=><SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={expForm.occurred_at} onChange={(e)=>setExpForm({...expForm, occurred_at: e.target.value})} className="rounded-xl"/></div>
                  <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Save</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Income (month)" value={`$${totalIncomeMonth.toFixed(2)}`} hint={`${monthIncome.length} entries`} icon={<ArrowDownRight className="h-4 w-4"/>} />
        <StatCard label="Spent (month)" value={`$${totalSpentMonth.toFixed(2)}`} hint={`${monthExpenses.length} expenses`} icon={<TrendingDown className="h-4 w-4"/>} accent />
        <StatCard label="Remaining" value={`$${remaining.toFixed(2)}`} hint={baseBudget > 0 ? `of $${baseBudget.toFixed(0)} budget` : "set a budget"} icon={<PiggyBank className="h-4 w-4"/>} />
        <StatCard label="This week" value={`$${weekSpent.toFixed(2)}`} hint={`${weekExpenses.length} expenses`} icon={<TrendingUp className="h-4 w-4"/>} />
      </div>

      {/* Overspending warning */}
      {(overBudget || overspending) && baseBudget > 0 && (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 mb-6 ${overBudget ? "bg-destructive/10 border-destructive/40" : "bg-yellow-500/10 border-yellow-500/40"}`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${overBudget ? "text-destructive" : "text-yellow-500"}`}/>
          <div className="flex-1">
            <p className="font-medium text-sm">
              {overBudget
                ? `You're $${Math.abs(remaining).toFixed(2)} over your monthly budget.`
                : `You're spending faster than expected — ${usedPct.toFixed(0)}% used by day ${dayOfMonth} of ${daysInMonth}.`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Tap "AI savings advice" for personalized tips.</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-lg" onClick={getAdvice}>Get tips</Button>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-lg">Expenses</TabsTrigger>
          <TabsTrigger value="income" className="rounded-lg">Income</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold">Budget progress</h2>
                {baseBudget > 0 && <Badge variant="secondary" className="rounded-full">{usedPct.toFixed(0)}% used</Badge>}
              </div>
              {baseBudget === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Wallet className="h-10 w-10 text-muted-foreground mx-auto opacity-50"/>
                  <p className="text-sm text-muted-foreground">Set a monthly budget or add income to see progress.</p>
                </div>
              ) : (
                <>
                  <div className="h-3 rounded-full bg-muted/40 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${overBudget ? "bg-destructive" : overspending ? "bg-yellow-500" : "bg-gradient-primary"}`}
                      style={{ width: `${Math.min(100, usedPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${totalSpentMonth.toFixed(2)} spent</span>
                    <span>${baseBudget.toFixed(2)} budget</span>
                  </div>
                </>
              )}

              <h3 className="font-display font-semibold mt-8 mb-3">Weekly spending — last 4 weeks</h3>
              <div className="flex items-end gap-3 h-40">
                {weeklySummary.map((w) => (
                  <div key={w.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end h-32">
                      <div className="w-full rounded-t-lg bg-gradient-primary transition-all"
                        style={{ height: `${(w.total / maxWeek) * 100}%`, minHeight: w.total > 0 ? "4px" : 0 }}/>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{w.label}</p>
                    <p className="text-xs font-medium">${w.total.toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4">By category (month)</h2>
              {byCat.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No expenses yet.</p>
              ) : (
                <div className="space-y-4">
                  {byCat.map(([cat, total]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground capitalize">{cat}</span>
                        <span className="font-medium">${total.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${(total / totalSpentMonth) * 100}%` }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* EXPENSES */}
        <TabsContent value="expenses">
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4">All expenses</h2>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No expenses yet — add one to get started.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {expenses.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-secondary text-muted-foreground">
                        <ArrowUpRight className="h-4 w-4"/>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{t.category} · {new Date(t.occurred_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium">-${Number(t.amount).toFixed(2)}</p>
                      <button onClick={() => deleteExpense(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* INCOME */}
        <TabsContent value="income">
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4">Income</h2>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
            ) : income.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No income recorded yet.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {income.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                        <ArrowDownRight className="h-4 w-4"/>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{t.name}</p>
                          {t.recurring && <Badge variant="secondary" className="rounded-full text-[10px]">recurring</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{t.source} · {new Date(t.received_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium text-primary">+${Number(t.amount).toFixed(2)}</p>
                      <button onClick={() => deleteIncome(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive">
                        <Trash2 className="h-4 w-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* AI advice dialog */}
      <Dialog open={adviceOpen} onOpenChange={setAdviceOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/> AI savings advice</DialogTitle></DialogHeader>
          {adviceLoading ? (
            <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin"/> Analysing your finances…
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{advice}</ReactMarkdown>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}