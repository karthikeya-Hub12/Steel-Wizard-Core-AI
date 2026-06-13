// Server functions for plant data. Loads supabaseAdmin inside handlers so the
// server-only client never leaks into the client bundle.
import { createServerFn } from "@tanstack/react-start";
import type { Alert, Equipment, KnowledgeDoc, MaintenanceLog, ProcurementRequest, SparePart, Severity, RiskLevel, AssetStatus, SensorReading } from "@/types/plant";
import { ASSET_ENRICHMENT, defaultSensors } from "@/lib/plant-data";

type DbEquipment = {
  id: string; equipment_id: string; name: string; area: string;
  health_score: number; risk_level: string; status: string; criticality: string;
  remaining_useful_life: number; failure_probability: number;
  last_maintenance_date: string | null;
  manufacturer: string | null; installed_year: number | null;
  next_pm_date: string | null; mtbf_hours: number | null; mttr_hours: number | null;
  production_impact_kt: number | null; business_impact: string | null;
};

type DbAlert = {
  id: string; equipment_id: string; severity: string; observed_symptom: string;
  root_cause: string | null; risk_score: number; impact: string | null;
  recommended_action: string | null; assigned_engineer: string | null;
  team_assignment: string | null; detection_method: string | null;
  failure_mode: string | null; evidence: string | null;
  corrective_actions: string | null; preventive_actions: string | null;
  resolved_at: string | null;
  status: string; created_at: string;
  equipment?: { equipment_id: string; name: string } | null;
};

type DbSpare = {
  part_number: string; description: string; current_stock: number;
  reorder_level: number; lead_time: number; unit_cost: number;
  supplier: string | null; criticality: string;
  associated_equipment: string | null;
  alternative_suppliers: string | null; usage_trend: string | null;
  consumption_per_year: number | null;
};

type DbLog = {
  id: string; equipment_id: string; issue: string; diagnosis: string | null;
  action_taken: string | null; engineer: string | null; outcome: string | null;
  duration_hours: number | null; created_at: string;
  equipment?: { equipment_id: string } | null;
};

type DbKnowledge = {
  id: string; doc_id: string; title: string; category: string; summary: string;
  content: string | null; pages: number; updated_on: string;
  related_assets: string[] | null; related_failure_modes: string[] | null;
  cross_references: string[] | null; usage_count: number;
  confidence_contribution: number; relevance_score: number; tags: string[] | null;
};

type DbPR = {
  id: string; pr_number: string; part_number: string; description: string | null;
  supplier: string | null; quantity: number; estimated_cost: number;
  priority: string; justification: string | null; status: string;
  requested_by: string | null; created_at: string;
};

const STATUS_MAP: Record<string, AssetStatus> = {
  healthy: "operational", operational: "operational",
  degraded: "warning", warning: "warning",
  fault: "fault", offline: "offline",
};

function pickSensors(code: string, area: string): SensorReading[] {
  return ASSET_ENRICHMENT[code]?.sensors ?? defaultSensors(code, area);
}

function mapEquipment(r: DbEquipment): Equipment {
  const code = r.equipment_id;
  return {
    id: code, dbId: r.id, name: r.name, area: r.area,
    health: r.health_score,
    risk: (r.risk_level.toUpperCase() as RiskLevel),
    status: STATUS_MAP[r.status] ?? "operational",
    criticality: (r.criticality as "A" | "B" | "C"),
    rulDays: r.remaining_useful_life,
    failureProb: Math.max(0, Math.min(1, r.failure_probability / 100)),
    lastMaintenance: r.last_maintenance_date ?? "—",
    nextPM: r.next_pm_date ?? "—",
    installedYear: r.installed_year ?? 0,
    manufacturer: r.manufacturer ?? "—",
    mtbfHours: r.mtbf_hours ?? 0,
    mttrHours: Number(r.mttr_hours ?? 0),
    productionImpactKt: Number(r.production_impact_kt ?? 0),
    businessImpact: r.business_impact ?? "—",
    sensors: pickSensors(code, r.area),
  };
}

function mapAlert(r: DbAlert): Alert {
  const sev = (r.severity.toLowerCase() as Severity);
  const code = r.equipment?.equipment_id ?? "—";
  const symptom = r.observed_symptom ?? "";
  const title = symptom.split(/[·•,;.]/)[0]?.trim() || "Abnormality detected";
  return {
    id: r.id, assetId: code,
    assetName: r.equipment?.name ?? code,
    title, description: symptom, severity: sev,
    riskScore: r.risk_score, timestamp: r.created_at,
    source: "sensor",
    status: (r.status as "open" | "acknowledged" | "resolved"),
    rootCause: r.root_cause, impact: r.impact,
    recommendation: r.recommended_action,
    team: r.team_assignment ?? r.assigned_engineer,
    detectionMethod: r.detection_method,
    failureMode: r.failure_mode,
    evidence: r.evidence,
    correctiveActions: r.corrective_actions,
    preventiveActions: r.preventive_actions,
    resolvedAt: r.resolved_at,
  };
}

function mapSpare(r: DbSpare): SparePart {
  return {
    partNo: r.part_number, description: r.description,
    stock: r.current_stock, reorderLevel: r.reorder_level,
    leadTimeDays: r.lead_time, supplier: r.supplier ?? "—",
    alternativeSuppliers: r.alternative_suppliers ?? "—",
    usageTrend: r.usage_trend ?? "stable",
    criticality: (r.criticality as "A" | "B" | "C"),
    consumptionPerYear: r.consumption_per_year ?? 0,
    associatedAssets: (r.associated_equipment ?? "").split(",").map(s => s.trim()).filter(Boolean),
    unitCost: r.unit_cost,
  };
}

function mapLog(r: DbLog): MaintenanceLog {
  const out = (r.outcome ?? "successful").toLowerCase();
  return {
    id: r.id, date: r.created_at.slice(0, 10),
    assetId: r.equipment?.equipment_id ?? "—",
    issue: r.issue, diagnosis: r.diagnosis ?? "",
    action: r.action_taken ?? "", engineer: r.engineer ?? "—",
    outcome: (out === "partial" || out === "reopened" ? out : "successful") as "successful" | "partial" | "reopened",
    downtimeHrs: r.duration_hours ?? 0, durationHrs: r.duration_hours ?? 0,
  };
}

function mapKnowledge(r: DbKnowledge): KnowledgeDoc {
  return {
    id: r.doc_id, dbId: r.id, title: r.title, category: r.category,
    summary: r.summary, content: r.content, pages: r.pages,
    updatedOn: r.updated_on,
    relatedAssets: r.related_assets ?? [],
    relatedFailureModes: r.related_failure_modes ?? [],
    crossReferences: r.cross_references ?? [],
    usageCount: r.usage_count,
    confidenceContribution: Number(r.confidence_contribution),
    relevanceScore: Number(r.relevance_score),
    tags: r.tags ?? [],
  };
}

function mapPR(r: DbPR): ProcurementRequest {
  return {
    id: r.id, prNumber: r.pr_number, partNumber: r.part_number,
    description: r.description, supplier: r.supplier, quantity: r.quantity,
    estimatedCost: Number(r.estimated_cost), priority: r.priority,
    justification: r.justification, status: r.status,
    requestedBy: r.requested_by ?? "Maintenance Planning",
    createdAt: r.created_at,
  };
}

export const listEquipment = createServerFn({ method: "GET" }).handler(async (): Promise<Equipment[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("equipment").select("*").order("equipment_id");
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbEquipment[]).map(mapEquipment);
});

export const listAlerts = createServerFn({ method: "GET" }).handler(async (): Promise<Alert[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("alerts")
    .select("*, equipment:equipment_id ( equipment_id, name )")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbAlert[]).map(mapAlert);
});

export const listSpares = createServerFn({ method: "GET" }).handler(async (): Promise<SparePart[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("spares").select("*").order("part_number");
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbSpare[]).map(mapSpare);
});

export const listMaintenanceLogs = createServerFn({ method: "GET" }).handler(async (): Promise<MaintenanceLog[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("maintenance_logs")
    .select("*, equipment:equipment_id ( equipment_id )")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbLog[]).map(mapLog);
});

export const listKnowledgeDocs = createServerFn({ method: "GET" }).handler(async (): Promise<KnowledgeDoc[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("knowledge_documents")
    .select("*").order("usage_count", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbKnowledge[]).map(mapKnowledge);
});

// Hard-coded actor — there is no end-user auth on this demo, so the audit
// log must record the system, never a client-supplied identity.
const SYSTEM_ACTOR = "Maintenance Planning (system)";

// Simple per-IP rate limiter backed by the existing wizard_rate_limit table.
// Returns true when the caller is over budget. Failures are non-fatal —
// we never want a transient DB blip to break the demo writes.
async function isRateLimited(scope: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const fwd = getRequestHeader("x-forwarded-for") ?? getRequestHeader("cf-connecting-ip") ?? "anon";
    const ip = (fwd.split(",")[0] ?? "anon").trim();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = `${scope}:${ip}`;
    const now = new Date();
    const { data: row } = await supabaseAdmin
      .from("wizard_rate_limit").select("*").eq("client_hash", key).maybeSingle();
    if (!row) {
      await supabaseAdmin.from("wizard_rate_limit").upsert({
        client_hash: key, request_count: 1,
        window_started_at: now.toISOString(), last_request_at: now.toISOString(),
      });
      return false;
    }
    const windowAge = now.getTime() - new Date(row.window_started_at).getTime();
    if (windowAge > windowMs) {
      await supabaseAdmin.from("wizard_rate_limit").update({
        request_count: 1, window_started_at: now.toISOString(), last_request_at: now.toISOString(),
      }).eq("client_hash", key);
      return false;
    }
    if (row.request_count >= limit) return true;
    await supabaseAdmin.from("wizard_rate_limit").update({
      request_count: row.request_count + 1, last_request_at: now.toISOString(),
    }).eq("client_hash", key);
    return false;
  } catch {
    return false;
  }
}

export const incrementDocUsage = createServerFn({ method: "POST" })
  .inputValidator((d: { docId: string }) => {
    if (typeof d?.docId !== "string" || d.docId.length === 0 || d.docId.length > 64) {
      throw new Error("Invalid request");
    }
    return { docId: d.docId };
  })
  .handler(async ({ data }) => {
    if (await isRateLimited("doc-usage", 60, 60_000)) {
      throw new Error("Too many requests. Please try again shortly.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("knowledge_documents")
      .select("usage_count").eq("doc_id", data.docId).maybeSingle();
    const next = (row?.usage_count ?? 0) + 1;
    await supabaseAdmin.from("knowledge_documents").update({ usage_count: next }).eq("doc_id", data.docId);
    return { usageCount: next };
  });

export const listProcurementRequests = createServerFn({ method: "GET" }).handler(async (): Promise<ProcurementRequest[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("procurement_requests")
    .select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as DbPR[]).map(mapPR);
});

const ALLOWED_PRIORITY = new Set(["low", "medium", "high", "urgent", "critical"]);
function trimStr(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

export const createProcurementRequest = createServerFn({ method: "POST" })
  .inputValidator((d: {
    partNumber: string; description?: string; supplier?: string;
    quantity: number; estimatedCost: number; priority: string;
    justification: string;
  }) => {
    const partNumber = trimStr(d?.partNumber, 64);
    const justification = trimStr(d?.justification, 1000);
    const priority = (typeof d?.priority === "string" ? d.priority.toLowerCase() : "");
    const quantity = Number(d?.quantity);
    const estimatedCost = Number(d?.estimatedCost);
    if (!partNumber) throw new Error("partNumber is required");
    if (!justification) throw new Error("justification is required");
    if (!ALLOWED_PRIORITY.has(priority)) throw new Error("invalid priority");
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) {
      throw new Error("quantity out of range");
    }
    if (!Number.isFinite(estimatedCost) || estimatedCost < 0 || estimatedCost > 100_000_000) {
      throw new Error("estimatedCost out of range");
    }
    return {
      partNumber,
      description: trimStr(d?.description, 500),
      supplier: trimStr(d?.supplier, 200),
      quantity, estimatedCost, priority, justification,
    };
  })
  .handler(async ({ data }): Promise<ProcurementRequest> => {
    if (await isRateLimited("pr-create", 10, 60_000)) {
      throw new Error("Too many procurement requests. Please try again shortly.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const today = now.toISOString().slice(0, 10).replace(/-/g, "");
    const tail = String(now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()).padStart(5, "0");
    const prNumber = `PR-${today}-${tail}`;
    const { data: inserted, error } = await supabaseAdmin.from("procurement_requests").insert({
      pr_number: prNumber, part_number: data.partNumber, description: data.description,
      supplier: data.supplier, quantity: data.quantity, estimated_cost: data.estimatedCost,
      priority: data.priority, justification: data.justification,
      requested_by: SYSTEM_ACTOR,
    }).select("*").single();
    if (error) throw new Error(error.message);
    return mapPR(inserted as DbPR);
  });
