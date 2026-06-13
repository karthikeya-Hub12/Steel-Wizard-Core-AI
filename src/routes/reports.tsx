import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import { PageHeader, SeverityTag } from "../components/AppShell";
import { useAlerts, useEquipment, useMaintenanceLogs, useSpares, computePlantKpi, prioritizeEquipment } from "../hooks/usePlantData";
import type { Alert, Equipment, MaintenanceLog, SparePart } from "@/types/plant";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports · Tata Maintenance Wizard" }] }),
  component: Reports,
});

const TYPES = [
  { id: "asset",   label: "Critical Asset Report",     audience: "Reliability Manager" },
  { id: "shift",   label: "Shift Handover Report",     audience: "Incoming Shift Engineers" },
  { id: "daily",   label: "Daily Reliability Report",  audience: "Operations Team" },
  { id: "weekly",  label: "Weekly Maintenance Report", audience: "Maintenance Planning" },
  { id: "shutdown",label: "Shutdown Planning",         audience: "Outage Coordinator" },
  { id: "spares",  label: "Spare Procurement",         audience: "Procurement" },
  { id: "exec",    label: "Executive Summary",         audience: "Plant Manager" },
] as const;
type ReportType = (typeof TYPES)[number]["id"];

// ---------- Asset-family narrative library (used by Critical Asset Report) ----------
type Family = "HSM" | "BF" | "EAF" | "CWP" | "SP" | "CC" | "CGL" | "DEFAULT";
function familyOf(id: string): Family {
  if (id.startsWith("HSM")) return "HSM";
  if (id.startsWith("BF")) return "BF";
  if (id.startsWith("EAF")) return "EAF";
  if (id.startsWith("CWP")) return "CWP";
  if (id.startsWith("SP")) return "SP";
  if (id.startsWith("CC")) return "CC";
  if (id.startsWith("CGL")) return "CGL";
  return "DEFAULT";
}

type FamilyNarrative = {
  failureMode: string;
  condition: (e: Equipment) => string[];
  rca: string[];
  rul: (e: Equipment) => string;
  actions: string[];
  notes: string;
  knowledge: string[];
};

const FAMILY: Record<Family, FamilyNarrative> = {
  HSM: {
    failureMode: "Drive-side work-roll bearing outer-race spalling (BPFO sideband 184 Hz envelope).",
    condition: e => [
      `Drive-side vibration trending above ISO 10816-3 alarm (current health ${e.health}/100).`,
      "Bearing temperature 22 °C above baseline, oil ISO cleanliness drifting to code 19.",
      "Roll force and AGC loop currently within tolerance; gauge band stable.",
    ],
    rca: [
      "Primary: outer-race spalling on drive-side work-roll bearing BRG-7322.",
      "Evidence: BPFO sideband at 184 Hz envelope, rising temp, oil ISO 19 with ferrous content.",
      "Alternative 1: lubrication starvation — ruled out by last grease verification.",
      "Alternative 2: residual misalignment from coupling re-key — balance check post-swap.",
    ],
    rul: e => `Remaining Useful Life ${e.rulDays} ± 2 days (confidence 0.82). Basis: vibration growth-rate matches FR-2024-118 signature curve.`,
    actions: [
      "Immediate (next shift): borescope bearing race, capture envelope spectra, raise grease frequency to 8h.",
      "24h: stage replacement crew and BRG-7322 spare at gate B.",
      "Planned (T+5d): execute SOP-RM-014 bearing swap during slab campaign change-over (6.5h window).",
      "Post-swap: laser alignment + rotor balance, oil flush to ISO 16/14/11.",
    ],
    notes: "Coordinate with R. Banerjee. Confirm spare BRG-7322 delivery ETA with SKF India before campaign change.",
    knowledge: [
      "SMS HSM Bearing Service Manual",
      "SOP-RM-014 Bearing Swap During Campaign",
      "Failure Report FR-2024-118 (F3 Outer Race Spalling)",
      "Historical Vibration Analysis Records",
    ],
  },
  BF: {
    failureMode: "Partial scaffold above tuyere 14 restricting bosh gas flow.",
    condition: e => [
      "Tuyere 14 ΔT exceeding 8 °C while neighbouring tuyeres at baseline.",
      `Stove efficiency drifted -1.4 pts; furnace health ${e.health}/100.`,
      "Top pressure and cold blast temperature within control band.",
    ],
    rca: [
      "Primary: localized scaffold build-up above tuyere 14, biasing heat into copper.",
      "Evidence: single-tuyere ΔT divergence, stove efficiency drop, ηCO -1.4 pts.",
      "Alternative 1: cooling water flow restriction on tuyere 14 — verify via flowmeter trend.",
      "Alternative 2: burden permeability anomaly from ore segregation.",
    ],
    rul: e => `Tuyere copper effective life ${Math.max(5, e.rulDays)} days if scaffold cleared this shift; <5 days if scaffold persists. Confidence 0.74.`,
    actions: [
      "Immediate: inspect peephole 14, log copper coloration, verify cooling flow.",
      "24h: increase tuyere 14 cooling flow by 8%, raise Ti pellet addition (SOP-BF-022).",
      "48h: if ΔT stays >8 °C, initiate scaffold breakout; pre-stage spare tuyere TUY-BF03.",
      "Trend tuyere CCTV thermography every 4h.",
    ],
    notes: "Hand over peephole 14 inspection result. Coordinate with stove operator on PCI ramp curve.",
    knowledge: [
      "Paul Wurth Tuyere Management Handbook (OEM)",
      "SOP-BF-022 Scaffold Response Protocol",
      "Tuyere Burn-through Failure Investigation Report",
      "Historical Tuyere ΔT Records",
    ],
  },
  EAF: {
    failureMode: "Low-energy partial discharge in transformer windings (Duval D1 drift).",
    condition: e => [
      "C₂H₂ rising into IEEE C57.104 Condition 3; H₂ trend +12 ppm vs 30-day baseline.",
      `Top-oil temperature nominal; load factor 0.82. Health ${e.health}/100.`,
      "Insulation resistance and tan-δ within spec at last outage.",
    ],
    rca: [
      "Primary: localized partial discharge in winding, likely insulation void.",
      "Evidence: C₂H₂ rise without proportional CO/CO₂ — rules out cellulose fault.",
      "Alternative 1: bushing tap connection arcing — verify by tan-δ.",
      "Alternative 2: tap-changer carry-over — review last DETC operation.",
      "Precedent: sister-transformer T2 incident IR-2023-041.",
    ],
    rul: e => `RUL ${e.rulDays} days at current trend (confidence 0.61). Reassessable after follow-up DGA.`,
    actions: [
      "Immediate: schedule follow-up DGA + furan at next planned outage (T+12d).",
      "24h: continue load profile, no derating required.",
      "If C₂H₂ > 5 ppm at next sample: escalate to internal inspection plan.",
      "Stage DGA-OIL mineral oil and N₂ purge equipment.",
    ],
    notes: "Coordinate sampling with M. Pillai at next planned EAF outage.",
    knowledge: [
      "IEEE C57.104 DGA Analysis Guidelines",
      "Incident Report IR-2023-041 (T2 Winding Arc)",
      "Transformer Maintenance SOP",
      "OEM Transformer Manual (Siemens)",
    ],
  },
  CWP: {
    failureMode: "Suction-side cavitation from impeller wear and reduced NPSH margin.",
    condition: e => [
      "Discharge pressure 4.1 bar vs setpoint 4.8 bar (-15%).",
      "Bearing vibration 6.4 mm/s (warn 6.0); trending upward.",
      `Health ${e.health}/100; flow degradation consistent with cavitation history.`,
    ],
    rca: [
      "Primary: impeller wear and incipient cavitation reducing NPSH margin.",
      "Evidence: pressure drop on discharge, bearing vibration rise mirroring LOG history.",
      "Alternative 1: suction strainer fouling — verify via differential pressure.",
      "Alternative 2: air ingress on suction header gasket.",
    ],
    rul: e => `Pump set RUL ${e.rulDays} days at current trend (confidence 0.71); restore margin with impeller replacement.`,
    actions: [
      "Immediate: verify NPSH margin, run online strainer back-flush.",
      "24h: re-baseline cavitation index; confirm flow restoration.",
      "7d: schedule impeller borescope; order IMP-CWP1 spare.",
      "Coordinate with BF-03 ops to keep tuyere cooling redundancy in service.",
    ],
    notes: "Coordinate strainer back-flush with Utilities. Reference last cleaning record.",
    knowledge: [
      "Pump Cavitation Failure Analysis Report",
      "SOP-UT-009 Cooling Pump Strainer Cleaning",
      "OEM Pump Maintenance Manual (KSB)",
      "Cooling Water System Maintenance Procedure",
    ],
  },
  SP: {
    failureMode: "Rotor imbalance from clinker dust build-up on cooler fan blades.",
    condition: e => [
      "Fan vibration trending toward alert (5.2 mm/s vs 6.0 warn).",
      "Sinter exit temp +12 °C vs baseline; grate load within normal band.",
      `Bearing temps and lubrication nominal. Health ${e.health}/100.`,
    ],
    rca: [
      "Primary: rotor imbalance from clinker build-up on cooler fan blades.",
      "Evidence: vibration without bearing temp rise; exit temp rising in parallel.",
      "Alternative 1: minor blade erosion — defer to next planned stop.",
      "Precedent: FR-2025-072 resolved equivalent case via 3.5h in-situ clean.",
    ],
    rul: e => `Fan assembly RUL ${e.rulDays}+ days if cleaned in next stoppage (confidence 0.70).`,
    actions: [
      "Immediate: continue monitoring; no derating.",
      "Next short stop (<7d): in-situ blade clean (<4h).",
      "Post-clean: re-baseline vibration and exit temp; consider blade coating upgrade.",
    ],
    notes: "Brief D. Roy at handover. Plan cleaning during next opportunistic stop.",
    knowledge: [
      "Cooler Fan Maintenance SOP",
      "Failure Report FR-2025-072 (Cooler Fan Imbalance)",
      "OEM Fan Maintenance Guide (Howden)",
      "Historical Vibration Records",
    ],
  },
  CC: {
    failureMode: "SEN refractory wear approaching campaign end.",
    condition: e => [
      "Mould level σ +18% vs early-campaign baseline (still within control band).",
      "Mould oscillation 3.02 Hz nominal; secondary cooling adequate.",
      `Strand surface temperature within target. Health ${e.health}/100.`,
    ],
    rca: [
      "Primary: SEN refractory wear nearing campaign limit.",
      "Evidence: mould level variance rising linearly with heats cast; argon stable.",
      "Alternative: tundish slag carry-over — ruled out by stable temperature profile.",
    ],
    rul: e => `SEN remaining campaign life ~20 heats; caster set RUL >${e.rulDays} days (confidence 0.85).`,
    actions: [
      "Immediate: no action.",
      "Planned: replace SEN at next tundish change-out (per SOP).",
      "Maintain argon purge at current setpoint.",
    ],
    notes: "Coordinate SEN change-out with tundish ladle schedule.",
    knowledge: [
      "Caster Maintenance SOP",
      "Mould Level / SEN Wear Failure Report",
      "OEM Caster Manual (Danieli)",
      "Historical Tundish Campaign Records",
    ],
  },
  CGL: {
    failureMode: "Burner controller PID drift; coating weight within tolerance.",
    condition: e => [
      "Zinc pot temperature deviation 4 °C; strip speed nominal.",
      "Pot bearings and dross removal cycle on schedule.",
      `No predictive flags. Health ${e.health}/100.`,
    ],
    rca: [
      "Primary: burner controller PID tuning drift.",
      "Coating weight variance within tolerance; no active fault to root-cause.",
    ],
    rul: e => `Line RUL >${e.rulDays} days at current operating profile (confidence 0.88).`,
    actions: [
      "Re-tune burner PID loop at next planned stop.",
      "Maintain PM schedule.",
    ],
    notes: "No exceptions to flag.",
    knowledge: [
      "CGL Maintenance SOP",
      "OEM Galvanizing Line Manual (Primetals)",
      "Historical Pot Temperature Records",
    ],
  },
  DEFAULT: {
    failureMode: "General component wear within expected degradation curve.",
    condition: e => [`Health ${e.health}/100, RUL ${e.rulDays} days, failure probability ${Math.round(e.failureProb * 100)}%.`],
    rca: ["Routine wear pattern; no incipient failure flagged."],
    rul: e => `RUL ${e.rulDays} days (confidence 0.70).`,
    actions: ["Maintain PM schedule.", "Re-baseline at next planned outage."],
    notes: "No exceptions.",
    knowledge: ["Equipment Manual", "Maintenance SOP", "Historical Records"],
  },
};

function execNarrative(e: Equipment, n: FamilyNarrative): string {
  const sev = e.risk === "CRITICAL" ? "the dominant reliability concern" : e.risk === "HIGH" ? "a notable reliability concern" : "operating within its reliability band";
  return `${e.name} (${e.id}) is ${sev} in ${e.area} this reporting window. Failure mode under investigation is ${n.failureMode.toLowerCase()} Current health is ${e.health}/100 with failure probability ${Math.round(e.failureProb * 100)}% and remaining useful life of approximately ${e.rulDays} days. ${e.criticality === "A" ? "Class-A criticality with direct production exposure — proactive intervention strongly recommended." : "Routine surveillance is appropriate, escalating only on threshold breach."}`;
}

function riskNarrative(e: Equipment): string {
  const risk = Math.round(e.failureProb * 100 * (e.criticality === "A" ? 1 : e.criticality === "B" ? 0.7 : 0.4));
  return `Risk Score ${risk}/100 · Criticality ${e.criticality} · Production exposure ${e.productionImpactKt} kt/day if uncontrolled (${e.businessImpact}).`;
}

function businessNarrative(e: Equipment): string {
  return `${e.businessImpact}. Planned intervention preserves throughput and avoids unplanned outage cascade across ${e.area}.`;
}

// ---------- Component ----------
function Reports() {
  const eq = useEquipment();
  const al = useAlerts();
  const sp = useSpares();
  const lg = useMaintenanceLogs();

  const equipment = eq.data ?? [];
  const alerts = al.data ?? [];
  const spares = sp.data ?? [];
  const logs = lg.data ?? [];

  const loading = eq.isLoading || al.isLoading || sp.isLoading || lg.isLoading;
  const errored = eq.isError || al.isError || sp.isError || lg.isError;

  const [type, setType] = useState<ReportType>("asset");
  const [assetId, setAssetId] = useState<string>("HSM-F4");

  const asset = equipment.find(e => e.id === assetId) ?? equipment[0];

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Connecting to Plant Link • Live… loading telemetry streams.</div>;
  }
  if (!asset) {
    return <div className="p-8 text-sm text-muted-foreground">{errored ? "Telemetry connection lost. Displaying cached operational data." : "No assets available."}</div>;
  }

  const fam = FAMILY[familyOf(asset.id)];
  const audience = TYPES.find(t => t.id === type)?.audience ?? "";

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <PageHeader eyebrow="Decision Summary" title="Maintenance Report"
        subtitle={`Auto-generated from live plant data · Audience: ${audience}. Every report type is uniquely composed for its purpose and the selected asset.`}
        actions={
          <>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-md text-sm hover:bg-accent"><Printer className="h-4 w-4" />Print</button>
            <button onClick={async () => {
              const { exportReportPdf } = await import("@/lib/report-pdf");
              await exportReportPdf({
                title: `${TYPES.find(t => t.id === type)?.label ?? "Report"} — ${asset.id}`,
                audience,
                asset: { id: asset.id, name: asset.name, area: asset.area, criticality: asset.criticality, health: asset.health, risk: asset.risk, rulDays: asset.rulDays },
                sections: [
                  { heading: "Executive Summary", body: execNarrative(asset, fam) },
                  { heading: "Failure Mode", body: fam.failureMode },
                  { heading: "Condition", body: fam.condition(asset).join(" • ") },
                  { heading: "Root Cause Analysis", body: fam.rca.join(" • ") },
                  { heading: "Risk", body: riskNarrative(asset) },
                  { heading: "Remaining Useful Life", body: fam.rul(asset) },
                  { heading: "Business Impact", body: businessNarrative(asset) },
                  { heading: "Knowledge Sources Consulted", body: fam.knowledge.join(" • ") },
                ],
                recommendations: fam.actions,
              });
            }} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium"><Download className="h-4 w-4" />Export PDF</button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <div className="panel p-3 h-fit space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2 pb-1.5">Report Type</div>
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition flex items-center gap-3 ${type === t.id ? "bg-primary/10 text-primary border border-primary/30" : "hover:bg-accent border border-transparent"}`}>
                <FileText className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          <div className="pt-3 border-t border-border">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2 pb-1.5">Asset Focus</div>
            {equipment.map(e => (
              <button key={e.id} onClick={() => setAssetId(e.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs transition ${assetId === e.id ? "bg-primary/10 text-primary border border-primary/30" : "hover:bg-accent border border-transparent"}`}>
                <div className="font-mono text-[10px] text-muted-foreground">{e.id}</div>
                <div className="font-medium">{e.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel p-7">
          <div className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold mb-2">{TYPES.find(t => t.id === type)?.label} · {asset.id}</div>
          <h2 className="text-2xl font-semibold mb-1">{asset.name}</h2>
          <p className="text-sm text-muted-foreground mb-6">{asset.area} · Criticality {asset.criticality} · Health {asset.health}/100 · Risk {asset.risk} · RUL ~{asset.rulDays}d</p>

          {type === "asset"    && <CriticalAssetReport asset={asset} fam={fam} alerts={alerts} spares={spares} />}
          {type === "shift"    && <ShiftHandoverReport asset={asset} alerts={alerts} logs={logs} />}
          {type === "daily"    && <DailyReliabilityReport asset={asset} equipment={equipment} alerts={alerts} spares={spares} />}
          {type === "weekly"   && <WeeklyMaintenanceReport asset={asset} equipment={equipment} logs={logs} spares={spares} />}
          {type === "exec"     && <ExecSummary equipment={equipment} alerts={alerts} spares={spares} />}
          {type === "spares"   && <SpareReport spares={spares} equipment={equipment} />}
          {type === "shutdown" && <ShutdownReport asset={asset} fam={fam} logs={logs} />}
        </div>
      </div>
    </div>
  );
}

// ---------- Critical Asset Report ----------
function CriticalAssetReport({ asset, fam, alerts, spares }: { asset: Equipment; fam: FamilyNarrative; alerts: Alert[]; spares: SparePart[] }) {
  const assetAlerts = alerts.filter(a => a.assetId === asset.id);
  const linkedSpares = spares.filter(s => s.associatedAssets.includes(asset.id));
  return (
    <>
      <Section title="Executive Summary"><p>{execNarrative(asset, fam)}</p></Section>
      <Section title="Current Asset Condition">
        <ul className="space-y-1.5 list-disc list-outside ml-5">{fam.condition(asset).map((c, i) => <li key={i}>{c}</li>)}</ul>
      </Section>
      <Section title="Risk Assessment"><p>{riskNarrative(asset)}</p></Section>
      <Section title="Root Cause Analysis">
        <ul className="space-y-1.5 list-disc list-outside ml-5">{fam.rca.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </Section>
      <Section title="Remaining Useful Life Forecast"><p>{fam.rul(asset)}</p></Section>
      <Section title="Recommended Actions">
        <ul className="space-y-1.5 list-disc list-outside ml-5">{fam.actions.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </Section>
      <Section title="Spare Requirements">
        {linkedSpares.length === 0
          ? <p className="text-muted-foreground text-sm">No registered spare dependencies for this asset.</p>
          : <ul className="space-y-1.5 list-disc list-outside ml-5">
              {linkedSpares.map(s => {
                const short = s.stock <= s.reorderLevel;
                const urgent = short && asset.rulDays < s.leadTimeDays;
                const tag = urgent ? "ORDER IMMEDIATELY" : short ? "Order This Week" : s.stock <= s.reorderLevel + 2 ? "Monitor Inventory" : "Healthy";
                return <li key={s.partNo}>{s.partNo} {s.description} — stock {s.stock}, reorder {s.reorderLevel}, lead {s.leadTimeDays}d → <b>{tag}</b></li>;
              })}
            </ul>}
      </Section>
      <Section title="Open Alerts on this Asset">
        {assetAlerts.length === 0 ? <p className="text-muted-foreground text-sm">No open alerts.</p> :
          <ul className="space-y-1.5 list-disc list-outside ml-5">
            {assetAlerts.map(a => <li key={a.id}><b>[{a.severity.toUpperCase()}]</b> {a.title} — {a.recommendation ?? "investigation required"} (risk {a.riskScore})</li>)}
          </ul>}
      </Section>
      <Section title="Business Impact"><p>{businessNarrative(asset)}</p></Section>
      <Section title="Engineer Notes"><p className="italic text-muted-foreground">{fam.notes}</p></Section>
      <Section title="Knowledge Sources Consulted">
        <ul className="space-y-1 list-disc list-outside ml-5 text-xs">{fam.knowledge.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </Section>
    </>
  );
}

// ---------- Shift Handover Report ----------
function ShiftHandoverReport({ asset, alerts, logs }: { asset: Equipment; alerts: Alert[]; logs: MaintenanceLog[] }) {
  const newAlerts = alerts.filter(a => a.status === "open").slice(0, 6);
  const completed = logs.filter(l => l.assetId === asset.id).slice(0, 3);
  const fam = FAMILY[familyOf(asset.id)];
  return (
    <>
      <Section title="Shift Brief — Incoming Crew">
        <p>{asset.name} ({asset.id}) handed over in <b>{asset.status}</b> state at end of shift. Failure mode under watch: {fam.failureMode.toLowerCase()} Asset health <b>{asset.health}/100</b>, RUL <b>{asset.rulDays}d</b>. {asset.risk === "CRITICAL" ? "Carry forward as priority watch." : asset.risk === "HIGH" ? "Maintain close observation, log any threshold creep." : "Routine surveillance is sufficient."}</p>
      </Section>
      <Section title="Shift Events on this Asset">
        {completed.length === 0 ? <p className="text-sm text-muted-foreground">No maintenance activity logged on {asset.id} this shift.</p>
          : <ul className="space-y-1.5 list-disc list-outside ml-5">{completed.map(l => <li key={l.id}>{l.date} · {l.issue} → {l.action} ({l.engineer}, {l.outcome}, {l.durationHrs}h)</li>)}</ul>}
      </Section>
      <Section title="Plant-Wide New Alarms (last cycle)">
        {newAlerts.length === 0 ? <p className="text-sm text-muted-foreground">No new alarms.</p>
          : <ul className="space-y-1.5 list-disc list-outside ml-5">{newAlerts.map(a => <li key={a.id}><b>[{a.severity.toUpperCase()}]</b> {a.assetName}: {a.title} — assigned {a.team ?? "unassigned"}</li>)}</ul>}
      </Section>
      <Section title="Equipment Status Changes">
        <p className="text-sm">{asset.id} risk currently <b>{asset.risk}</b>. Status: <b>{asset.status}</b>. Last PM {asset.lastMaintenance}, next planned {asset.nextPM}.</p>
      </Section>
      <Section title="Actions Required For Next Shift">
        <ul className="space-y-1.5 list-disc list-outside ml-5">
          {fam.actions.slice(0, 3).map((a, i) => <li key={i}>{a}</li>)}
          <li>Verify all open alarms on {asset.id} are acknowledged and assigned in the CMMS.</li>
        </ul>
      </Section>
      <Section title="Hand-Over Notes"><p className="italic text-muted-foreground">{fam.notes}</p></Section>
    </>
  );
}

// ---------- Daily Reliability Report ----------
function DailyReliabilityReport({ asset, equipment, alerts, spares }: { asset: Equipment; equipment: Equipment[]; alerts: Alert[]; spares: SparePart[] }) {
  const k = computePlantKpi(equipment, alerts, spares);
  const fam = FAMILY[familyOf(asset.id)];
  const newOpen = alerts.filter(a => a.status === "open").length;
  return (
    <>
      <Section title="Daily Reliability Snapshot">
        <p>Plant operated at <b>{k.health}%</b> health and <b>{k.reliability}%</b> reliability index over the last 24 hours. <b>{k.critical}</b> critical asset{k.critical === 1 ? "" : "s"} and <b>{k.nearFailure}</b> asset{k.nearFailure === 1 ? "" : "s"} are within the 30-day RUL window. {newOpen} alarm{newOpen === 1 ? "" : "s"} remain open across the plant.</p>
      </Section>
      <Section title="Focus Asset — Health Change">
        <p>{asset.name} ({asset.id}) finished the day at <b>{asset.health}/100</b> with risk classification <b>{asset.risk}</b> and remaining useful life of <b>{asset.rulDays} days</b>. Predominant degradation mechanism: {fam.failureMode.toLowerCase()}</p>
      </Section>
      <Section title="Assets Near Failure (RUL &lt; 30 days)">
        {equipment.filter(e => e.rulDays < 30).length === 0
          ? <p className="text-sm text-muted-foreground">No assets currently inside the 30-day failure window.</p>
          : <ul className="space-y-1.5 list-disc list-outside ml-5">
              {equipment.filter(e => e.rulDays < 30).sort((a, b) => a.rulDays - b.rulDays).map(e =>
                <li key={e.id}>{e.id} {e.name} — RUL {e.rulDays}d · failure prob {Math.round(e.failureProb * 100)}% · {e.businessImpact}</li>)}
            </ul>}
      </Section>
      <Section title="Immediate Actions for Operations Today">
        <ul className="space-y-1.5 list-disc list-outside ml-5">
          {fam.actions.slice(0, 2).map((a, i) => <li key={i}>{a}</li>)}
          {k.spareShortages > 0 && <li>Coordinate with procurement on {k.spareShortages} spare line{k.spareShortages === 1 ? "" : "s"} below reorder threshold.</li>}
        </ul>
      </Section>
      <Section title="Reliability Indicators (24h)">
        <p>Open alerts <b>{k.openAlerts}</b> · Critical assets <b>{k.critical}</b> · Below-reorder spares <b>{k.spareShortages}</b>.</p>
      </Section>
    </>
  );
}

// ---------- Weekly Maintenance Report ----------
function WeeklyMaintenanceReport({ asset, equipment, logs, spares }: { asset: Equipment; equipment: Equipment[]; logs: MaintenanceLog[]; spares: SparePart[] }) {
  const recent = logs.slice(0, 8);
  const completedThisWeek = recent.length;
  const successful = recent.filter(l => l.outcome === "successful").length;
  const totalDT = recent.reduce((s, l) => s + l.downtimeHrs, 0);
  const fam = FAMILY[familyOf(asset.id)];
  return (
    <>
      <Section title="Weekly Maintenance Summary">
        <p>{completedThisWeek} maintenance activit{completedThisWeek === 1 ? "y" : "ies"} closed across {new Set(recent.map(l => l.assetId)).size} asset{new Set(recent.map(l => l.assetId)).size === 1 ? "" : "s"} this week, with a {Math.round((successful / Math.max(completedThisWeek, 1)) * 100)}% successful-completion rate and <b>{totalDT.toFixed(1)} h</b> cumulative downtime. Planning emphasis remains on {asset.id} ({fam.failureMode.toLowerCase().slice(0, -1)}).</p>
      </Section>
      <Section title="Maintenance Activities Completed">
        {recent.length === 0 ? <p className="text-sm text-muted-foreground">No closed activities recorded.</p>
          : <ul className="space-y-1.5 text-sm">
              {recent.map(l => <li key={l.id}>{l.date} · {l.assetId} — {l.issue} → {l.action} ({l.engineer}, {l.outcome})</li>)}
            </ul>}
      </Section>
      <Section title="Open Work Orders & Reliability Trend">
        <p>{equipment.filter(e => e.risk === "CRITICAL" || e.risk === "HIGH").length} asset{equipment.filter(e => e.risk === "CRITICAL" || e.risk === "HIGH").length === 1 ? "" : "s"} carry CRITICAL or HIGH risk and feed the open backlog. Average health across the fleet is <b>{Math.round(equipment.reduce((s, e) => s + e.health, 0) / Math.max(equipment.length, 1))}/100</b>.</p>
      </Section>
      <Section title="Spare Consumption & Planned Procurement">
        <ul className="space-y-1.5 list-disc list-outside ml-5">
          {spares.filter(s => s.stock <= s.reorderLevel).map(s =>
            <li key={s.partNo}>{s.partNo} {s.description} — stock {s.stock}, reorder {s.reorderLevel}, lead {s.leadTimeDays}d ({s.supplier})</li>)}
          {spares.filter(s => s.stock <= s.reorderLevel).length === 0 && <li>No reorder-threshold breaches this week.</li>}
        </ul>
      </Section>
      <Section title="Planned Work for Next Week">
        <ul className="space-y-1.5 list-disc list-outside ml-5">
          {fam.actions.slice(2).map((a, i) => <li key={i}>{a}</li>)}
          <li>PM check on {asset.id} aligned with next planned window ({asset.nextPM}).</li>
        </ul>
      </Section>
    </>
  );
}

// ---------- Executive Summary ----------
function ExecSummary({ equipment, alerts, spares }: { equipment: Equipment[]; alerts: Alert[]; spares: SparePart[] }) {
  const k = computePlantKpi(equipment, alerts, spares);
  const prioritized = prioritizeEquipment(equipment).slice(0, 5);
  const shortages = spares.filter(s => s.stock <= s.reorderLevel);
  return (
    <>
      <Section title="Plant Executive Summary">
        <ul className="space-y-1.5 list-disc list-outside ml-5">
          <li>Plant health <b>{k.health}%</b>, reliability index <b>{k.reliability}%</b>. Operating within healthy band.</li>
          <li><b>{k.critical}</b> critical asset{k.critical === 1 ? "" : "s"} and <b>{k.nearFailure}</b> asset{k.nearFailure === 1 ? "" : "s"} are within the 30-day RUL window.</li>
          <li><b>{k.openAlerts}</b> alarm{k.openAlerts === 1 ? "" : "s"} remain open across the plant.</li>
          {shortages.length > 0 && <li><b>{shortages.length}</b> spare line{shortages.length === 1 ? "" : "s"} below reorder threshold — procurement action required.</li>}
        </ul>
      </Section>
      <Section title="Top Maintenance Priorities">
        <div className="space-y-2">
          {prioritized.map((e, i) => (
            <div key={e.id} className="flex items-center gap-5 py-2 border-b border-border/60 last:border-0">
              <div className="text-2xl font-bold text-primary w-6">{i + 1}</div>
              <div className="flex-1">
                <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">{e.id}</div>
                <div className="font-semibold">{e.name}</div>
                <div className="text-xs text-muted-foreground">{e.area} · RUL ~{e.rulDays}d</div>
              </div>
              <SeverityTag s={e.risk} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Open Alerts (Risk-Ranked)">
        <div className="space-y-2">
          {alerts.filter(a => a.status === "open").slice(0, 8).map(a => (
            <div key={a.id} className="flex items-start gap-3 text-sm border-b border-border/60 pb-2">
              <SeverityTag s={a.severity} />
              <div className="flex-1">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.assetName} · {a.recommendation ?? "investigation required"}</div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">Risk {a.riskScore}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ---------- Spare Procurement Report ----------
function SpareReport({ spares, equipment }: { spares: SparePart[]; equipment: Equipment[] }) {
  return (
    <>
      <Section title="Spare Procurement Summary">
        <p>{spares.filter(s => s.criticality === "A" && s.stock <= s.reorderLevel).length} class-A part{spares.filter(s => s.criticality === "A" && s.stock <= s.reorderLevel).length === 1 ? "" : "s"} below reorder threshold. Procurement priority is set by comparing lead time against the linked asset's remaining useful life.</p>
      </Section>
      <Section title="Procurement Actions">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase text-muted-foreground tracking-wider">
            <tr className="text-left"><th className="py-2">Part</th><th>Description</th><th>Stock / Reorder</th><th>Lead</th><th>Recommendation</th></tr>
          </thead>
          <tbody>
            {spares.map(s => {
              const linkedRul = equipment.filter(e => s.associatedAssets.includes(e.id)).map(e => e.rulDays);
              const minRul = linkedRul.length ? Math.min(...linkedRul) : 999;
              const action = s.stock <= s.reorderLevel && minRul < s.leadTimeDays
                ? { label: "Order Immediately", cls: "tag-critical" }
                : s.stock <= s.reorderLevel
                  ? { label: "Order This Week", cls: "tag-high" }
                  : s.stock <= s.reorderLevel + 2
                    ? { label: "Monitor Inventory", cls: "tag-medium" }
                    : { label: "Delay Purchase", cls: "tag-low" };
              return (
                <tr key={s.partNo} className="border-t border-border/60">
                  <td className="py-2 font-mono text-xs">{s.partNo}</td>
                  <td className="text-xs">{s.description}</td>
                  <td className="font-mono">{s.stock}/{s.reorderLevel}</td>
                  <td className="font-mono">{s.leadTimeDays}d</td>
                  <td className="text-xs"><span className={`tag ${action.cls}`}>{action.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    </>
  );
}

// ---------- Shutdown Planning ----------
function ShutdownReport({ asset, fam, logs }: { asset: Equipment; fam: FamilyNarrative; logs: MaintenanceLog[] }) {
  return (
    <>
      <Section title={`Planned Outage Window — ${asset.id} (${asset.nextPM})`}>
        <p>The next planned window for {asset.name} is {asset.nextPM}. Sequence below is optimised for crew load and spare availability. Failure mode addressed: {fam.failureMode.toLowerCase()}</p>
      </Section>
      <Section title="Recommended Maintenance Sequence">
        <ol className="list-decimal list-outside ml-5 space-y-1.5">
          {fam.actions.map((a, i) => <li key={i}>{a}</li>)}
        </ol>
      </Section>
      <Section title="Recent Maintenance History (referenced)">
        <ul className="space-y-1 text-xs">
          {logs.slice(0, 6).map(l => <li key={l.id}>{l.date} · {l.assetId} — {l.issue} → {l.action} ({l.outcome})</li>)}
        </ul>
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}
