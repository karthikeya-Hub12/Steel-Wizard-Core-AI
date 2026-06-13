import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowRight, PackageCheck, ShoppingCart, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/AppShell";
import { useEquipment, useSpares, procurementStatus } from "../hooks/usePlantData";
import { createProcurementRequest } from "@/lib/plant.functions";
import type { Equipment, SparePart } from "@/types/plant";

type SparesFilter = "all" | "below_reorder";

export const Route = createFileRoute("/spares")({
  head: () => ({ meta: [{ title: "Spare Intelligence · Tata Maintenance Wizard" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    filter: (s.filter === "below_reorder" ? "below_reorder" : "all") as SparesFilter,
  }),
  component: Spares,
});

function Spares() {
  const { filter } = Route.useSearch();
  const navigate = useNavigate({ from: "/spares" });
  const eq = useEquipment();
  const sp = useSpares();
  const equipment = eq.data ?? [];
  const spares = sp.data ?? [];
  const loading = eq.isLoading || sp.isLoading;
  const errored = eq.isError || sp.isError;

  const [openSpare, setOpenSpare] = useState<SparePart | null>(null);
  const [prTarget, setPrTarget] = useState<SparePart | null>(null);

  const totalValue = spares.reduce((s, p) => s + p.stock * p.unitCost, 0);
  const shortages = spares.filter(s => s.stock <= s.reorderLevel);
  const criticalShort = spares.filter(s => s.criticality === "A" && s.stock <= s.reorderLevel).length;

  const list = filter === "below_reorder" ? shortages : spares;

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Procurement Intelligence" title="Spare Intelligence"
        subtitle={loading ? "Connecting to Plant Link • Live… loading inventory streams."
          : errored ? "Telemetry connection lost. Displaying cached operational data."
          : "Inventory positioned against predicted failures and lead times. Procurement risk is recomputed as equipment health degrades."}
        actions={
          <div className="flex items-center gap-1 panel p-1 text-xs">
            <button onClick={() => navigate({ search: { filter: "all" } })} className={`px-3 py-1.5 rounded ${filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>All <span className="ml-1 opacity-70 font-mono">{spares.length}</span></button>
            <button onClick={() => navigate({ search: { filter: "below_reorder" } })} className={`px-3 py-1.5 rounded ${filter === "below_reorder" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Below Reorder <span className="ml-1 opacity-70 font-mono">{shortages.length}</span></button>
          </div>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Tile icon={<PackageCheck className="h-4 w-4 text-healthy" />} label="Parts Tracked" value={String(spares.length)} />
        <Tile icon={<AlertTriangle className="h-4 w-4 text-critical" />} label="Below Reorder" value={String(shortages.length)} tone="critical" />
        <Tile icon={<ShoppingCart className="h-4 w-4 text-warning" />} label="Class-A Shortages" value={String(criticalShort)} tone="warning" />
        <Tile icon={<PackageCheck className="h-4 w-4 text-info" />} label="Inventory Value" value={`$${(totalValue/1000).toFixed(0)}k`} />
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr className="text-left">
              <th className="px-5 py-3">Part</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3 text-right">Stock</th>
              <th className="px-3 py-3 text-right">Reorder</th>
              <th className="px-3 py-3 text-right">Lead</th>
              <th className="px-3 py-3">Supplier</th>
              <th className="px-3 py-3">Class</th>
              <th className="px-3 py-3">Procurement Status</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map(s => {
              const linkedEq = equipment.filter(e => s.associatedAssets.includes(e.id));
              const minRul = linkedEq.length ? Math.min(...linkedEq.map(e => e.rulDays)) : 999;
              const ps = procurementStatus(s, minRul);
              const tagCls = ps.tone === "critical" ? "tag-critical" : ps.tone === "high" ? "tag-high" : ps.tone === "medium" ? "tag-medium" : "tag-low";
              return (
                <tr key={s.partNo} className="border-b border-border/60 hover:bg-accent/30 transition cursor-pointer"
                  onClick={() => setOpenSpare(s)}>
                  <td className="px-5 py-3 font-mono text-xs">{s.partNo}</td>
                  <td className="px-3 py-3">{s.description}</td>
                  <td className={`px-3 py-3 text-right font-mono ${s.stock <= s.reorderLevel ? "text-critical font-semibold" : ""}`}>{s.stock}</td>
                  <td className="px-3 py-3 text-right font-mono text-muted-foreground">{s.reorderLevel}</td>
                  <td className="px-3 py-3 text-right font-mono">{s.leadTimeDays}d</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{s.supplier}</td>
                  <td className="px-3 py-3"><span className="tag tag-neutral">{s.criticality}</span></td>
                  <td className="px-3 py-3"><span className={`tag ${tagCls}`}>{ps.label}</span></td>
                  <td className="px-3 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); setPrTarget(s); }}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-accent inline-flex items-center gap-1">
                      Raise PR <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-8 text-center text-xs text-muted-foreground">{loading ? "Loading inventory…" : errored ? "Telemetry connection lost." : "No parts."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {openSpare && <SpareDialog spare={openSpare} equipment={equipment} onClose={() => setOpenSpare(null)} onRaisePR={() => { setPrTarget(openSpare); setOpenSpare(null); }} />}
      {prTarget && <RaisePRDialog spare={prTarget} onClose={() => setPrTarget(null)} />}
    </div>
  );
}

function SpareDialog({ spare, equipment, onClose, onRaisePR }: { spare: SparePart; equipment: Equipment[]; onClose: () => void; onRaisePR: () => void }) {
  const linked = equipment.filter(e => spare.associatedAssets.includes(e.id));
  const minRul = linked.length ? Math.min(...linked.map(e => e.rulDays)) : 999;
  const ps = procurementStatus(spare, minRul);
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-6" onClick={onClose}>
      <div className="panel w-full max-w-3xl p-7 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{spare.partNo} · Class {spare.criticality}</div>
            <h2 className="text-xl font-semibold mt-1">{spare.description}</h2>
            <div className="text-xs text-muted-foreground mt-1">Procurement status: <span className={`tag ${ps.tone === "critical" ? "tag-critical" : ps.tone === "high" ? "tag-high" : ps.tone === "medium" ? "tag-medium" : "tag-low"} ml-1`}>{ps.label}</span></div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Mini label="Current Stock" value={`${spare.stock}`} tone={spare.stock <= spare.reorderLevel ? "critical" : undefined} />
          <Mini label="Reorder Level" value={`${spare.reorderLevel}`} />
          <Mini label="Lead Time" value={`${spare.leadTimeDays}d`} tone={minRul < spare.leadTimeDays ? "critical" : undefined} />
          <Mini label="Annual Use" value={`${spare.consumptionPerYear}`} />
          <Mini label="Unit Cost" value={`$${spare.unitCost.toLocaleString()}`} />
          <Mini label="Stock Value" value={`$${(spare.stock * spare.unitCost).toLocaleString()}`} />
          <Mini label="Usage Trend" value={spare.usageTrend} />
          <Mini label="Min Asset RUL" value={`${minRul}d`} tone={minRul < spare.leadTimeDays ? "critical" : undefined} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Block label="Primary Supplier" value={spare.supplier} />
          <Block label="Alternative Suppliers" value={spare.alternativeSuppliers} />
        </div>

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Associated Equipment</div>
          <div className="flex flex-wrap gap-1.5">
            {linked.length === 0 && <span className="text-xs text-muted-foreground">Generic stock; no direct dependency.</span>}
            {linked.map(e => (
              <Link key={e.id} to="/equipment/$id" params={{ id: e.id }} className="tag tag-neutral hover:border-primary">{e.id} · RUL {e.rulDays}d</Link>
            ))}
          </div>
        </div>

        <Block label="Procurement Recommendation" value={
          ps.tone === "critical" ? `Lead time ${spare.leadTimeDays}d exceeds shortest linked-asset RUL ${minRul}d. Air-freight expedite from ${spare.supplier} or split source via ${spare.alternativeSuppliers}.`
          : ps.tone === "high" ? `Stock below reorder. Issue PR this week to ${spare.supplier}. Plan delivery within ${spare.leadTimeDays}d.`
          : ps.tone === "medium" ? `Stock near reorder threshold or usage trending upward. Schedule review at next planning cycle.`
          : `Inventory healthy. No procurement action required.`
        } accent />

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md text-sm border border-border hover:bg-accent">Close</button>
          <button onClick={onRaisePR} className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2">Raise Purchase Requisition <ArrowRight className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
}

function RaisePRDialog({ spare, onClose }: { spare: SparePart; onClose: () => void }) {
  const [qty, setQty] = useState(Math.max(spare.reorderLevel - spare.stock + 1, 1));
  const [priority, setPriority] = useState<"emergency" | "high" | "normal">(spare.stock === 0 ? "emergency" : spare.stock <= spare.reorderLevel ? "high" : "normal");
  const [justification, setJustification] = useState(`Reorder ${spare.partNo} (${spare.description}). Current stock ${spare.stock} vs reorder ${spare.reorderLevel}, lead time ${spare.leadTimeDays}d.`);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await createProcurementRequest({ data: {
        partNumber: spare.partNo, description: spare.description, supplier: spare.supplier,
        quantity: qty, estimatedCost: qty * spare.unitCost, priority,
        justification,
      }});
      toast.success(`Purchase requisition ${result.prNumber} submitted`, {
        description: `${spare.partNo} · qty ${qty} · ${spare.supplier} · est. $${(qty * spare.unitCost).toLocaleString()}`,
      });
      onClose();
    } catch (e) {
      toast.error("Could not raise PR", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-6" onClick={onClose}>
      <div className="panel w-full max-w-xl p-7 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">Procurement Request</div>
            <h2 className="text-xl font-semibold mt-1">Raise PR — {spare.partNo}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <Field label="Part Number"><input readOnly value={spare.partNo} className="w-full panel px-3 py-2 text-sm font-mono" /></Field>
          <Field label="Description"><input readOnly value={spare.description} className="w-full panel px-3 py-2 text-sm" /></Field>
          <Field label="Supplier"><input readOnly value={spare.supplier} className="w-full panel px-3 py-2 text-sm" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity"><input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))} className="w-full panel px-3 py-2 text-sm font-mono" /></Field>
            <Field label={`Estimated Cost ($${spare.unitCost.toLocaleString()}/unit)`}><input readOnly value={`$${(qty * spare.unitCost).toLocaleString()}`} className="w-full panel px-3 py-2 text-sm font-mono" /></Field>
          </div>
          <Field label="Priority">
            <select value={priority} onChange={e => setPriority(e.target.value as "emergency" | "high" | "normal")} className="w-full panel px-3 py-2 text-sm">
              <option value="emergency">Emergency (air-freight)</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
          </Field>
          <Field label="Business Justification">
            <textarea rows={3} value={justification} onChange={e => setJustification(e.target.value)} className="w-full panel px-3 py-2 text-sm resize-none" />
          </Field>
          <div className="text-[11px] text-muted-foreground">Approval status will be <span className="text-foreground font-medium">pending_approval</span> on submission and routed to Procurement.</div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md text-sm border border-border hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={busy} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            {busy ? "Submitting…" : "Submit PR"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "critical" }) {
  const color = tone === "critical" ? "text-critical" : "text-foreground";
  return (
    <div className="rounded-md bg-[color:var(--panel-2)] border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono font-semibold kpi-num ${color}`}>{value}</div>
    </div>
  );
}

function Block({ label, value, accent }: { label: string; value?: string | null; accent?: boolean }) {
  if (!value) return null;
  return (
    <div className={`rounded-md p-3 ${accent ? "bg-primary/5 border border-primary/20" : "bg-[color:var(--panel-2)] border border-border"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-sm leading-snug">{value}</div>
    </div>
  );
}

function Tile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "critical" | "warning" }) {
  const color = tone === "critical" ? "text-critical" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className={`mt-2 text-3xl font-semibold kpi-num ${color}`}>{value}</div>
    </div>
  );
}
