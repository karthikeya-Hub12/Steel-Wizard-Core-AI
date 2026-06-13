import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

let lastSyncMs = Date.now();

export function useAlertsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const channel = supabase
      .channel("plant-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, (payload) => {
        lastSyncMs = Date.now();
        qc.invalidateQueries({ queryKey: ["plant","alerts"] });
        qc.invalidateQueries({ queryKey: ["plant","equipment"] });
        if (payload.eventType === "INSERT") {
          const row = payload.new as { severity?: string; observed_symptom?: string };
          const sev = (row.severity ?? "").toLowerCase();
          if (sev === "critical" || sev === "high") {
            toast.error(`[${sev.toUpperCase()}] ${row.observed_symptom ?? "New abnormality detected"}`, {
              description: "Live plant telemetry · Open Alerts to review.", duration: 8000,
            });
          }
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, () => {
        lastSyncMs = Date.now();
        qc.invalidateQueries({ queryKey: ["plant","equipment"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "procurement_requests" }, () => {
        lastSyncMs = Date.now();
        qc.invalidateQueries({ queryKey: ["plant","procurement"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc]);
}

// Tiny "last sync" clock for sidebar / overview. Returns "Live · HH:mm UTC".
export function useRealtimeStatus(): { label: string; live: boolean } {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 15_000);
    return () => clearInterval(i);
  }, []);
  const ageS = (Date.now() - lastSyncMs) / 1000;
  void tick;
  const d = new Date(lastSyncMs);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return { label: `Last sync ${hh}:${mm} UTC`, live: ageS < 120 };
}
