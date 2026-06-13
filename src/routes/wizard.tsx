import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, ThumbsDown, ThumbsUp, AlertCircle } from "lucide-react";
import { PageHeader } from "../components/AppShell";

export const Route = createFileRoute("/wizard")({
  head: () => ({ meta: [{ title: "Maintenance Wizard · Tata" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  component: Wizard,
});

const SUGGESTIONS = [
  "Diagnose HSM-F4 bearing vibration and recommend immediate actions.",
  "What is causing the tuyere thermal drift on BF-03?",
  "Prioritize maintenance for tomorrow's shift considering spares.",
  "Explain the DGA trend on EAF Transformer T1.",
  "Generate an outage plan for the next 14 days.",
  "Recommend spare procurement actions this week.",
];

type Msg = { role: "user" | "assistant"; content: string; feedback?: "up" | "partial" | "down" };

function Wizard() {
  const { q } = Route.useSearch();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(q ?? "");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }, { role: "assistant", content: "" }];
    setMessages(next);
    setBusy(true);

    try {
      const resp = await fetch("/api/wizard", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(0, -1).map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!resp.ok || !resp.body) {
        const t = await resp.text();
        setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: `⚠️ ${resp.status === 429 ? "Rate limit reached — please wait a moment." : resp.status === 402 ? "AI credits exhausted. Add credits in workspace settings." : t || "Wizard temporarily unavailable."}` }; return c; });
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: acc }; return c; });
      }
    } catch (e) {
      setMessages(prev => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: `⚠️ ${(e as Error).message}` }; return c; });
    } finally { setBusy(false); }
  }

  useEffect(() => { if (q && messages.length === 0) send(q); /* eslint-disable-next-line */ }, [q]);

  return (
    <div className="flex flex-col h-screen">
      <div className="p-8 pb-4 max-w-[1100px] w-full mx-auto">
        <PageHeader eyebrow="Maintenance Wizard" title="Ask anything about the plant"
          subtitle="Reasoning grounded in live equipment, alerts, maintenance logs, spares and the knowledge base. Multi-turn memory enabled." />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-thin">
        <div className="max-w-[1100px] mx-auto px-8 pb-6">
          {messages.length === 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">I have live context on your equipment, alerts, recent maintenance logs and spares. Try one of these:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} className="text-left panel panel-hover p-4 text-sm transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="h-9 w-9 shrink-0 rounded-md bg-gradient-to-br from-primary to-[oklch(0.62_0.20_30)] flex items-center justify-center glow-primary">
                      <Sparkles className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`${m.role === "user" ? "max-w-[75%] bg-primary/10 border border-primary/30 text-foreground" : "flex-1 panel"} p-4 rounded-lg`}>
                    {m.role === "assistant" ? (
                      <>
                        <WizardMarkdown text={m.content || "…"} />
                        {m.content && !busy && (
                          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                            <span>Was this useful?</span>
                            <div className="flex gap-1">
                              {([["up", ThumbsUp, "Correct"], ["partial", AlertCircle, "Partially"], ["down", ThumbsDown, "Incorrect"]] as const).map(([k, Icon, label]) => (
                                <button key={k} onClick={() => setMessages(prev => prev.map((x, j) => j === i ? { ...x, feedback: k } : x))}
                                  className={`px-2 py-1 rounded inline-flex items-center gap-1 border ${m.feedback === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
                                  <Icon className="h-3 w-3" />{label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-[color:var(--panel)]/80 backdrop-blur p-4">
        <div className="max-w-[1100px] mx-auto flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder="Describe a symptom, ask for a diagnosis, or request a plan…"
            className="flex-1 panel px-4 py-3 text-sm outline-none focus:border-primary" />
          <button onClick={() => send()} disabled={busy || !input.trim()}
            className="bg-primary text-primary-foreground px-4 rounded-md font-medium text-sm disabled:opacity-40 glow-primary inline-flex items-center gap-2">
            <Send className="h-4 w-4" />{busy ? "Thinking" : "Send"}
          </button>
        </div>
        <div className="max-w-[1100px] mx-auto text-[11px] text-muted-foreground mt-2 text-center">
          Wizard reasoning grounded in live equipment, alerts, logs, spares and the knowledge base · Maintenance Intelligence Engine
        </div>
      </div>
    </div>
  );
}

// Minimal markdown renderer tuned for the wizard response template
function WizardMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  const flush = (key: string) => {
    if (listBuf.length) {
      out.push(<ul key={`l-${key}`} className="list-disc list-outside ml-5 space-y-1 my-2 text-sm">{listBuf.map((it, k) => <li key={k}>{inline(it)}</li>)}</ul>);
      listBuf = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) { flush(`h${i}`); out.push(<h3 key={i} className="font-semibold text-primary mt-4 mb-1.5 text-sm uppercase tracking-wider">{line.slice(3)}</h3>); }
    else if (line.startsWith("# ")) { flush(`h${i}`); out.push(<h2 key={i} className="font-bold text-base mt-3 mb-2">{line.slice(2)}</h2>); }
    else if (/^[-*]\s+/.test(line)) { listBuf.push(line.replace(/^[-*]\s+/, "")); }
    else if (line.trim() === "") { flush(`b${i}`); out.push(<div key={i} className="h-1" />); }
    else { flush(`p${i}`); out.push(<p key={i} className="text-sm leading-relaxed my-1">{inline(line)}</p>); }
  });
  flush("end");
  return <div>{out}</div>;
}
function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
