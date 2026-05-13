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

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [profileR, tasksR, schedR, studyR, mealsR, habitsR] = await Promise.all([
      supabase.from("user_profiles").select("full_name, wake_time, sleep_time, study_goals, nutrition_goals").eq("id", user.id).maybeSingle(),
      supabase.from("tasks").select("title, course, status, estimated_minutes, due_date, priority").neq("status", "done").limit(20),
      supabase.from("schedules").select("title, starts_at, ends_at, category").gte("starts_at", today.toISOString()).lt("starts_at", tomorrow.toISOString()),
      supabase.from("study_sessions").select("subject, duration_minutes, started_at").gte("started_at", new Date(Date.now() - 7 * 86400000).toISOString()).limit(20),
      supabase.from("meals").select("name, meal_type, calories, consumed_at").gte("consumed_at", today.toISOString()),
      supabase.from("habits").select("name, target_per_week, current_streak").eq("active", true),
    ]);

    const profile = profileR.data;
    const wake = profile?.wake_time || "08:00";
    const sleep = profile?.sleep_time || "23:00";

    const context = {
      today: today.toISOString().slice(0, 10),
      wake, sleep,
      study_goals: profile?.study_goals || null,
      nutrition_goals: profile?.nutrition_goals || null,
      open_tasks: tasksR.data || [],
      existing_events_today: schedR.data || [],
      recent_study_sessions: studyR.data || [],
      meals_today: mealsR.data || [],
      habits: habitsR.data || [],
    };

    const system = `You are a planning assistant. Given a student's data, design an optimized day plan as scheduled time blocks. Respect existing events. Include focus blocks for top tasks, meal slots, habit slots, and breaks. Times must be ISO 8601 with timezone using TODAY's date. Categories must be one of: class, study, focus, meal, habit, break, other.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Plan my day. Context:\n${JSON.stringify(context, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_day_plan",
            description: "Save the generated day plan as a list of schedule blocks.",
            parameters: {
              type: "object",
              properties: {
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      starts_at: { type: "string", description: "ISO datetime" },
                      ends_at: { type: "string", description: "ISO datetime" },
                      category: { type: "string", enum: ["class","study","focus","meal","habit","break","other"] },
                      notes: { type: "string" },
                    },
                    required: ["title", "starts_at", "ends_at", "category"],
                  },
                },
              },
              required: ["blocks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_day_plan" } },
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No plan returned" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const args = JSON.parse(toolCall.function.arguments || "{}");
    const blocks = (args.blocks || []) as Array<{ title: string; starts_at: string; ends_at: string; category: string; notes?: string }>;

    if (blocks.length === 0) {
      return new Response(JSON.stringify({ blocks: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Remove existing AI-generated events (notes contains "ai-plan") for today, then insert.
    await supabase.from("schedules").delete()
      .eq("user_id", user.id)
      .gte("starts_at", today.toISOString())
      .lt("starts_at", tomorrow.toISOString())
      .like("notes", "%[ai-plan]%");

    const rows = blocks.map((b) => ({
      user_id: user.id,
      title: b.title,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      category: b.category,
      notes: `[ai-plan] ${b.notes || ""}`.trim(),
    }));

    const { error: insErr } = await supabase.from("schedules").insert(rows);
    if (insErr) {
      console.error("insert error", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "schedule",
      title: "Today's plan is ready",
      body: `AI added ${rows.length} block${rows.length === 1 ? "" : "s"} to your day.`,
      link: "/app/calendar",
    });

    return new Response(JSON.stringify({ blocks: rows }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("plan-day error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});