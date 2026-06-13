import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, FileText, Search, Sparkles, X } from "lucide-react";
import { PageHeader } from "../components/AppShell";
import { useKnowledgeDocs } from "../hooks/usePlantData";
import { incrementDocUsage } from "@/lib/plant.functions";
import type { KnowledgeDoc } from "@/types/plant";

export const Route = createFileRoute("/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Base · Tata Maintenance Wizard" }] }),
  component: KB,
});

function KB() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<KnowledgeDoc | null>(null);
  const { data, isLoading, isError } = useKnowledgeDocs();
  const docs = data ?? [];

  const results = useMemo(() => {
    if (!q.trim()) return docs;
    const t = q.toLowerCase();
    return docs.filter(d =>
      d.title.toLowerCase().includes(t) ||
      d.summary.toLowerCase().includes(t) ||
      d.category.toLowerCase().includes(t) ||
      d.tags.some(g => g.toLowerCase().includes(t)) ||
      d.relatedAssets.some(a => a.toLowerCase().includes(t)));
  }, [q, docs]);

  async function openDoc(d: KnowledgeDoc) {
    setOpen(d);
    try { await incrementDocUsage({ data: { docId: d.id } }); } catch { /* non-blocking */ }
  }

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Reasoning Corpus" title="Knowledge Base"
        subtitle={isLoading ? "Connecting to Plant Link • Live… loading reasoning corpus."
          : isError ? "Knowledge corpus unavailable."
          : `${docs.length} documents — equipment manuals, SOPs, failure reports, OEM bulletins, inspection checklists, reliability guidelines and condition-monitoring references. Semantic context powers every Wizard recommendation.`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
        <div className="relative md:col-span-2 xl:col-span-3">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search bearings, scaffolding, DGA, cavitation, SOP, OEM, asset code…"
            className="w-full panel pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {results.map(d => (
          <button key={d.id} onClick={() => openDoc(d)} className="text-left panel panel-hover p-4 transition">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="tag tag-info text-[9px]">{d.category}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{d.id}</span>
            </div>
            <div className="font-medium text-sm leading-snug">{d.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{d.summary}</div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>Used {d.usageCount}×</span>
              <span>Conf +{d.confidenceContribution.toFixed(2)}</span>
              <span>Rel {d.relevanceScore.toFixed(2)}</span>
            </div>
          </button>
        ))}
        {results.length === 0 && !isLoading && (
          <div className="md:col-span-2 xl:col-span-3 panel p-8 text-center text-sm text-muted-foreground">No matching documents.</div>
        )}
      </div>

      {open && <DocDialog doc={open} onClose={() => setOpen(null)} all={docs} />}
    </div>
  );
}

function DocDialog({ doc, onClose, all }: { doc: KnowledgeDoc; onClose: () => void; all: KnowledgeDoc[] }) {
  const refs = all.filter(d => doc.crossReferences.includes(d.id));
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-6" onClick={onClose}>
      <div className="panel w-full max-w-3xl p-7 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{doc.id} · {doc.category} · {doc.pages} pages · Updated {doc.updatedOn}</div>
            <h2 className="text-xl font-semibold mt-1 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />{doc.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-4 mb-5">
          <div className="text-[11px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5 mb-1.5"><Sparkles className="h-3 w-3" />Document Summary</div>
          <p className="text-sm leading-relaxed">{doc.summary}</p>
          {doc.content && <p className="text-sm leading-relaxed mt-2 text-muted-foreground">{doc.content}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Tile label="Usage Count" value={`${doc.usageCount}`} />
          <Tile label="Confidence Contribution" value={`+${doc.confidenceContribution.toFixed(2)}`} />
          <Tile label="Relevance Score" value={doc.relevanceScore.toFixed(2)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Related Assets</div>
            <div className="flex flex-wrap gap-1.5">
              {doc.relatedAssets.map(a => <span key={a} className="tag tag-neutral">{a}</span>)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Related Failure Modes</div>
            <div className="flex flex-wrap gap-1.5">
              {doc.relatedFailureModes.map(f => <span key={f} className="tag tag-info text-[9px]">{f}</span>)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-5">
          {doc.tags.map(t => <span key={t} className="tag tag-neutral">{t}</span>)}
        </div>

        {refs.length > 0 && (
          <>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Cross-References</div>
            <div className="space-y-2 text-sm">
              {refs.map(d => (
                <div key={d.id} className="flex items-start gap-2 text-xs">
                  <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{d.title}</div>
                    <div className="text-muted-foreground">{d.id} · {d.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[color:var(--panel-2)] border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold font-mono kpi-num mt-1">{value}</div>
    </div>
  );
}
