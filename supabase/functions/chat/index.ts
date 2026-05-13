import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not connected yet." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load user context for personalized answers (server-side, secure)
    let userContext = "";
    let userName = "the student";
    try {
      const authHeader = req.headers.get("Authorization") || "";
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
      const supabase = createClient(supabaseUrl, anon, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const monthStart = new Date(today); monthStart.setDate(1);

        const [profileR, tasksR, schedR, mealsR, expR, habitsR, groceryR] = await Promise.all([
          supabase.from("user_profiles").select("full_name, university, major, monthly_budget, study_goals, nutrition_goals, wake_time, sleep_time, focus_style, planning_style, nutrition_preference").eq("id", user.id).maybeSingle(),
          supabase.from("tasks").select("title, course, status, estimated_minutes, due_date, priority").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(20),
          supabase.from("schedules").select("title, starts_at, ends_at, category, location").gte("starts_at", today.toISOString()).lt("starts_at", new Date(today.getTime() + 7 * 86400000).toISOString()).order("starts_at").limit(40),
          supabase.from("meals").select("name, meal_type, calories, protein_g, consumed_at").gte("consumed_at", weekAgo.toISOString()).order("consumed_at", { ascending: false }).limit(20),
          supabase.from("expenses").select("name, amount, category, occurred_at").gte("occurred_at", monthStart.toISOString()).order("occurred_at", { ascending: false }).limit(40),
          supabase.from("habits").select("name, target_per_week, current_streak, last_completed_at").eq("active", true),
          supabase.from("grocery_items").select("name, quantity, purchased").eq("purchased", false).limit(30),
        ]);

        const profile = profileR.data;
        userName = (profile?.full_name || user.email?.split("@")[0] || "the student").split(" ")[0];

        const monthSpent = (expR.data ?? []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);

        const ctx = {
          today: today.toISOString().slice(0, 10),
          profile: profile ? {
            name: profile.full_name, university: profile.university, major: profile.major,
            monthly_budget: profile.monthly_budget, study_goals: profile.study_goals,
            nutrition_goals: profile.nutrition_goals, wake_time: profile.wake_time, sleep_time: profile.sleep_time,
            focus_style: (profile as any).focus_style,
            planning_style: (profile as any).planning_style,
            nutrition_preference: (profile as any).nutrition_preference,
          } : null,
          open_tasks: tasksR.data ?? [],
          schedule_next_7_days: schedR.data ?? [],
          recent_meals: mealsR.data ?? [],
          expenses_this_month: { total: monthSpent, items: expR.data ?? [] },
          active_habits: habitsR.data ?? [],
          grocery_open_items: groceryR.data ?? [],
        };
        userContext = `\n\nUSER CONTEXT (live data from their account):\n${JSON.stringify(ctx, null, 2)}`;
      }
    } catch (e) {
      console.error("context load failed", e);
    }

    const system = `You are Zentryx, an AI life-OS assistant for students. You are speaking with ${userName}.

You help the user with:
- creating study plans from their open tasks and deadlines
- organizing their daily and weekly schedule
- tracking finances and finding savings within their budget
- suggesting meals aligned with their nutrition goals
- generating grocery lists from suggested meals
- recommending focus breaks during long sessions
- rescheduling missed or overdue tasks

Always use the user's real data below. If a needed field is missing, ask one focused question or suggest where they can add it (e.g. Settings, Study Planner). Be concise, friendly, and actionable. Format with markdown — use bullet lists, bold key items, and short sections.${userContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to your Lovable workspace to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});