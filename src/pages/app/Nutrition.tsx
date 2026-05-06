import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Flame, Beef, Wheat, Droplet, Trash2, Sparkles, Loader2, ShoppingCart, ChefHat, Target, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Meal { id: string; name: string; meal_type: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; consumed_at: string; }
interface MealPlan {
  id: string; week_start: string; day_of_week: number; meal_type: string;
  name: string; description: string | null; ingredients: string[];
  estimated_cost: number | null; prep_minutes: number | null;
  calories: number; protein_g: number; carbs_g: number; fat_g: number;
  prep_tip: string | null; cooked: boolean;
}
interface Grocery { id: string; name: string; quantity: string | null; purchased: boolean; }

const TYPES = ["breakfast", "lunch", "dinner", "snack"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOf(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export default function Nutrition() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [grocery, setGrocery] = useState<Grocery[]>([]);
  const [goals, setGoals] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [groceryName, setGroceryName] = useState("");
  const [groceryQty, setGroceryQty] = useState("");
  const [prepSuggestions, setPrepSuggestions] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", meal_type: "lunch", calories: "", protein_g: "", carbs_g: "", fat_g: "" });
  const [planForm, setPlanForm] = useState({ weekly_budget: "60", time_per_meal: "25", dietary: "", preferences: "" });

  const load = async () => {
    if (!user) return;
    const wkStart = mondayOf().toISOString().slice(0, 10);
    const [mealsR, plansR, groceryR, profileR] = await Promise.all([
      supabase.from("meals").select("*").order("consumed_at", { ascending: false }),
      supabase.from("meal_plans").select("*").eq("week_start", wkStart).order("day_of_week"),
      supabase.from("grocery_items").select("*").order("purchased").order("created_at", { ascending: false }),
      supabase.from("user_profiles").select("nutrition_goals, monthly_budget").eq("id", user.id).maybeSingle(),
    ]);
    if (mealsR.data) setMeals(mealsR.data as any);
    if (plansR.data) setPlans(plansR.data as any);
    if (groceryR.data) setGrocery(groceryR.data as any);
    if (profileR.data?.nutrition_goals) setGoals(profileR.data.nutrition_goals);
    if (profileR.data?.monthly_budget) {
      setPlanForm((f) => ({ ...f, weekly_budget: String(Math.round(Number(profileR.data!.monthly_budget) / 4)) }));
    }
  };
  useEffect(() => { load(); }, [user]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    const { error } = await supabase.from("meals").insert({
      user_id: user.id, name: form.name, meal_type: form.meal_type,
      calories: +form.calories || 0, protein_g: +form.protein_g || 0,
      carbs_g: +form.carbs_g || 0, fat_g: +form.fat_g || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Meal logged");
    setOpen(false); setForm({ name: "", meal_type: "lunch", calories: "", protein_g: "", carbs_g: "", fat_g: "" }); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const generatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("plan-meals", {
      body: {
        weekly_budget: Number(planForm.weekly_budget) || 60,
        time_per_meal: Number(planForm.time_per_meal) || 25,
        dietary: planForm.dietary,
        preferences: planForm.preferences,
      },
    });
    setGenerating(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Couldn't generate plan");
      return;
    }
    setPrepSuggestions((data as any)?.prep_suggestions ?? []);
    toast.success(`Plan ready · ${(data as any)?.meals_inserted ?? 0} meals`);
    setPlanOpen(false);
    load();
  };

  const toggleCooked = async (id: string, cooked: boolean) => {
    await supabase.from("meal_plans").update({ cooked: !cooked }).eq("id", id);
    setPlans((ps) => ps.map((p) => p.id === id ? { ...p, cooked: !cooked } : p));
  };

  const cookToLog = async (p: MealPlan) => {
    if (!user) return;
    const { error } = await supabase.from("meals").insert({
      user_id: user.id, name: p.name, meal_type: p.meal_type,
      calories: p.calories, protein_g: p.protein_g, carbs_g: p.carbs_g, fat_g: p.fat_g,
    });
    if (error) return toast.error(error.message);
    await supabase.from("meal_plans").update({ cooked: true }).eq("id", p.id);
    toast.success("Logged to today");
    load();
  };

  const addGrocery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groceryName.trim()) return;
    const { error } = await supabase.from("grocery_items").insert({
      user_id: user.id, name: groceryName.trim(), quantity: groceryQty.trim() || null,
    });
    if (error) return toast.error(error.message);
    setGroceryName(""); setGroceryQty("");
    load();
  };

  const toggleGrocery = async (id: string, purchased: boolean) => {
    await supabase.from("grocery_items").update({ purchased: !purchased }).eq("id", id);
    setGrocery((g) => g.map((x) => x.id === id ? { ...x, purchased: !purchased } : x));
  };

  const deleteGrocery = async (id: string) => {
    await supabase.from("grocery_items").delete().eq("id", id);
    setGrocery((g) => g.filter((x) => x.id !== id));
  };

  const clearPurchased = async () => {
    const ids = grocery.filter((g) => g.purchased).map((g) => g.id);
    if (!ids.length) return;
    await supabase.from("grocery_items").delete().in("id", ids);
    load();
  };

  const saveGoals = async () => {
    if (!user) return;
    const { error } = await supabase.from("user_profiles").update({ nutrition_goals: goals || null }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Goals saved");
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const todays = meals.filter(m => new Date(m.consumed_at) >= today);
  const sum = (key: keyof Meal) => todays.reduce((s, m) => s + Number(m[key] || 0), 0);

  const weeklyCost = useMemo(
    () => plans.reduce((s, p) => s + Number(p.estimated_cost || 0), 0),
    [plans],
  );
  const plansByDay = useMemo(() => {
    const map: Record<number, MealPlan[]> = {};
    for (const p of plans) (map[p.day_of_week] ??= []).push(p);
    return map;
  }, [plans]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title={t("app.pages.nutritionTitle")} subtitle={t("app.pages.nutritionSubtitle")}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2"><Plus className="h-4 w-4"/>Log meal</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>New meal</DialogTitle></DialogHeader>
              <form onSubmit={add} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input required value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className="rounded-xl"/></div>
                <div className="space-y-2"><Label>Type</Label>
                  <Select value={form.meal_type} onValueChange={(v)=>setForm({...form, meal_type: v})}>
                    <SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger>
                    <SelectContent>{TYPES.map(t=><SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Calories</Label><Input type="number" value={form.calories} onChange={(e)=>setForm({...form, calories: e.target.value})} className="rounded-xl"/></div>
                  <div className="space-y-2"><Label>Protein (g)</Label><Input type="number" value={form.protein_g} onChange={(e)=>setForm({...form, protein_g: e.target.value})} className="rounded-xl"/></div>
                  <div className="space-y-2"><Label>Carbs (g)</Label><Input type="number" value={form.carbs_g} onChange={(e)=>setForm({...form, carbs_g: e.target.value})} className="rounded-xl"/></div>
                  <div className="space-y-2"><Label>Fat (g)</Label><Input type="number" value={form.fat_g} onChange={(e)=>setForm({...form, fat_g: e.target.value})} className="rounded-xl"/></div>
                </div>
                <Button type="submit" className="w-full rounded-xl bg-gradient-primary text-primary-foreground">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Calories" value={sum("calories")} hint="today" icon={<Flame className="h-4 w-4"/>} accent />
        <StatCard label="Protein" value={`${sum("protein_g")}g`} hint="today" icon={<Beef className="h-4 w-4"/>} />
        <StatCard label="Carbs" value={`${sum("carbs_g")}g`} hint="today" icon={<Wheat className="h-4 w-4"/>} />
        <StatCard label="Fat" value={`${sum("fat_g")}g`} hint="today" icon={<Droplet className="h-4 w-4"/>} />
      </div>

      <Tabs defaultValue="plan" className="space-y-5">
        <TabsList className="glass rounded-2xl p-1 h-11">
          <TabsTrigger value="plan" className="rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Weekly plan</TabsTrigger>
          <TabsTrigger value="grocery" className="rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Grocery list</TabsTrigger>
          <TabsTrigger value="logged" className="rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Logged meals</TabsTrigger>
          <TabsTrigger value="goals" className="rounded-xl data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">Goals</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          <div className="glass rounded-3xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="font-display text-xl font-semibold flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary"/>This week's meals</h2>
                <p className="text-sm text-muted-foreground">
                  Week of {mondayOf().toLocaleDateString()} ·
                  {plans.length > 0 ? <> {plans.length} meals · ~${weeklyCost.toFixed(2)} total</> : " no plan yet"}
                </p>
              </div>
              <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow gap-2">
                    <Sparkles className="h-4 w-4"/>{plans.length ? "Regenerate plan" : "Generate weekly plan"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>AI weekly meal plan</DialogTitle></DialogHeader>
                  <form onSubmit={generatePlan} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Weekly food budget ($)</Label>
                        <Input type="number" min={10} required value={planForm.weekly_budget} onChange={(e)=>setPlanForm({...planForm, weekly_budget: e.target.value})} className="rounded-xl"/>
                      </div>
                      <div className="space-y-2"><Label>Time per meal (min)</Label>
                        <Input type="number" min={5} required value={planForm.time_per_meal} onChange={(e)=>setPlanForm({...planForm, time_per_meal: e.target.value})} className="rounded-xl"/>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Dietary restrictions</Label>
                      <Input value={planForm.dietary} onChange={(e)=>setPlanForm({...planForm, dietary: e.target.value})} placeholder="e.g. vegetarian, no gluten" className="rounded-xl"/>
                    </div>
                    <div className="space-y-2"><Label>Preferences</Label>
                      <Textarea value={planForm.preferences} onChange={(e)=>setPlanForm({...planForm, preferences: e.target.value})} placeholder="e.g. love rice bowls, hate mushrooms, high protein" className="rounded-xl min-h-[80px]"/>
                    </div>
                    <Button type="submit" disabled={generating} className="w-full rounded-xl bg-gradient-primary text-primary-foreground gap-2">
                      {generating ? <><Loader2 className="h-4 w-4 animate-spin"/>Generating…</> : <><Sparkles className="h-4 w-4"/>Generate plan</>}
                    </Button>
                    <p className="text-xs text-muted-foreground">Creates 7 days of meals + a grocery list. Replaces this week's plan.</p>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {plans.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-40"/>
                <p className="text-sm">No meal plan yet. Generate one to get budget-friendly recipes and a grocery list.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {DAYS.map((d, idx) => (
                  <div key={d} className="rounded-2xl bg-secondary/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold">{d}</h3>
                      <span className="text-xs text-muted-foreground font-mono">
                        ${(plansByDay[idx] ?? []).reduce((s, p) => s + Number(p.estimated_cost || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    {(plansByDay[idx] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No meals planned.</p>
                    ) : (plansByDay[idx]).map((p) => (
                      <div key={p.id} className={`rounded-xl border border-glass-border p-3 ${p.cooked ? "opacity-60" : ""}`}>
                        <div className="flex items-start gap-2">
                          <Checkbox checked={p.cooked} onCheckedChange={()=>toggleCooked(p.id, p.cooked)} className="mt-1"/>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{p.meal_type}</p>
                            <p className={`font-medium text-sm ${p.cooked ? "line-through" : ""}`}>{p.name}</p>
                            {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mt-2 font-mono">
                              <span>{p.calories} kcal</span>
                              <span>P {p.protein_g}g</span>
                              <span>{p.prep_minutes}m</span>
                              <span>${Number(p.estimated_cost || 0).toFixed(2)}</span>
                            </div>
                            {p.prep_tip && <p className="text-[11px] text-primary/80 mt-2 italic">💡 {p.prep_tip}</p>}
                            <Button variant="ghost" size="sm" className="h-7 mt-2 px-2 text-xs rounded-lg" onClick={()=>cookToLog(p)}>
                              Cook & log
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {prepSuggestions.length > 0 && (
            <div className="glass rounded-3xl p-6">
              <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary"/>Meal prep suggestions</h2>
              <ul className="space-y-2 text-sm">
                {prepSuggestions.map((s, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">•</span><span>{s}</span></li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grocery">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-semibold flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary"/>Grocery list</h2>
                <p className="text-sm text-muted-foreground">{grocery.filter(g=>!g.purchased).length} to buy · {grocery.filter(g=>g.purchased).length} done</p>
              </div>
              {grocery.some(g=>g.purchased) && (
                <Button variant="outline" size="sm" className="rounded-xl" onClick={clearPurchased}>Clear purchased</Button>
              )}
            </div>

            <form onSubmit={addGrocery} className="flex gap-2 mb-5">
              <Input value={groceryName} onChange={(e)=>setGroceryName(e.target.value)} placeholder="Item name" className="rounded-xl"/>
              <Input value={groceryQty} onChange={(e)=>setGroceryQty(e.target.value)} placeholder="Qty" className="rounded-xl w-32"/>
              <Button type="submit" className="rounded-xl bg-gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4"/>Add</Button>
            </form>

            {grocery.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Generate a meal plan or add items manually.</p>
            ) : (
              <div className="space-y-1">
                {grocery.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 group">
                    <Checkbox checked={g.purchased} onCheckedChange={()=>toggleGrocery(g.id, g.purchased)}/>
                    <span className={`flex-1 text-sm ${g.purchased ? "line-through text-muted-foreground" : ""}`}>{g.name}</span>
                    {g.quantity && <span className="text-xs text-muted-foreground font-mono">{g.quantity}</span>}
                    <button onClick={()=>deleteGrocery(g.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"><Trash2 className="h-4 w-4"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logged">
          <div className="glass rounded-3xl p-6">
            <h2 className="font-display text-xl font-semibold mb-4">All logged meals</h2>
            {meals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No meals logged yet.</p>
            ) : (
              <div className="space-y-2">
                {meals.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl bg-secondary/40 group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.meal_type} · {new Date(m.consumed_at).toLocaleDateString()}</p>
                        <h3 className="font-display font-semibold">{m.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{m.calories} kcal</span>
                        <button onClick={()=>remove(m.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                      <span>P {m.protein_g}g</span><span>C {m.carbs_g}g</span><span>F {m.fat_g}g</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <div className="glass rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary"/>
              <h2 className="font-display text-xl font-semibold">Nutrition goals</h2>
            </div>
            <p className="text-sm text-muted-foreground">The AI uses these to tailor your weekly plan.</p>
            <Textarea value={goals} onChange={(e)=>setGoals(e.target.value)} placeholder="e.g. 2200 kcal/day, 150g protein, mostly whole foods, low added sugar" className="rounded-xl min-h-[120px]"/>
            <Button onClick={saveGoals} className="rounded-xl bg-gradient-primary text-primary-foreground shadow-glow gap-2"><DollarSign className="h-4 w-4"/>Save goals</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
