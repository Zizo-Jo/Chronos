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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not connected yet." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

    const [profileR, expR, incR, budR] = await Promise.all([
      supabase.from("user_profiles").select("monthly_budget, study_goals").eq("id", user.id).maybeSingle(),
      supabase.from("expenses").select("name, amount, category, occurred_at").gte("occurred_at", monthStart.toISOString()).order("occurred_at", { ascending: false }),
      supabase.from("income").select("name, amount, source, recurring, received_at").gte("received_at", monthStart.toISOString()),
      supabase.from("budgets").select("category, monthly_limit"),
    ]);

    const totalSpent = (expR.data ?? []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const totalIncome = (incR.data ?? []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const byCategory: Record<string, number> = {};
    for (const e of (expR.data ?? []) as any[]) {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0);
    }

    const context = {
      monthly_budget: profileR.data?.monthly_budget ?? null,
      total_income_month: totalIncome,
      total_spent_month: totalSpent,
      remaining: (profileR.data?.monthly_budget ?? totalIncome) - totalSpent,
      spending_by_category: byCategory,
      category_budgets: budR.data ?? [],
      recent_expenses: (expR.data ?? []).slice(0, 25),
    };

    const system = `You are a friendly student finance coach. Look at the user's real monthly data and give concise, practical savings advice.

Format your reply in markdown:
- Start with a one-sentence overall verdict (on track / tight / overspending).
- "## Top wins" — 1-2 things they're doing well.
- "## Where to cut" — 2-3 specific category-level suggestions with rough $ savings.
- "## This week" — 2-3 concrete actions they can do in the next 7 days.

Be warm, never preachy. Use student-friendly examples. Skip generic advice.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Give me savings advice based on this month's data:\n${JSON.stringify(context, null, 2)}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to your Lovable workspace to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const advice = data.choices?.[0]?.message?.content || "No advice generated.";
    return new Response(JSON.stringify({ advice, context }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("savings-advice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});