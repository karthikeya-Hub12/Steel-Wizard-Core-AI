import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, SeverityTag } from "../components/AppShell";
import { useAlerts } from "../hooks/usePlantData";
import { Activity, Cpu, User, X } from "lucide-react";
import type { Alert } from "@/types/plant";

type AlertStatus = "all" | "open" | "acknowledged" | "resolved";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts · Tata Maintenance Wizard" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    status: (["all","open","acknowledged","resolved"].includes(s.status as string) ? s.status : "all") as AlertStatus,
  }),
  component: Alerts,
});

function Alerts() {
  const { status } = Route.useSearch();
  const navigate = useNavigate({ from: "/alerts" });
  const { data, isLoading, isError } = useAlerts();
  const [open, setOpen] = useState<Alert | null>(null);

  const alerts = data ?? [];
  const counts = {
    all: alerts.length,
    open: alerts.filter(a => a.status === "open").length,
    acknowledged: alerts.filter(a => a.status === "acknowledged").length,
    resolved: alerts.filter(a => a.status === "resolved").length,
  };
  const list = alerts.filter(a => status === "all" || a.status === status);

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Abnormality Stream" title="Alerts"
        subtitle={isLoading ? "Connecting to Plant Link • Live… loading telemetry streams."
          : isError ? "Telemetry connection lost. Displaying cached operational data."
          : "Real-time abnormality detection across the plant. Each event carries detection method, root cause, evidence, corrective and preventive actions."}
        actions={
          <div className="flex items-center gap-1 panel p-1 text-xs">
            {(["all","open","acknowledged","resolved"] as const).map(f => (
              <button key={f} onClick={() => navigate({ search: { status: f } })}
                className={`px-3 py-1.5 rounded ${status === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {f} <span className="ml-1 opacity-70 font-mono">{counts[f]}</span>
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-3">
        {list.map(a => (
          <button key={a.id} onClick={() => setOpen(a)}
            className={`w-full text-left panel panel-hover p-5 ${a.severity === "critical" ? "border-l-4 border-l-critical" : a.severity === "high" ? "border-l-4 border-l-[oklch(0.72_0.20_35)]" : a.severity === "medium" ? "border-l-4 border-l-warning" : "border-l-4 border-l-healthy"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className="text-[10px] font-mono text-muted-foreground">{a.id.slice(0, 8)}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mb-3 flex-wrap">
                  <span className="font-medium text-foreground">{a.assetName}</span>
                  <span>·</span>
                  <span className="font-mono">{a.timestamp.replace("T"," ").slice(0,16)} UTC</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    {a.detectionMethod?.includes("Vibration") || a.detectionMethod?.includes("DGA") ? <Activity className="h-3 w-3" /> : a.detectionMethod?.includes("SCADA") ? <Cpu className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {a.detectionMethod ?? "sensor"}
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{a.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <KV label="Root Cause" value={a.rootCause} />
                  <KV label="Impact" value={a.impact} />
                  <KV label="Recommendation" value={a.recommendation} accent />
                </div>
                <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
                  <span>Risk score <span className="font-mono text-foreground">{a.riskScore}</span></span>
                  {a.team && <span>· Assigned <span className="text-foreground">{a.team}</span></span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <SeverityTag s={a.severity} />
                <span className={`tag ${a.status === "open" ? "tag-high" : a.status === "acknowledged" ? "tag-info" : "tag-low"}`}>{a.status}</span>
              </div>
            </div>
          </button>
        ))}
        {list.length === 0 && !isLoading && (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            {isError ? "Telemetry connection lost." : "No alerts matching the current filter."}
          </div>
        )}
      </div>

      {open && <AlertDialog alert={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AlertDialog({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-6" onClick={onClose}>
      <div className="panel w-full max-w-3xl p-7 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SeverityTag s={alert.severity} />
              <span className={`tag ${alert.status === "open" ? "tag-high" : alert.status === "acknowledged" ? "tag-info" : "tag-low"}`}>{alert.status}</span>
              <span className="text-[10px] font-mono text-muted-foreground">{alert.id.slice(0,8)}</span>
            </div>
            <h2 className="text-xl font-semibold">{alert.title}</h2>
            <div className="text-xs text-muted-foreground mt-1">
              <Link to="/equipment/$id" params={{ id: alert.assetId }} className="text-primary hover:underline">{alert.assetId}</Link> · {alert.assetName} · {alert.timestamp.replace("T"," ").slice(0,16)} UTC
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Block label="Observed Symptom" value={alert.description} />
          <Block label="Detection Method" value={alert.detectionMethod} />
          <Block label="Root Cause" value={alert.rootCause} />
          <Block label="Failure Mode" value={alert.failureMode} />
          <Block label="Evidence" value={alert.evidence} full />
          <Block label="Risk Assessment" value={`Risk score ${alert.riskScore}/100`} />
          <Block label="Business / Production Impact" value={alert.impact} />
          <Block label="Recommended Action" value={alert.recommendation} accent />
          <Block label="Corrective Actions" value={alert.correctiveActions} full />
          <Block label="Preventive Actions" value={alert.preventiveActions} full />
          <Block label="Assigned Team" value={alert.team} />
          {alert.resolvedAt && <Block label="Resolved" value={new Date(alert.resolvedAt).toUTCString().slice(0,22)} />}
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">Knowledge sources consulted: relevant SOPs and failure reports for this asset family.</div>
          <Link to="/wizard" search={{ q: `Diagnose ${alert.assetId} — ${alert.title}` } as never} className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-medium">Ask the Wizard</Link>
        </div>
      </div>
    </div>
  );
}

function Block({ label, value, accent, full }: { label: string; value?: string | null; accent?: boolean; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={`${full ? "md:col-span-2" : ""} rounded-md p-3 ${accent ? "bg-primary/5 border border-primary/20" : "bg-[color:var(--panel-2)] border border-border"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-sm leading-snug whitespace-pre-line">{value}</div>
    </div>
  );
}

function KV({ label, value, accent }: { label: string; value?: string | null; accent?: boolean }) {
  if (!value) return null;
  return (
    <div className={`rounded-md p-3 ${accent ? "bg-primary/5 border border-primary/20" : "bg-[color:var(--panel-2)] border border-border"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-sm leading-snug">{value}</div>
    </div>
  );
}
