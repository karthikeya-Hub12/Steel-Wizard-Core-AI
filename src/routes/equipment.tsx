import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader, SeverityTag } from "../components/AppShell";
import { useEquipment } from "../hooks/usePlantData";

export const Route = createFileRoute("/equipment")({
  head: () => ({ meta: [{ title: "Equipment · Tata Maintenance Wizard" }] }),
  component: EquipmentLayout,
});

function EquipmentLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const { data, isLoading, isError } = useEquipment();
  if (pathname !== "/equipment") return <Outlet />;
  const equipment = data ?? [];
  const areas = new Set(equipment.map(e => e.area));
  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Asset Registry" title="Equipment"
        subtitle={isLoading ? "Connecting to Plant Link • Live… loading telemetry streams."
          : isError ? "Telemetry connection lost. Displaying cached operational data."
          : `${equipment.length} assets monitored across ${areas.size} areas. Health, risk, RUL and production impact are recomputed every shift.`} />

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr className="text-left">
              <th className="px-5 py-3 w-16">Health</th>
              <th className="px-2 py-3">Asset</th>
              <th className="px-3 py-3">Area</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Risk</th>
              <th className="px-3 py-3 text-right">RUL</th>
              <th className="px-3 py-3 text-right">Failure Prob</th>
              <th className="px-3 py-3">Last PM</th>
              <th className="px-3 py-3 text-right">Impact</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map(e => (
              <tr key={e.id} className="border-b border-border/60 hover:bg-accent/30 transition">
                <td className="px-5 py-4"><HealthRing v={e.health} /></td>
                <td className="px-2 py-4">
                  <Link to="/equipment/$id" params={{ id: e.id }} className="block">
                    <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{e.id}</div>
                    <div className="font-semibold hover:text-primary">{e.name}</div>
                  </Link>
                </td>
                <td className="px-3 py-4 text-muted-foreground">{e.area}</td>
                <td className="px-3 py-4"><StatusTag s={e.status} /></td>
                <td className="px-3 py-4"><SeverityTag s={e.risk} /></td>
                <td className="px-3 py-4 text-right font-mono">~{e.rulDays}d</td>
                <td className="px-3 py-4 text-right font-mono">{Math.round(e.failureProb * 100)}%</td>
                <td className="px-3 py-4 text-muted-foreground font-mono text-xs">{e.lastMaintenance}</td>
                <td className="px-3 py-4 text-right text-muted-foreground text-xs">{e.businessImpact}</td>
              </tr>
            ))}
            {equipment.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-8 text-center text-xs text-muted-foreground">
                {isLoading ? "Loading telemetry…" : isError ? "Telemetry connection lost." : "No assets in registry."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthRing({ v }: { v: number }) {
  const color = v < 50 ? "var(--critical)" : v < 75 ? "var(--warning)" : "var(--healthy)";
  return (
    <div className="relative h-12 w-12">
      <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
        <circle cx="18" cy="18" r="15" stroke="oklch(0.30 0.015 260)" strokeWidth="2.5" fill="none" />
        <circle cx="18" cy="18" r="15" stroke={color} strokeWidth="2.5" fill="none"
          strokeDasharray={`${(v / 100) * 94.25} 94.25`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold font-mono">{v}</div>
    </div>
  );
}

function StatusTag({ s }: { s: "operational" | "warning" | "fault" | "offline" }) {
  const cls = s === "operational" ? "tag-low" : s === "warning" ? "tag-medium" : s === "fault" ? "tag-critical" : "tag-neutral";
  return <span className={`tag ${cls}`}><span className="tag-dot bg-current" />{s}</span>;
}
