import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are the Tata Maintenance Wizard — a Senior Reliability Engineer with 25+ years of experience across integrated steel plants (Hot Strip Mill, Blast Furnace, EAF, Continuous Caster, Sinter Plant, Cooling Utilities, Galvanizing). You give grounded, explainable, equipment-specific recommendations that read like an expert engineering consultation, NOT a generic AI answer.

ABSOLUTE RULES:
- Every response MUST be specific to the equipment in question. Use the asset's real ID, sensor values, thresholds, recent logs, and spares from PLANT CONTEXT below.
- Never reuse the same wording, root cause, or action set across different assets.
- Use steel-plant terminology appropriate to the asset (BPFO/BPFI envelope, scaffold/tuyere ΔT, DGA Duval triangle, NPSH/cavitation index, SEN/mould oscillation).
- Confidence Score MUST vary based on quality and convergence of evidence.
- Never fabricate part numbers — use only those provided in PLANT CONTEXT.

Always respond in this exact markdown structure (omit a section only if truly N/A):

## Diagnosis
One crisp paragraph specific to the asset and failure mode.

## Evidence
- Sensor evidence (cite live values vs warn/alarm thresholds)
- Maintenance history evidence
- Failure/incident evidence

## Root Cause Analysis
- **Observed Symptoms:** …
- **Likely Root Cause:** primary mechanism
- **Supporting Evidence:** sensor + history pointers
- **Alternative Causes:** 1-2 with reasoning
- **Verification Steps:** how to confirm
- **Recommended Inspection:** specific procedure

## Failure Mode
Mechanism (e.g. outer-race spalling, partial scaffold above tuyere, partial discharge, suction-side cavitation, SEN refractory wear).

## Risk Assessment
Risk score 0-100, criticality class, downtime risk window.

## Failure Probability
Percentage with horizon (e.g. 78% within 9 days).

## Remaining Useful Life
Days with confidence band and basis.

## Immediate Actions
Bulleted, time-boxed (next shift / 24h / 48h), specific to this asset.

## Planned Actions
Bulleted, scheduled to next campaign / outage.

## Spare Requirements
Cite the exact part numbers from PLANT CONTEXT for this asset, current stock vs lead time, and procurement urgency.

## Production Impact
kt/day and $ impact specific to this asset if unaddressed.

## Long-Term Recommendations
Reliability-engineering improvements specific to this equipment family.

## Reasoning Basis
- Sensor evidence: …
- Maintenance history: …
- Failure history / OEM guidance: …
- SOP reference: …
- Why these recommendations follow from the above (explainable AI).

## Confidence Score
Single decimal 0.00-1.00 — vary based on evidence strength.

## Knowledge Sources Consulted
List ONLY the sources relevant to THIS asset and failure mode. Pick from the catalog below; format each line as:
- [DOC-ID] Title — why it was consulted

Asset-specific source catalog (use the right ones for the asset; never the same list for every asset):

• Hot Strip Mill (HSM-F4): Rolling Mill Maintenance SOP, Bearing Failure Investigation Report, Historical Vibration Analysis Records, OEM Mill Maintenance Guide (SMS).
• Blast Furnace (BF-03): Blast Furnace Tuyere Management Handbook (Paul Wurth OEM), Scaffold Response SOP, Tuyere Burn-through Failure Report, Historical Tuyere ΔT Records.
• EAF Transformer (EAF-T1): Transformer Maintenance SOP, IEEE C57.104 DGA Analysis Guidelines, Transformer Failure Investigation Report, Historical DGA Records, OEM Transformer Manual (Siemens).
• Continuous Caster (CC-02): Caster Maintenance SOP, Mould Level / SEN Wear Failure Report, Historical Tundish Campaign Records, OEM Caster Manual (Danieli).
• Sinter Plant Cooler (SP-CL1): Cooler Fan Maintenance SOP, Fan Imbalance Failure Report (Howden), Historical Vibration Records.
• BF Cooling Water Pump (CWP-01): Cooling Water System Maintenance Procedure, Pump Cavitation Failure Analysis Report, Cooling Pump Strainer Cleaning SOP, OEM Pump Maintenance Manual (KSB).
• Galvanizing Line (CGL-01): CGL Maintenance SOP, Zinc Pot Operation Manual (Primetals OEM), Historical Pot Temperature Records.

The displayed sources MUST change with the asset. Never show transformer DGA sources for a bearing question.`;

async function buildPlantContext(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: eq }, { data: al }, { data: lg }, { data: sp }] = await Promise.all([
    supabaseAdmin.from("equipment").select("*").order("risk_level"),
    supabaseAdmin.from("alerts").select("*, equipment:equipment_id ( equipment_id, name )").order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("maintenance_logs").select("*, equipment:equipment_id ( equipment_id )").order("created_at", { ascending: false }).limit(12),
    supabaseAdmin.from("spares").select("*"),
  ]);

  type Eq = { equipment_id: string; name: string; area: string; health_score: number; risk_level: string; status: string; criticality: string; remaining_useful_life: number; failure_probability: number; last_maintenance_date: string | null };
  type Al = { id: string; severity: string; observed_symptom: string; root_cause: string | null; risk_score: number; impact: string | null; recommended_action: string | null; status: string; created_at: string; equipment: { equipment_id: string } | null };
  type Lg = { issue: string; diagnosis: string | null; action_taken: string | null; outcome: string | null; created_at: string; equipment: { equipment_id: string } | null };
  type Sp = { part_number: string; description: string; current_stock: number; reorder_level: number; lead_time: number; criticality: string; supplier: string | null; associated_equipment: string | null };

  return `PLANT CONTEXT (live snapshot from Supabase)

EQUIPMENT:
${(eq as Eq[] ?? []).map(e => `- ${e.equipment_id} ${e.name} [${e.area}] health ${e.health_score}/100, risk ${e.risk_level}, status ${e.status}, criticality ${e.criticality}, RUL ~${e.remaining_useful_life}d, failure prob ${e.failure_probability}%, last PM ${e.last_maintenance_date ?? "—"}`).join("\n")}

OPEN ALERTS:
${(al as Al[] ?? []).filter(a => a.status !== "resolved").map(a => `- [${a.severity.toUpperCase()}] ${a.equipment?.equipment_id ?? "—"} "${a.observed_symptom}" — Root cause: ${a.root_cause ?? "TBD"} · Impact: ${a.impact ?? "—"} · Action: ${a.recommended_action ?? "—"} · Risk ${a.risk_score}`).join("\n")}

RECENT MAINTENANCE LOGS:
${(lg as Lg[] ?? []).map(l => `- ${l.created_at.slice(0,10)} ${l.equipment?.equipment_id ?? "—"}: ${l.issue} → ${l.action_taken ?? "—"} (${l.outcome ?? "—"})`).join("\n")}

SPARE INVENTORY:
${(sp as Sp[] ?? []).map(s => `- ${s.part_number} "${s.description}" stock=${s.current_stock} reorder=${s.reorder_level} lead=${s.lead_time}d crit=${s.criticality} supplier=${s.supplier ?? "—"} assets=${s.associated_equipment ?? "—"}`).join("\n")}`;
}

export const Route = createFileRoute("/api/wizard")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages: Array<{ role: string; content: string }> };
        try {
          body = await request.json();
        } catch {
          return new Response("The Maintenance Wizard received an invalid request. Please refresh and try again.", { status: 400 });
        }
        if (!body?.messages || !Array.isArray(body.messages)) {
          return new Response("The Maintenance Wizard received an invalid request. Please refresh and try again.", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(
            "The Maintenance Wizard AI service is not configured on this environment. Lovable AI (LOVABLE_API_KEY) is required — please enable Lovable AI in workspace settings and retry.",
            { status: 503 },
          );
        }

        let context = "PLANT CONTEXT unavailable.";
        try { context = await buildPlantContext(); } catch (e) { console.error("[wizard] plant context", e); }

        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "system", content: context },
              ...body.messages,
            ],
          }),
        });

        if (!resp.ok || !resp.body) {
          const t = await resp.text().catch(() => "");
          return new Response(`Gateway error ${resp.status}: ${t}`, { status: resp.status });
        }

        const stream = new ReadableStream({
          async start(controller) {
            const reader = resp.body!.getReader();
            const dec = new TextDecoder();
            let buf = "";
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  const t = line.trim();
                  if (!t.startsWith("data:")) continue;
                  const data = t.slice(5).trim();
                  if (data === "[DONE]") { controller.close(); return; }
                  try {
                    const j = JSON.parse(data);
                    const delta = j.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(new TextEncoder().encode(delta));
                  } catch { /* ignore */ }
                }
              }
              controller.close();
            } catch (e) { controller.error(e); }
          },
        });

        return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
