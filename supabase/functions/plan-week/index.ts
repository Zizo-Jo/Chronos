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
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    const [profileR, subjectsR, examsR, tasksR, schedR, blocksR] = await Promise.all([
      supabase.from("user_profiles").select("full_name, wake_time, sleep_time, study_goals").eq("id", user.id).maybeSingle(),
      supabase.from("subjects").select("id, name, code"),
      supabase.from("exams").select("id, subject_id, title, exam_date, weight").gte("exam_date", today.toISOString()).order("exam_date"),
      supabase.from("tasks").select("id, title, course, subject_id, status, estimated_minutes, due_date, priority").neq("status", "done").limit(50),
      supabase.from("schedules").select("title, starts_at, ends_at, category").gte("starts_at", today.toISOString()).lt("starts_at", weekEnd.toISOString()),
      supabase.from("study_blocks").select("title, scheduled_start, scheduled_end").gte("scheduled_start", today.toISOString()).lt("scheduled_start", weekEnd.toISOString()),
    ]);

    const profile = profileR.data;
    const wake = profile?.wake_time || "08:00";
    const sleep = profile?.sleep_time || "23:00";

    const context = {
      week_start: today.toISOString().slice(0, 10),
      week_end: weekEnd.toISOString().slice(0, 10),
      wake, sleep,
      study_goals: profile?.study_goals || null,
      subjects: subjectsR.data || [],
      upcoming_exams: examsR.data || [],
      open_tasks: tasksR.data || [],
      existing_events: schedR.data || [],
      already_planned_blocks: blocksR.data || [],
    };

    const system = `You are an expert study planner. Build a balanced 7-day study plan as discrete study blocks.

Rules:
- Break large tasks into 25-50 min focused blocks (Pomodoro-style).
- Prioritize subjects with the nearest exams and high-priority tasks.
- Spread practice across days; avoid cramming a single subject in one day when possible.
- Respect wake/sleep window and existing events (don't double-book).
- Each block needs ISO datetimes (with timezone) within the next 7 days, between wake and sleep.
- subject_id and task_id are optional but include them when you can match by name.
- Return at least one block per active subject if there are exams or open tasks.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Generate my weekly study plan. Context:\n${JSON.stringify(context, null, 2)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_week_plan",
            description: "Save the generated weekly study plan as study blocks.",
            parameters: {
              type: "object",
              properties: {
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      scheduled_start: { type: "string", description: "ISO datetime" },
                      scheduled_end: { type: "string", description: "ISO datetime" },
                      duration_minutes: { type: "integer" },
                      subject_id: { type: "string", description: "UUID of subject if known" },
                      task_id: { type: "string", description: "UUID of task if known" },
                      notes: { type: "string" },
                    },
                    required: ["title", "scheduled_start", "scheduled_end", "duration_minutes"],
                  },
                },
              },
              required: ["blocks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_week_plan" } },
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
    const blocks = (args.blocks || []) as Array<{ title: string; scheduled_start: string; scheduled_end: string; duration_minutes: number; subject_id?: string; task_id?: string; notes?: string }>;

    if (blocks.length === 0) {
      return new Response(JSON.stringify({ blocks: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Remove previously AI-generated planned blocks for the upcoming week (notes contains [ai-week]).
    await supabase.from("study_blocks").delete()
      .eq("user_id", user.id)
      .eq("status", "planned")
      .gte("scheduled_start", today.toISOString())
      .lt("scheduled_start", weekEnd.toISOString())
      .like("notes", "%[ai-week]%");

    const validSubjectIds = new Set((subjectsR.data || []).map((s: any) => s.id));
    const validTaskIds = new Set((tasksR.data || []).map((t: any) => t.id));

    const toIso = (v: unknown): string | null => {
      if (typeof v !== "string") return null;
      // AI sometimes concatenates fields like "2026-05-07T11:50:00+00:00,scheduled_start:"
      // Extract the leading ISO 8601 datetime only.
      const m = v.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/);
      if (!m) return null;
      const d = new Date(m[0]);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };

    const rows = blocks
      .map((b) => {
        const start = toIso(b.scheduled_start);
        const end = toIso(b.scheduled_end);
        if (!start || !end) return null;
        return {
          user_id: user.id,
          title: b.title,
          scheduled_start: start,
          scheduled_end: end,
          duration_minutes: b.duration_minutes || 30,
          subject_id: b.subject_id && validSubjectIds.has(b.subject_id) ? b.subject_id : null,
          task_id: b.task_id && validTaskIds.has(b.task_id) ? b.task_id : null,
          status: "planned",
          notes: `[ai-week] ${b.notes || ""}`.trim(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ count: 0, error: "AI returned no valid blocks. Please try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await supabase.from("study_blocks").insert(rows);
    if (insErr) {
      console.error("insert error", insErr);
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "ai",
      title: "Your weekly study plan is ready",
      body: `AI generated ${rows.length} study block${rows.length === 1 ? "" : "s"} for the week.`,
      link: "/app/study",
    });

    return new Response(JSON.stringify({ count: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("plan-week error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});