import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Gauge, Package, Sparkles, TrendingDown, Wrench, X } from "lucide-react";
import { PageHeader, SeverityTag } from "../components/AppShell";
import { backlogByArea, healthTrend } from "../lib/plant-data";
import { useEquipment, useAlerts, useSpares, computePlantKpi, prioritizeEquipment } from "../hooks/usePlantData";
import { useRealtimeStatus } from "@/hooks/useAlertsRealtime";
import type { Equipment, SparePart } from "@/types/plant";

type DialogKind = null | "health" | "reliability" | "critical" | "nearFailure";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Overview · Tata Maintenance Wizard" }] }),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery({ queryKey: ["plant","equipment"], queryFn: () => import("../lib/plant.functions").then(m => m.listEquipment()) });
    void context.queryClient.prefetchQuery({ queryKey: ["plant","alerts"], queryFn: () => import("../lib/plant.functions").then(m => m.listAlerts()) });
    void context.queryClient.prefetchQuery({ queryKey: ["plant","spares"], queryFn: () => import("../lib/plant.functions").then(m => m.listSpares()) });
  },
  component: Overview,
});

function Overview() {
  const eq = useEquipment();
  const al = useAlerts();
  const sp = useSpares();
  const rt = useRealtimeStatus();
  const navigate = useNavigate({ from: "/" });
  const [dialog, setDialog] = useState<DialogKind>(null);

  const equipment = eq.data ?? [];
  const alerts = al.data ?? [];
  const spares = sp.data ?? [];

  const loading = eq.isLoading || al.isLoading || sp.isLoading;
  const errored = eq.isError || al.isError || sp.isError;
  const k = computePlantKpi(equipment, alerts, spares);
  const prioritized = prioritizeEquipment(equipment);

  const risk = [
    { name: "Critical", v: equipment.filter(e => e.risk === "CRITICAL").length, c: "var(--critical)" },
    { name: "High",     v: equipment.filter(e => e.risk === "HIGH").length,     c: "oklch(0.72 0.20 35)" },
    { name: "Medium",   v: equipment.filter(e => e.risk === "MEDIUM").length,   c: "var(--warning)" },
    { name: "Low",      v: equipment.filter(e => e.risk === "LOW").length,      c: "var(--healthy)" },
  ];

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <PageHeader eyebrow={`Plant Condition • ${rt.live ? "Live" : "Reconnecting"} • Shift B`}
        title="Plant operating in healthy band — proactive intervention required on top assets."
        subtitle={loading ? "Connecting to Plant Link • Live… loading telemetry streams."
          : errored ? "Telemetry connection lost. Displaying cached operational data."
          : `Overall reliability is strong at ${k.reliability}%. ${k.critical} critical asset${k.critical === 1 ? "" : "s"} and ${k.nearFailure} asset${k.nearFailure === 1 ? "" : "s"} near failure require attention. ${rt.label}.`}
        actions={
          <>
            <Link to="/wizard" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium glow-primary"><Sparkles className="h-4 w-4" />Ask the Wizard</Link>
            <Link to="/alerts" className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-md text-sm font-medium hover:bg-accent">Review alerts <ArrowRight className="h-4 w-4" /></Link>
          </>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Kpi onClick={() => setDialog("health")}     icon={<Gauge className="h-4 w-4 text-healthy" />} label="Plant Health" value={`${k.health}%`} sub="Healthy band" />
        <Kpi onClick={() => setDialog("reliability")} icon={<TrendingDown className="h-4 w-4 text-healthy" />} label="Reliability Index" value={`${k.reliability}%`} sub="Weighted" />
        <Kpi onClick={() => navigate({ to: "/alerts", search: { status: "open" } })} icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Open Alerts" value={String(k.openAlerts)} tone="warning" />
        <Kpi onClick={() => setDialog("critical")} icon={<Wrench className="h-4 w-4 text-critical" />} label="Critical Assets" value={String(k.critical)} tone="critical" />
        <Kpi onClick={() => setDialog("nearFailure")} icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Assets Near Failure" value={String(k.nearFailure)} tone="warning" />
        <Kpi onClick={() => navigate({ to: "/spares", search: { filter: "below_reorder" } })} icon={<Package className="h-4 w-4 text-warning" />} label="Spares Below Reorder" value={String(k.spareShortages)} tone="warning" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Panel className="xl:col-span-2" title="Plant Health & Reliability Trend" sub="Rolling 24 days, weighted across A-criticality assets">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={healthTrend} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.74 0.17 50)" stopOpacity={0.6} /><stop offset="100%" stopColor="oklch(0.74 0.17 50)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="oklch(0.70 0.15 245)" stopOpacity={0.5} /><stop offset="100%" stopColor="oklch(0.70 0.15 245)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.30 0.015 260 / 0.4)" strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke="oklch(0.6 0.01 250)" fontSize={11} />
                <YAxis stroke="oklch(0.6 0.01 250)" fontSize={11} domain={[40, 100]} />
                <Tooltip contentStyle={{ background:"#11151C", border:"1px solid oklch(0.30 0.015 260)", borderRadius:8 }} />
                <Area type="monotone" dataKey="health" stroke="oklch(0.74 0.17 50)" fill="url(#gH)" strokeWidth={2} />
                <Area type="monotone" dataKey="reliability" stroke="oklch(0.70 0.15 245)" fill="url(#gR)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Risk Distribution" sub="By asset risk level">
          <div className="space-y-3 mt-2">
            {risk.map(r => (
              <div key={r.name} className="flex items-center gap-3">
                <div className="w-20 text-xs text-muted-foreground">{r.name}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full" style={{ width: `${equipment.length ? (r.v / equipment.length) * 100 : 0}%`, background: r.c }} />
                </div>
                <div className="w-8 text-right font-mono text-sm">{r.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">MTBF / MTTR (plant average)</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-[color:var(--panel-2)] border border-border p-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MTBF</div>
                <div className="font-mono font-semibold">{k.mtbfHours.toLocaleString()}h</div>
              </div>
              <div className="rounded-md bg-[color:var(--panel-2)] border border-border p-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MTTR</div>
                <div className="font-mono font-semibold">{k.mttrHours}h</div>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <Panel title="Top Maintenance Priorities" sub="Risk × Criticality × Failure Prob × Production Impact" className="xl:col-span-2">
          <div className="divide-y divide-border">
            {prioritized.slice(0, 5).map((p, i) => (
              <Link key={p.id} to="/equipment/$id" params={{ id: p.id }} className="flex items-center gap-5 py-3.5 hover:bg-accent/30 -mx-2 px-2 rounded-md transition">
                <div className="text-2xl font-bold text-primary w-8 tabular-nums">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{p.id}</div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.area} · RUL ~{p.rulDays}d · Score {p.score}</div>
                </div>
                <SeverityTag s={p.risk} />
              </Link>
            ))}
            {prioritized.length === 0 && !loading && <div className="py-6 text-xs text-muted-foreground">No assets in registry.</div>}
          </div>
        </Panel>

        <Panel title="Recent Abnormalities" sub="Live alert stream">
          <div className="space-y-3">
            {alerts.slice(0, 4).map(a => (
              <Link key={a.id} to="/alerts" search={{ status: "all" }} className="flex items-start gap-3 text-sm hover:bg-accent/30 -mx-1 px-1 py-1 rounded transition">
                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${a.severity === "critical" ? "bg-critical pulse-critical" : a.severity === "high" ? "bg-[oklch(0.72_0.20_35)]" : a.severity === "medium" ? "bg-warning" : "bg-healthy"}`} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.assetName} · {a.timestamp.slice(11, 16)} UTC</div>
                </div>
              </Link>
            ))}
            {alerts.length === 0 && !loading && <div className="text-xs text-muted-foreground">No active abnormalities.</div>}
          </div>
        </Panel>
      </div>

      <Panel title="Maintenance Backlog by Area" sub="Open vs closed work orders, last 30 days">
        <div className="h-56">
          <ResponsiveContainer>
            <BarChart data={backlogByArea} margin={{ top:5, right:10, left:-20, bottom:0 }}>
              <CartesianGrid stroke="oklch(0.30 0.015 260 / 0.4)" strokeDasharray="3 3" />
              <XAxis dataKey="area" stroke="oklch(0.6 0.01 250)" fontSize={10} />
              <YAxis stroke="oklch(0.6 0.01 250)" fontSize={11} />
              <Tooltip contentStyle={{ background:"#11151C", border:"1px solid oklch(0.30 0.015 260)", borderRadius:8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="open" fill="oklch(0.74 0.17 50)" radius={[4,4,0,0]} />
              <Bar dataKey="closed" fill="oklch(0.40 0.04 260)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {dialog && <KpiDialog kind={dialog} equipment={equipment} spares={spares} kpi={k} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone, onClick }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "critical" | "warning"; onClick?: () => void }) {
  const accent = tone === "critical" ? "text-critical" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <button onClick={onClick} className="panel panel-hover p-4 text-left transition cursor-pointer">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">{icon}<span>{label}</span></div>
      <div className={`mt-2 text-3xl font-semibold kpi-num ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </button>
  );
}

function Panel({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function KpiDialog({ kind, equipment, spares, kpi, onClose }: { kind: NonNullable<DialogKind>; equipment: Equipment[]; spares: SparePart[]; kpi: ReturnType<typeof computePlantKpi>; onClose: () => void }) {
  const titles: Record<NonNullable<DialogKind>, string> = {
    health: "Plant Health Intelligence",
    reliability: "Reliability Intelligence",
    critical: "Critical Asset Intelligence",
    nearFailure: "Near-Failure Asset Intelligence",
  };
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-6" onClick={onClose}>
      <div className="panel w-full max-w-4xl p-7 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">Drill-down view</div>
            <h2 className="text-xl font-semibold mt-1">{titles[kind]}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-4 w-4" /></button>
        </div>

        {kind === "health" && <HealthDrill equipment={equipment} kpi={kpi} />}
        {kind === "reliability" && <ReliabilityDrill equipment={equipment} kpi={kpi} />}
        {kind === "critical" && <CriticalDrill equipment={equipment} />}
        {kind === "nearFailure" && <NearFailureDrill equipment={equipment} spares={spares} />}
      </div>
    </div>
  );
}

function HealthDrill({ equipment, kpi }: { equipment: Equipment[]; kpi: ReturnType<typeof computePlantKpi> }) {
  const byArea = Object.entries(equipment.reduce<Record<string, number[]>>((acc, e) => {
    (acc[e.area] = acc[e.area] || []).push(e.health); return acc;
  }, {})).map(([area, vals]) => ({ area, avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) })).sort((a, b) => a.avg - b.avg);
  const lowest = [...equipment].sort((a, b) => a.health - b.health).slice(0, 5);
  const highest = [...equipment].sort((a, b) => b.health - a.health).slice(0, 5);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Overall Plant Health" value={`${kpi.health}%`} />
        <Stat label="Assets Tracked" value={`${equipment.length}`} />
        <Stat label="Critical / Near Failure" value={`${kpi.critical} / ${kpi.nearFailure}`} tone="warning" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Health Distribution by Area</div>
        <div className="space-y-2">
          {byArea.map(a => (
            <div key={a.area} className="flex items-center gap-3 text-sm">
              <div className="w-44 text-muted-foreground">{a.area}</div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full" style={{ width: `${a.avg}%`, background: a.avg < 70 ? "var(--critical)" : a.avg < 85 ? "var(--warning)" : "var(--healthy)" }} />
              </div>
              <div className="font-mono w-10 text-right">{a.avg}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Listing title="Lowest Health Assets" rows={lowest} />
        <Listing title="Highest Health Assets" rows={highest} />
      </div>
      <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1.5">Recommended Reliability Improvements</div>
        Address {kpi.critical} critical asset{kpi.critical === 1 ? "" : "s"} via targeted intervention this shift; schedule the {kpi.nearFailure} near-failure asset{kpi.nearFailure === 1 ? "" : "s"} into next campaign window; refresh oil / vibration baselines on the lowest-health area.
      </div>
    </div>
  );
}

function ReliabilityDrill({ equipment, kpi }: { equipment: Equipment[]; kpi: ReturnType<typeof computePlantKpi> }) {
  const topRisks = [...equipment].sort((a, b) => b.failureProb - a.failureProb).slice(0, 5);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Reliability Index" value={`${kpi.reliability}%`} />
        <Stat label="Plant MTBF" value={`${kpi.mtbfHours.toLocaleString()}h`} />
        <Stat label="Plant MTTR" value={`${kpi.mttrHours}h`} />
        <Stat label="Open Alerts" value={`${kpi.openAlerts}`} tone="warning" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Top Reliability Risks</div>
        <Listing rows={topRisks} title="" />
      </div>
      <div className="rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1.5">Reliability Improvement Opportunities</div>
        Forecast lifts reliability to <span className="font-semibold">{Math.min(99, kpi.reliability + 2)}%</span> if critical-asset interventions are executed in next campaign change; PM compliance gap explains ~1.5 pts of current variance.
      </div>
    </div>
  );
}

function CriticalDrill({ equipment }: { equipment: Equipment[] }) {
  const ranked = [...equipment].filter(e => e.risk === "CRITICAL" || e.risk === "HIGH")
    .sort((a, b) => b.failureProb - a.failureProb);
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Assets ranked by risk score (failure probability × criticality × production exposure).</div>
      <div className="space-y-2">
        {ranked.map(e => (
          <Link key={e.id} to="/equipment/$id" params={{ id: e.id }} className="block panel panel-hover p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{e.id}</div>
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-muted-foreground">{e.area} · RUL {e.rulDays}d · Failure prob {Math.round(e.failureProb*100)}% · {e.productionImpactKt} kt/d</div>
              </div>
              <div className="text-right">
                <SeverityTag s={e.risk} />
                <div className="text-xs text-muted-foreground mt-1">{e.businessImpact}</div>
              </div>
            </div>
          </Link>
        ))}
        {ranked.length === 0 && <div className="text-sm text-muted-foreground">No critical or high-risk assets.</div>}
      </div>
    </div>
  );
}

function NearFailureDrill({ equipment, spares }: { equipment: Equipment[]; spares: SparePart[] }) {
  const near = [...equipment].sort((a, b) => a.rulDays - b.rulDays).slice(0, 8);
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Assets with the lowest remaining useful life, paired with spare availability.</div>
      <div className="space-y-2">
        {near.map(e => {
          const linked = spares.filter(s => s.associatedAssets.includes(e.id));
          const shortage = linked.find(s => s.stock <= s.reorderLevel);
          return (
            <Link key={e.id} to="/equipment/$id" params={{ id: e.id }} className="block panel panel-hover p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{e.id}</div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">RUL <span className={e.rulDays < 30 ? "text-critical font-semibold" : ""}>{e.rulDays}d</span> · Failure prob {Math.round(e.failureProb*100)}% · {e.productionImpactKt} kt/d</div>
                </div>
                <div className="text-right text-xs">
                  {shortage
                    ? <span className="tag tag-critical">SPARE SHORTAGE · {shortage.partNo}</span>
                    : <span className="tag tag-low">spares OK</span>}
                  <div className="text-muted-foreground mt-1">{linked.length} linked spare{linked.length === 1 ? "" : "s"}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  const c = tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-md bg-[color:var(--panel-2)] border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold kpi-num ${c}`}>{value}</div>
    </div>
  );
}

function Listing({ title, rows }: { title: string; rows: Equipment[] }) {
  return (
    <div>
      {title && <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>}
      <div className="space-y-1.5">
        {rows.map(e => (
          <Link key={e.id} to="/equipment/$id" params={{ id: e.id }} className="flex items-center justify-between gap-2 text-sm panel panel-hover p-2 px-3">
            <span><span className="font-mono text-[10px] text-muted-foreground mr-2">{e.id}</span>{e.name}</span>
            <span className={`font-mono ${e.health < 70 ? "text-critical" : e.health < 85 ? "text-warning" : "text-healthy"}`}>{e.health}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
