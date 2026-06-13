// Domain types used by the UI. Server functions map DB rows into these shapes.

export type Severity = "critical" | "high" | "medium" | "low";
export type AssetStatus = "operational" | "warning" | "fault" | "offline";
export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface SensorReading {
  key: string;
  label: string;
  unit: string;
  value: number;
  baseline: number;
  warn: number;
  alarm: number;
  trend: number[];
}

export interface Equipment {
  id: string;
  dbId: string;
  name: string;
  area: string;
  health: number;
  risk: RiskLevel;
  status: AssetStatus;
  criticality: "A" | "B" | "C";
  rulDays: number;
  failureProb: number;
  productionImpactKt: number;
  businessImpact: string;
  lastMaintenance: string;
  nextPM: string;
  installedYear: number;
  manufacturer: string;
  mtbfHours: number;
  mttrHours: number;
  sensors: SensorReading[];
}

export interface Alert {
  id: string;
  assetId: string;
  assetName: string;
  title: string;
  description: string;
  severity: Severity;
  riskScore: number;
  timestamp: string;
  source: "sensor" | "predictive" | "system" | "operator";
  status: "open" | "acknowledged" | "resolved";
  rootCause: string | null;
  impact: string | null;
  recommendation: string | null;
  team: string | null;
  detectionMethod: string | null;
  failureMode: string | null;
  evidence: string | null;
  correctiveActions: string | null;
  preventiveActions: string | null;
  resolvedAt: string | null;
}

export interface SparePart {
  partNo: string;
  description: string;
  stock: number;
  reorderLevel: number;
  leadTimeDays: number;
  supplier: string;
  alternativeSuppliers: string;
  usageTrend: string;
  criticality: "A" | "B" | "C";
  consumptionPerYear: number;
  associatedAssets: string[];
  unitCost: number;
}

export interface MaintenanceLog {
  id: string;
  date: string;
  assetId: string;
  issue: string;
  diagnosis: string;
  action: string;
  engineer: string;
  outcome: "successful" | "partial" | "reopened";
  downtimeHrs: number;
  durationHrs: number;
}

export interface KnowledgeDoc {
  id: string;            // doc_id
  dbId: string;
  title: string;
  category: string;
  summary: string;
  content: string | null;
  pages: number;
  updatedOn: string;
  relatedAssets: string[];
  relatedFailureModes: string[];
  crossReferences: string[];
  usageCount: number;
  confidenceContribution: number;
  relevanceScore: number;
  tags: string[];
}

export interface ProcurementRequest {
  id: string;
  prNumber: string;
  partNumber: string;
  description: string | null;
  supplier: string | null;
  quantity: number;
  estimatedCost: number;
  priority: string;
  justification: string | null;
  status: string;
  requestedBy: string;
  createdAt: string;
}
