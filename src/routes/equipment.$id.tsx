import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft, FlaskConical, Microscope, Sparkles, Stethoscope } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, SeverityTag } from "../components/AppShell";
import { useEquipment, useMaintenanceLogs, useSpares } from "../hooks/usePlantData";
import type { Equipment } from "@/types/plant";

export const Route = createFileRoute("/equipment/$id")({
  head: ({ params }) => ({ meta: [{ title: `${params.id} · Equipment Intelligence` }] }),
  component: AssetPage,
});

function AssetPage() {
  const { id } = Route.useParams();
  const eq = useEquipment();
  const lg = useMaintenanceLogs();
  const sp = useSpares();

  if (eq.isLoading) return <div className="p-8 text-sm text-muted-foreground">Connecting to Plant Link • Live… loading asset telemetry.</div>;
  if (eq.isError) return <div className="p-8 text-sm text-warning">Telemetry connection lost. Displaying cached operational data.</div>;

  const e = (eq.data ?? []).find(x => x.id === id);
  if (!e) throw notFound();

  const assetLogs = (lg.data ?? []).filter(l => l.assetId === id);
  const assetSpares = (sp.data ?? []).filter(s => s.associatedAssets.includes(id));

  const forecast = Array.from({ length: 30 }, (_, i) => {
    const decay = Math.max(0, e.health - (i * (e.health - 20) / Math.max(e.rulDays, 5)));
    return { d: `+${i}d`, health: Math.round(decay), threshold: 30 };
  });

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <Link to="/equipment" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"><ChevronLeft className="h-3 w-3" />Asset registry</Link>
      <PageHeader eyebrow={`${e.id} · ${e.area} · ${e.manufacturer}`} title={e.name}
        subtitle={`Installed ${e.installedYear}. Criticality class ${e.criticality}. Last maintenance ${e.lastMaintenance}. Next planned ${e.nextPM}.`}
        actions={<Link to="/wizard" search={{ q: `Diagnose ${e.id} and recommend next actions.` } as never} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium glow-primary"><Sparkles className="h-4 w-4" />Diagnose with Wizard</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <MetricTile label="Health Score" value={`${e.health}`} suffix="/100" tone={e.health < 50 ? "critical" : e.health < 75 ? "warning" : "healthy"} />
        <MetricTile label="Failure Probability" value={`${Math.round(e.failureProb * 100)}`} suffix="%" tone={e.failureProb > 0.5 ? "critical" : e.failureProb > 0.25 ? "warning" : "healthy"} />
        <MetricTile label="Remaining Useful Life" value={`${e.rulDays}`} suffix="d" tone={e.rulDays < 14 ? "critical" : e.rulDays < 45 ? "warning" : "healthy"} />
        <MetricTile label="Risk Score" value={String(Math.round(e.failureProb * 100 * (e.criticality === "A" ? 1 : 0.7)))} suffix="/100" tone="warning" />
        <MetricTile label="Production at Risk" value={`${e.productionImpactKt}`} suffix="kt/d" />
        <MetricTile label="Business Impact" value={e.businessImpact} tone="critical" small />
      </div>

      <div className="panel p-5 mb-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Microscope className="h-4 w-4 text-primary" />Condition Monitoring</h3>
            <p className="text-xs text-muted-foreground">Live sensor stream with ISO baselines, warning and alarm thresholds.</p>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">Sampling 1 Hz · 24 sample window</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {e.sensors.map(s => {
            const status = s.value >= s.alarm ? "critical" : s.value >= s.warn ? "warning" : "healthy";
            const color = status === "critical" ? "oklch(0.66 0.22 25)" : status === "warning" ? "oklch(0.78 0.16 75)" : "oklch(0.72 0.17 145)";
            return (
              <div key={s.key} className="rounded-md border border-border bg-[color:var(--panel-2)] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    <div className="text-xl font-semibold font-mono mt-0.5" style={{ color }}>{s.value}<span className="text-xs text-muted-foreground ml-1">{s.unit}</span></div>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground font-mono">
                    <div>base {s.baseline}</div>
                    <div>warn {s.warn}</div>
                    <div className="text-critical">alarm {s.alarm}</div>
                  </div>
                </div>
                <div className="h-14 -mx-1 mt-1">
                  <ResponsiveContainer>
                    <AreaChart data={s.trend.map((v, i) => ({ i, v }))}>
                      <defs>
                        <linearGradient id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area dataKey="v" stroke={color} fill={`url(#g-${s.key})`} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 mb-6">
        <div className="panel p-5 xl:col-span-3">
          <h3 className="font-semibold mb-1">Failure Forecast & RUL Curve</h3>
          <p className="text-xs text-muted-foreground mb-3">Projected degradation vs intervention threshold. Confidence 0.84.</p>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={forecast}>
                <CartesianGrid stroke="oklch(0.30 0.015 260 / 0.4)" strokeDasharray="3 3" />
                <XAxis dataKey="d" stroke="oklch(0.6 0.01 250)" fontSize={11} />
                <YAxis stroke="oklch(0.6 0.01 250)" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#11151C", border: "1px solid oklch(0.30 0.015 260)", borderRadius: 8 }} />
                <ReferenceLine y={30} stroke="oklch(0.66 0.22 25)" strokeDasharray="4 4" label={{ value: "Intervention threshold", fill: "oklch(0.82 0.18 25)", fontSize: 10, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="health" stroke="oklch(0.74 0.17 50)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5 xl:col-span-2">
          <h3 className="font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />Root Cause Analysis</h3>
          <div className="mt-3 space-y-3 text-sm">
            <RCABlock label="Observed Symptoms" value={e.sensors.filter(s => s.value > s.warn).map(s => `${s.label} ${s.value}${s.unit} vs warn ${s.warn}`).join(" · ") || "No active sensor exceedance."} />
            <RCABlock label="Likely Root Cause" value={rcaFor(e)} />
            <RCABlock label="Supporting Evidence" value="Sensor trend regression + maintenance history + sister-asset post-mortems." />
            <RCABlock label="Alternative Causes" value="Lubrication degradation · Misalignment · Resonance from upstream equipment" />
            <RCABlock label="Verification Steps" value="1. Spectrum analysis on primary axis  2. Lab sample of fluid/oil  3. Borescope at next stop." />
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className="font-mono font-semibold text-primary">{(0.6 + (e.failureProb * 0.3)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="panel p-5 xl:col-span-2">
          <h3 className="font-semibold mb-3">Maintenance History</h3>
          <div className="space-y-2 text-sm">
            {assetLogs.length === 0 && <div className="text-muted-foreground text-xs">No recent records.</div>}
            {assetLogs.map(l => (
              <div key={l.id} className="flex gap-4 py-2 border-b border-border/60 last:border-0">
                <div className="text-xs font-mono text-muted-foreground w-24 shrink-0">{l.date}</div>
                <div className="flex-1">
                  <div className="font-medium">{l.issue}</div>
                  <div className="text-xs text-muted-foreground">{l.action} — {l.engineer}</div>
                </div>
                <div className="text-right text-xs">
                  <div className={l.outcome === "successful" ? "text-healthy" : l.outcome === "partial" ? "text-warning" : "text-critical"}>{l.outcome}</div>
                  <div className="text-muted-foreground font-mono">{l.downtimeHrs}h DT</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="font-semibold flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" />Associated Spares</h3>
          <div className="space-y-3 mt-3">
            {assetSpares.length === 0 && <div className="text-muted-foreground text-xs">No part dependencies registered.</div>}
            {assetSpares.map(s => {
              const short = s.stock <= s.reorderLevel;
              return (
                <div key={s.partNo} className="text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs text-muted-foreground">{s.partNo}</div>
                    {short && <span className="tag tag-critical text-[9px]">REORDER</span>}
                  </div>
                  <div className="text-sm">{s.description}</div>
                  <div className="text-xs text-muted-foreground flex gap-3 mt-1 font-mono">
                    <span>Stock {s.stock}</span><span>Reorder {s.reorderLevel}</span><span>Lead {s.leadTimeDays}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function rcaFor(e: Equipment): string {
  switch (e.id) {
    case "HSM-F4": return "Outer-race spalling on drive-side work-roll bearing BRG-7322 (BPFO sideband 184 Hz).";
    case "BF-03": return "Localized scaffold above tuyere 14 restricting bosh gas flow, biasing heat into copper.";
    case "EAF-T1": return "Low-energy partial discharge in transformer windings (DGA acetylene trend).";
    case "CWP-01": return "Suction-side cavitation from strainer fouling, NPSH margin shrinking.";
    case "SP-CL1": return "Rotor imbalance from clinker dust build-up on cooler fan blades.";
    case "CC-02": return "SEN refractory wear approaching campaign limit.";
    case "CGL-01": return "Burner controller PID drift; coating weight within tolerance.";
    default: return "Component wear progressing within expected degradation curve.";
  }
}

function MetricTile({ label, value, suffix, tone, small }: { label: string; value: string; suffix?: string; tone?: "critical" | "warning" | "healthy"; small?: boolean }) {
  const color = tone === "critical" ? "text-critical" : tone === "warning" ? "text-warning" : tone === "healthy" ? "text-healthy" : "text-foreground";
  return (
    <div className="panel p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`${small ? "text-base mt-2" : "text-2xl mt-1.5"} font-semibold kpi-num ${color}`}>{value}{suffix && <span className="text-xs text-muted-foreground ml-1">{suffix}</span>}</div>
    </div>
  );
}

function RCABlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}
