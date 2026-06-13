import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, AlertTriangle, FileText, Gauge, Library, Package, Sparkles, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { useAlerts, useEquipment, useMaintenanceLogs, useSpares, computePlantKpi } from "@/hooks/usePlantData";
import { useRealtimeStatus } from "@/hooks/useAlertsRealtime";

const nav: Array<{ to: string; label: string; icon: typeof Gauge; exact?: boolean }> = [
  { to: "/", label: "Overview", icon: Gauge, exact: true },
  { to: "/equipment", label: "Equipment", icon: Wrench },
  { to: "/alerts", label: "Alerts", icon: AlertTriangle },
  { to: "/wizard", label: "Maintenance Wizard", icon: Sparkles },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/knowledge", label: "Knowledge Base", icon: Library },
  { to: "/spares", label: "Spare Intelligence", icon: Package },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-border bg-[color:var(--panel)]/60 backdrop-blur-md flex flex-col no-print">
        <div className="p-5 flex items-center gap-3 border-b border-border">
          <div className="h-10 w-10 rounded-md bg-gradient-to-br from-primary to-[oklch(0.62_0.20_30)] flex items-center justify-center glow-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold tracking-wide text-sm">TATA WIZARD</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Maintenance Intelligence</div>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {nav.map(item => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground border border-transparent"
                }`}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto px-3 pb-3 scroll-thin">
          <SidebarSummary />
        </div>

        <div className="p-4 border-t border-border text-xs space-y-1.5">
          <PlantLink />
          <div className="font-mono text-[10px] text-muted-foreground/70">v3.0 • Shift B</div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function PlantLink() {
  const rt = useRealtimeStatus();
  return (
    <>
      <div className="flex items-center gap-2" suppressHydrationWarning>
        <span className="relative flex h-2 w-2">
          {rt.live && <span className="absolute inline-flex h-full w-full rounded-full bg-healthy opacity-75 animate-ping" />}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${rt.live ? "bg-healthy" : "bg-warning"}`} />
        </span>
        <span className="text-foreground font-medium">Plant Link • {rt.live ? "Live" : "Reconnecting"}</span>
      </div>
      <div className="text-muted-foreground" suppressHydrationWarning>{rt.label}</div>
    </>
  );
}

function SidebarSummary() {
  const eq = useEquipment();
  const al = useAlerts();
  const sp = useSpares();
  const lg = useMaintenanceLogs();
  const k = computePlantKpi(eq.data ?? [], al.data ?? [], sp.data ?? []);
  const recentAlerts = (al.data ?? []).slice(0, 3);
  const recentLogs = (lg.data ?? []).slice(0, 3);
  return (
    <div className="mt-2 space-y-4">
      <Section title="Quick Plant Summary">
        <Row k="Plant Health" v={`${k.health}%`} tone={k.health < 75 ? "critical" : k.health < 90 ? "warning" : "healthy"} />
        <Row k="Reliability" v={`${k.reliability}%`} tone={k.reliability < 90 ? "warning" : "healthy"} />
        <Row k="Critical Assets" v={String(k.critical)} tone={k.critical > 0 ? "critical" : "healthy"} />
        <Row k="Open Alerts" v={String(k.openAlerts)} tone={k.openAlerts > 0 ? "warning" : "healthy"} />
      </Section>

      <Section title="Recent Alerts">
        {recentAlerts.length === 0 && <div className="text-[11px] text-muted-foreground">No alerts.</div>}
        {recentAlerts.map(a => (
          <Link key={a.id} to="/alerts" search={{ status: "all" }} className="block hover:bg-accent/30 rounded px-2 py-1.5 -mx-1">
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${a.severity === "critical" ? "bg-critical" : a.severity === "high" ? "bg-[oklch(0.72_0.20_35)]" : a.severity === "medium" ? "bg-warning" : "bg-healthy"}`} />
              <span className="text-[11px] font-mono text-muted-foreground">{a.assetId}</span>
            </div>
            <div className="text-[11px] truncate">{a.title}</div>
          </Link>
        ))}
      </Section>

      <Section title="Recent Maintenance">
        {recentLogs.length === 0 && <div className="text-[11px] text-muted-foreground">No logs.</div>}
        {recentLogs.map(l => (
          <div key={l.id} className="text-[11px] py-1.5 border-b border-border/40 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-muted-foreground">{l.assetId}</span>
              <span className={`${l.outcome === "successful" ? "text-healthy" : l.outcome === "partial" ? "text-warning" : "text-critical"} font-medium`}>{l.outcome}</span>
            </div>
            <div className="truncate">{l.issue}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 px-1 mb-1.5">{title}</div>
      <div className="rounded-md bg-[color:var(--panel-2)]/50 border border-border/60 p-2.5 space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone: "critical" | "warning" | "healthy" }) {
  const c = tone === "critical" ? "text-critical" : tone === "warning" ? "text-warning" : "text-healthy";
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={`font-mono font-semibold ${c}`}>{v}</span>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div>
        <div className="text-[11px] tracking-[0.22em] uppercase text-primary font-semibold mb-2 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" /> {eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function SeverityTag({ s }: { s: "critical" | "high" | "medium" | "low" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }) {
  const key = String(s).toLowerCase() as "critical" | "high" | "medium" | "low";
  const cls = key === "critical" ? "tag-critical" : key === "high" ? "tag-high" : key === "medium" ? "tag-medium" : "tag-low";
  return <span className={`tag ${cls}`}><span className="tag-dot bg-current" />{String(s).toUpperCase()}</span>;
}
