import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function mondayOf(d = new Date()) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

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

    const body = await req.json().catch(() => ({}));
    const weeklyBudget: number = Number(body?.weekly_budget) || 60;
    const timePerMeal: number = Number(body?.time_per_meal) || 25;
    const preferences: string = (body?.preferences || "").toString().slice(0, 500);
    const dietary: string = (body?.dietary || "").toString().slice(0, 200);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("nutrition_goals, monthly_budget")
      .eq("id", user.id).maybeSingle();

    const system = `You are a budget-savvy nutritionist for students. Generate a realistic weekly meal plan (Mon-Sun) with breakfast, lunch and dinner for each day. Keep ingredients simple and reusable across days to minimize waste and cost. Respect the user's weekly food budget and time per meal. Return ONLY a tool call.`;

    const userMsg = `Weekly food budget: $${weeklyBudget}
Time per meal: ~${timePerMeal} minutes
Dietary restrictions: ${dietary || "none"}
Preferences: ${preferences || "none"}
Nutrition goals: ${profile?.nutrition_goals || "balanced macros, ~2000 kcal/day"}`;

    const tools = [{
      type: "function",
      function: {
        name: "weekly_meal_plan",
        description: "Return a 7-day meal plan with grocery list and prep tips.",
        parameters: {
          type: "object",
          properties: {
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day_of_week: { type: "integer", description: "0=Mon, 6=Sun" },
                  meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner"] },
                  name: { type: "string" },
                  description: { type: "string" },
                  ingredients: { type: "array", items: { type: "string" } },
                  estimated_cost: { type: "number" },
                  prep_minutes: { type: "integer" },
                  calories: { type: "integer" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" },
                  prep_tip: { type: "string" },
                },
                required: ["day_of_week", "meal_type", "name", "ingredients", "estimated_cost", "prep_minutes", "calories"],
              },
            },
            grocery_list: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: "string" },
                },
                required: ["name", "quantity"],
              },
            },
            prep_suggestions: { type: "array", items: { type: "string" } },
            weekly_total_cost: { type: "number" },
          },
          required: ["meals", "grocery_list", "prep_suggestions", "weekly_total_cost"],
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "weekly_meal_plan" } },
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
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "AI did not return a meal plan." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const args = JSON.parse(call.function.arguments || "{}");
    const meals: any[] = Array.isArray(args.meals) ? args.meals : [];
    const grocery: any[] = Array.isArray(args.grocery_list) ? args.grocery_list : [];
    const prepSuggestions: string[] = Array.isArray(args.prep_suggestions) ? args.prep_suggestions : [];

    const wkStart = mondayOf();
    const wkStartStr = wkStart.toISOString().slice(0, 10);

    // Replace existing plan for this week
    await supabase.from("meal_plans").delete().eq("user_id", user.id).eq("week_start", wkStartStr);

    const rows = meals.map((m: any) => ({
      user_id: user.id,
      week_start: wkStartStr,
      day_of_week: Math.max(0, Math.min(6, Number(m.day_of_week) || 0)),
      meal_type: m.meal_type || "lunch",
      name: m.name || "Meal",
      description: m.description || null,
      ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
      estimated_cost: Number(m.estimated_cost) || 0,
      prep_minutes: Number(m.prep_minutes) || 0,
      calories: Number(m.calories) || 0,
      protein_g: Number(m.protein_g) || 0,
      carbs_g: Number(m.carbs_g) || 0,
      fat_g: Number(m.fat_g) || 0,
      prep_tip: m.prep_tip || null,
    }));
    if (rows.length) {
      const ins = await supabase.from("meal_plans").insert(rows);
      if (ins.error) console.error("meal_plans insert error", ins.error);
    }

    // Add grocery items (skip duplicates by name, case-insensitive)
    if (grocery.length) {
      const { data: existing } = await supabase
        .from("grocery_items")
        .select("name")
        .eq("purchased", false);
      const have = new Set((existing ?? []).map((g: any) => g.name.toLowerCase()));
      const gRows = grocery
        .filter((g) => g.name && !have.has(String(g.name).toLowerCase()))
        .map((g: any) => ({
          user_id: user.id,
          name: String(g.name).slice(0, 200),
          quantity: g.quantity ? String(g.quantity).slice(0, 100) : null,
        }));
      if (gRows.length) {
        const gIns = await supabase.from("grocery_items").insert(gRows);
        if (gIns.error) console.error("grocery insert error", gIns.error);
      }
    }

    return new Response(JSON.stringify({
      week_start: wkStartStr,
      meals_inserted: rows.length,
      grocery_count: grocery.length,
      prep_suggestions: prepSuggestions,
      weekly_total_cost: args.weekly_total_cost ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("plan-meals error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});