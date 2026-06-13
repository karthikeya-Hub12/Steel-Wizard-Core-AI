// Static sensor enrichment (visualization-only). Operational data is in Supabase.
import type { SensorReading } from "@/types/plant";

function trend(base: number, jitter: number, drift = 0, n = 24, seed = 1): number[] {
  return Array.from({ length: n }, (_, i) => {
    const noise = Math.sin((i + seed) * 1.7) * jitter * 0.4;
    return +(base + Math.sin(i / 2.3) * jitter + drift * (i / n) + noise).toFixed(2);
  });
}

export type AssetEnrichment = { sensors: SensorReading[] };

export const ASSET_ENRICHMENT: Record<string, AssetEnrichment> = {
  "HSM-F4": { sensors: [
    { key: "vib_ds", label: "Drive-side Vibration", unit: "mm/s", value: 11.8, baseline: 4.2, warn: 7.1, alarm: 9.0, trend: trend(10.4, 0.6, 1.2, 24, 1) },
    { key: "vib_os", label: "Operator-side Vibration", unit: "mm/s", value: 6.1, baseline: 3.8, warn: 7.1, alarm: 9.0, trend: trend(5.6, 0.5, 0.6, 24, 2) },
    { key: "brg_t", label: "Bearing Temp", unit: "°C", value: 84, baseline: 62, warn: 80, alarm: 95, trend: trend(78, 3, 8, 24, 3) },
    { key: "motor_i", label: "Motor Current", unit: "A", value: 1842, baseline: 1700, warn: 1900, alarm: 2050, trend: trend(1810, 30, 40, 24, 4) },
    { key: "oil_iso", label: "Oil ISO Code", unit: "—", value: 19, baseline: 16, warn: 18, alarm: 20, trend: trend(18, 0.5, 1, 24, 5) },
    { key: "roll_force", label: "Roll Force", unit: "kN", value: 24800, baseline: 24000, warn: 26500, alarm: 28000, trend: trend(24500, 400, 200, 24, 6) },
  ]},
  "BF-03": { sensors: [
    { key: "tuy14_dt", label: "Tuyere 14 ΔT", unit: "°C", value: 9.4, baseline: 5.8, warn: 8.0, alarm: 11.0, trend: trend(8.4, 0.4, 1.8, 24, 7) },
    { key: "tuy_avg", label: "Tuyere Avg ΔT", unit: "°C", value: 6.7, baseline: 5.8, warn: 8.0, alarm: 11.0, trend: trend(6.4, 0.3, 0.4, 24, 8) },
    { key: "top_p", label: "Top Pressure", unit: "bar", value: 2.51, baseline: 2.45, warn: 2.7, alarm: 2.9, trend: trend(2.48, 0.05, 0.05, 24, 9) },
    { key: "cb_t", label: "Cold Blast Temp", unit: "°C", value: 218, baseline: 215, warn: 240, alarm: 260, trend: trend(216, 4, 4, 24, 10) },
    { key: "stove_eff", label: "Stove Efficiency", unit: "%", value: 81.2, baseline: 84, warn: 80, alarm: 76, trend: trend(82.4, 0.8, -1.4, 24, 11) },
  ]},
  "SP-CL1": { sensors: [
    { key: "fan_vib", label: "Cooler Fan Vibration", unit: "mm/s", value: 5.2, baseline: 3.4, warn: 6.0, alarm: 8.0, trend: trend(4.8, 0.4, 0.7, 24, 12) },
    { key: "exit_t", label: "Sinter Exit Temp", unit: "°C", value: 142, baseline: 110, warn: 150, alarm: 180, trend: trend(135, 4, 10, 24, 13) },
    { key: "grate_load", label: "Grate Load", unit: "t/h", value: 410, baseline: 420, warn: 460, alarm: 490, trend: trend(415, 6, -8, 24, 14) },
  ]},
  "EAF-T1": { sensors: [
    { key: "dga_c2h2", label: "DGA C₂H₂", unit: "ppm", value: 4.0, baseline: 1.0, warn: 3.0, alarm: 5.0, trend: trend(3.2, 0.3, 1.4, 24, 15) },
    { key: "dga_h2", label: "DGA H₂", unit: "ppm", value: 92, baseline: 60, warn: 100, alarm: 150, trend: trend(82, 4, 12, 24, 16) },
    { key: "oil_t", label: "Top Oil Temp", unit: "°C", value: 78, baseline: 65, warn: 80, alarm: 90, trend: trend(74, 1.5, 3, 24, 17) },
    { key: "load", label: "Load Factor", unit: "—", value: 0.82, baseline: 0.78, warn: 0.95, alarm: 1.05, trend: trend(0.80, 0.04, 0.03, 24, 18) },
  ]},
  "CC-02": { sensors: [
    { key: "mold_osc", label: "Mould Oscillation", unit: "Hz", value: 3.02, baseline: 3.00, warn: 3.20, alarm: 3.35, trend: trend(3.01, 0.02, 0.01, 24, 19) },
    { key: "cool_flow", label: "Secondary Cool Flow", unit: "m³/h", value: 412, baseline: 420, warn: 380, alarm: 350, trend: trend(415, 4, -3, 24, 20) },
    { key: "strand_t", label: "Strand Surface T", unit: "°C", value: 988, baseline: 990, warn: 1030, alarm: 1060, trend: trend(990, 6, -1, 24, 21) },
  ]},
  "CGL-01": { sensors: [
    { key: "pot_t", label: "Zinc Pot Temp", unit: "°C", value: 462, baseline: 460, warn: 470, alarm: 480, trend: trend(461, 1.2, 1, 24, 22) },
    { key: "strip_sp", label: "Strip Speed", unit: "m/min", value: 138, baseline: 140, warn: 160, alarm: 170, trend: trend(139, 2, -1, 24, 23) },
  ]},
  "CWP-01": { sensors: [
    { key: "p_disch", label: "Discharge Pressure", unit: "bar", value: 4.1, baseline: 4.8, warn: 4.4, alarm: 4.0, trend: trend(4.3, 0.1, -0.2, 24, 24) },
    { key: "flow", label: "Flow", unit: "m³/h", value: 3120, baseline: 3300, warn: 3000, alarm: 2800, trend: trend(3180, 30, -80, 24, 25) },
    { key: "brg_v", label: "Bearing Vibration", unit: "mm/s", value: 6.4, baseline: 3.2, warn: 6.0, alarm: 8.0, trend: trend(5.6, 0.3, 0.7, 24, 26) },
  ]},
};

// Stable string hash for deterministic per-asset jitter
function strSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 100;
}

// Generic sensor set for assets that don't have explicit enrichment, so every
// equipment detail page renders condition monitoring. Values are deterministic
// per asset to avoid SSR/client drift.
export function defaultSensors(code: string, _area: string): SensorReading[] {
  const seed = strSeed(code);
  const vib = 2.8 + (seed % 18) / 10;
  const temp = 55 + (seed % 20);
  const motor = 220 + (seed % 60);
  return [
    { key: "vib", label: "Vibration RMS", unit: "mm/s", value: +vib.toFixed(2), baseline: 3.0, warn: 6.0, alarm: 8.0, trend: trend(vib, 0.4, 0.1, 24, seed) },
    { key: "tmp", label: "Surface Temperature", unit: "°C", value: temp, baseline: 55, warn: 75, alarm: 90, trend: trend(temp, 1.5, 0.4, 24, seed + 1) },
    { key: "mot", label: "Motor Current", unit: "A", value: motor, baseline: 220, warn: 280, alarm: 310, trend: trend(motor, 6, 2, 24, seed + 2) },
  ];
}

// Plant trend chart (visualization only)
export const healthTrend = Array.from({ length: 24 }, (_, i) => {
  const h = 88 + Math.sin(i / 3) * 1.5 + i * 0.15 + Math.cos(i * 1.7) * 0.6;
  const r = h + 2 + Math.sin(i * 1.3) * 0.7;
  return { t: `D-${23 - i}`, health: Math.round(h), reliability: Math.round(r) };
});

export const backlogByArea = [
  { area: "Hot Strip Mill", open: 9, closed: 22 },
  { area: "Iron Making", open: 6, closed: 17 },
  { area: "Steel Making", open: 3, closed: 14 },
  { area: "Sinter Plant", open: 4, closed: 11 },
  { area: "Caster", open: 2, closed: 18 },
  { area: "Utilities", open: 3, closed: 9 },
  { area: "Cold Rolling", open: 2, closed: 12 },
  { area: "Power Distribution", open: 1, closed: 4 },
];
