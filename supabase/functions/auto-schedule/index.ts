import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FILLABLE = new Set(["study", "focus", "meal", "break", "habit", "other"]);

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
    const supabase = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const dateStr: string = body?.date || new Date().toISOString().slice(0, 10);
    const bufferMin: number = Math.max(0, Math.min(60, Number(body?.buffer_minutes ?? 10)));

    const dayStart = new Date(`${dateStr}T00:00:00`);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

    const [profileR, schedR, taskR] = await Promise.all([
      supabase.from("user_profiles").select("wake_time, sleep_time, study_goals, nutrition_goals").eq("id", user.id).maybeSingle(),
      supabase.from("schedules").select("id, title, starts_at, ends_at, category, location")
        .gte("starts_at", dayStart.toISOString()).lt("starts_at", dayEnd.toISOString()).order("starts_at"),
      supabase.from("tasks").select("id, title, description, due_date, estimated_minutes, priority, status")
        .neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(15),
    ]);

    const wake = (profileR.data?.wake_time as string | null) || "07:30";
    const sleep = (profileR.data?.sleep_time as string | null) || "23:00";

    // Remove previously auto-filled (non-fixed) blocks so we replan cleanly
    const fillableExisting = (schedR.data ?? []).filter((s: any) => FILLABLE.has(s.category));
    if (fillableExisting.length) {
      await supabase.from("schedules").delete().in("id", fillableExisting.map((s: any) => s.id));
    }
    const fixed = (schedR.data ?? []).filter((s: any) => !FILLABLE.has(s.category));

    const system = `You are an adaptive day planner. Given a user's fixed commitments, plan their remaining time between wake and sleep.

Rules:
- Never overlap with fixed commitments.
- Always leave a ${bufferMin}-minute buffer before and after each fixed commitment.
- Keep blocks 25-90 minutes; insert short break blocks (10-15 min) between focus/study blocks.
- Schedule meals (~30 min) around typical times: breakfast 07-09, lunch 12-13:30, dinner 18-20.
- Prioritize pending tasks by due date and priority. Use the task title in the block title (e.g. "Study: <task title>").
- Categories you may use: study, focus, meal, break, habit, other.
- Times must be ISO with timezone offset matching the user's local day (use the user's local date as given).`;

    const userMsg = JSON.stringify({
      date: dateStr,
      wake_time: wake,
      sleep_time: sleep,
      buffer_minutes: bufferMin,
      study_goals: profileR.data?.study_goals || null,
      nutrition_goals: profileR.data?.nutrition_goals || null,
      fixed_commitments: fixed.map((s: any) => ({
        title: s.title, starts_at: s.starts_at, ends_at: s.ends_at, category: s.category, location: s.location,
      })),
      pending_tasks: (taskR.data ?? []).map((t: any) => ({
        title: t.title, due_date: t.due_date, estimated_minutes: t.estimated_minutes, priority: t.priority,
      })),
    });

    const tools = [{
      type: "function",
      function: {
        name: "fill_day",
        description: "Return blocks to insert that fill the free gaps in the day.",
        parameters: {
          type: "object",
          properties: {
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  starts_at: { type: "string", description: "ISO 8601" },
                  ends_at: { type: "string", description: "ISO 8601" },
                  category: { type: "string", enum: ["study", "focus", "meal", "break", "habit", "other"] },
                  notes: { type: "string" },
                },
                required: ["title", "starts_at", "ends_at", "category"],
              },
            },
          },
          required: ["blocks"],
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
        tool_choice: { type: "function", function: { name: "fill_day" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to your Lovable workspace to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      console.error("auto-schedule AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return new Response(JSON.stringify({ error: "AI did not return blocks." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const args = JSON.parse(call.function.arguments || "{}");
    const blocks: any[] = Array.isArray(args.blocks) ? args.blocks : [];

    // Validate: no overlap with fixed, respect buffer, valid range
    const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && bS < aE;
    const bufferMs = bufferMin * 60_000;

    const cleaned = blocks
      .map((b) => {
        const s = new Date(b.starts_at).getTime();
        const e = new Date(b.ends_at).getTime();
        if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
        if (s < dayStart.getTime() || e > dayEnd.getTime()) return null;
        for (const f of fixed) {
          const fS = new Date(f.starts_at).getTime() - bufferMs;
          const fE = new Date(f.ends_at).getTime() + bufferMs;
          if (overlaps(s, e, fS, fE)) return null;
        }
        const cat = FILLABLE.has(b.category) ? b.category : "other";
        return { starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(), title: String(b.title || "Block").slice(0, 200), category: cat, notes: b.notes || null };
      })
      .filter(Boolean) as any[];

    // De-overlap among generated blocks (keep earlier-starting)
    cleaned.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    const final: any[] = [];
    for (const b of cleaned) {
      const conflict = final.some((x) => overlaps(new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime(), new Date(x.starts_at).getTime(), new Date(x.ends_at).getTime()));
      if (!conflict) final.push(b);
    }

    if (final.length) {
      const { error } = await supabase.from("schedules").insert(final.map((b) => ({ ...b, user_id: user.id })));
      if (error) console.error("insert blocks error", error);
      else {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "schedule",
          title: "Schedule updated",
          body: `AI added ${final.length} block${final.length === 1 ? "" : "s"} to your day.`,
          link: "/app/calendar",
        });
      }
    }

    return new Response(JSON.stringify({ inserted: final.length, removed: fillableExisting.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-schedule error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});