import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export default function Assistant() {
  const { user, session } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [firstName, setFirstName] = useState<string>("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_profiles").select("full_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        const fn = (data?.full_name || user.email?.split("@")[0] || "").split(" ")[0];
        setFirstName(fn);
      });
  }, [user]);

  // Load chat history from supabase
  useEffect(() => {
    if (!user) return;
    supabase.from("ai_messages")
      .select("role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMsgs(data.map((m: any) => ({ role: m.role, content: m.content })));
      });
  }, [user]);

  // Auto-focus input when ?focus=1 (from header Ask AI button)
  useEffect(() => {
    if (searchParams.get("focus")) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchParams]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  const send = async (val?: string) => {
    const v = (val ?? text).trim();
    if (!v || sending) return;
    setText("");
    const userMsg: Msg = { role: "user", content: v };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setSending(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMsgs((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (resp.status === 503) { toast.error("AI is not connected yet."); setSending(false); return; }
      if (resp.status === 429) { toast.error("Rate limit exceeded. Try again shortly."); setSending(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setSending(false); return; }
      if (!resp.ok || !resp.body) { toast.error("Failed to reach the assistant."); setSending(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsertAssistant(c);
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      // persist after stream completes
      if (user) {
        await supabase.from("ai_messages").insert([
          { user_id: user.id, role: "user", content: v },
          { user_id: user.id, role: "assistant", content: assistantSoFar },
        ]);
      }
    } catch (e: any) {
      toast.error(e?.message || "Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <PageHeader title={t("app.pages.assistantTitle")} subtitle={t("app.pages.assistantSubtitle")} />
      <div className="flex-1 glass rounded-3xl p-6 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
          {msgs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <p className="text-base">
                {t("app.pages.assistantHi")}{firstName ? `, ${firstName}` : ""} 👋
              </p>
              <p className="text-sm max-w-md">{t("app.pages.assistantPrompt")}</p>
            </div>
          ) : msgs.map((m, i) => (
            <div key={i} className={`flex gap-3 animate-fade-in ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "glass"
              }`}>
                {m.role === "assistant"
                  ? <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{m.content || "…"}</ReactMarkdown></div>
                  : m.content}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-4 flex gap-2">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("app.common.askPlaceholder")}
            disabled={sending}
            className="h-12 rounded-2xl glass border-glass-border"
          />
          <Button type="submit" disabled={sending || !text.trim()} className="h-12 px-5 rounded-2xl bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}