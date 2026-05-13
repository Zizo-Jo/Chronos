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
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI is not connected yet." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const missedTitle: string = String(body?.missed_title || "").slice(0, 200);
    const missedNotes: string = String(body?.missed_notes || "").slice(0, 500);
    const missedAt: string | null = body?.missed_at || null;

    const now = new Date();
    const horizon = new Date(now); horizon.setDate(horizon.getDate() + 3);

    const [schedR, taskR] = await Promise.all([
      supabase.from("schedules").select("title, starts_at, ends_at, category")
        .gte("starts_at", now.toISOString()).lt("starts_at", horizon.toISOString()).order("starts_at"),
      supabase.from("tasks").select("title, due_date, priority, status").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false }).limit(10),
    ]);

    const system = `You are a kind, practical recovery coach. The user missed something. Suggest a realistic recovery plan over the next 1-3 days. Be warm, specific, and short. Use markdown:
- One-sentence reassurance.
- "## Reschedule" — propose 1-3 concrete time slots that fit around their existing schedule.
- "## Trim scope" — what they can safely cut or shorten.
- "## Tomorrow" — one habit to prevent recurrence.`;

    const userMsg = JSON.stringify({
      now: now.toISOString(),
      missed_title: missedTitle,
      missed_notes: missedNotes,
      missed_at: missedAt,
      upcoming_schedule: schedR.data ?? [],
      pending_tasks: taskR.data ?? [],
    });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits to your Lovable workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiRes.json();
    const plan = data.choices?.[0]?.message?.content || "No plan generated.";
    return new Response(JSON.stringify({ plan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("recovery-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});