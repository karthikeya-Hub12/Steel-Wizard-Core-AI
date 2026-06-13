
-- EQUIPMENT
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  area VARCHAR NOT NULL,
  health_score INTEGER NOT NULL,
  risk_level VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  criticality VARCHAR NOT NULL,
  remaining_useful_life INTEGER NOT NULL,
  failure_probability INTEGER NOT NULL,
  last_maintenance_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.equipment TO anon, authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read equipment" ON public.equipment FOR SELECT USING (true);

-- ALERTS
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  severity VARCHAR NOT NULL,
  observed_symptom TEXT NOT NULL,
  root_cause TEXT,
  risk_score INTEGER NOT NULL DEFAULT 0,
  impact TEXT,
  recommended_action TEXT,
  assigned_engineer VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alerts_equipment_id_idx ON public.alerts(equipment_id);
CREATE INDEX alerts_status_idx ON public.alerts(status);
CREATE INDEX alerts_severity_idx ON public.alerts(severity);
GRANT SELECT ON public.alerts TO anon, authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read alerts" ON public.alerts FOR SELECT USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

-- SPARES
CREATE TABLE public.spares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number VARCHAR NOT NULL UNIQUE,
  description TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0,
  lead_time INTEGER NOT NULL DEFAULT 0,
  unit_cost INTEGER NOT NULL DEFAULT 0,
  supplier VARCHAR,
  criticality VARCHAR NOT NULL DEFAULT 'B',
  associated_equipment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spares TO anon, authenticated;
GRANT ALL ON public.spares TO service_role;
ALTER TABLE public.spares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read spares" ON public.spares FOR SELECT USING (true);

-- MAINTENANCE LOGS
CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  issue TEXT NOT NULL,
  diagnosis TEXT,
  action_taken TEXT,
  engineer VARCHAR,
  outcome TEXT,
  duration_hours INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX maintenance_logs_equipment_id_idx ON public.maintenance_logs(equipment_id);
GRANT SELECT ON public.maintenance_logs TO anon, authenticated;
GRANT ALL ON public.maintenance_logs TO service_role;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read maintenance_logs" ON public.maintenance_logs FOR SELECT USING (true);

-- SEED DATA
WITH ins AS (
  INSERT INTO public.equipment (equipment_id, name, area, health_score, risk_level, status, criticality, remaining_useful_life, failure_probability, last_maintenance_date) VALUES
    ('BF-03',   'Blast Furnace No.3',                'Iron Making',        68, 'CRITICAL', 'degraded',  'A',  18, 78, CURRENT_DATE - INTERVAL '42 days'),
    ('HSM-F4',  'Hot Strip Mill Stand F4',           'Hot Rolling',        61, 'CRITICAL', 'degraded',  'A',   9, 84, CURRENT_DATE - INTERVAL '67 days'),
    ('SP-CL1',  'Sinter Plant Cooler',               'Sinter Plant',       82, 'MEDIUM',   'healthy',   'B',  64, 32, CURRENT_DATE - INTERVAL '21 days'),
    ('EAF-T1',  'EAF Transformer T1',                'Steel Making',       74, 'HIGH',     'degraded',  'A',  35, 58, CURRENT_DATE - INTERVAL '88 days'),
    ('CC-02',   'Continuous Caster No.2',            'Caster',             88, 'LOW',      'healthy',   'A', 112, 18, CURRENT_DATE - INTERVAL '14 days'),
    ('CGL-01',  'Continuous Galvanizing Line',       'Cold Rolling',       91, 'LOW',      'healthy',   'B', 148,  9, CURRENT_DATE - INTERVAL '9 days'),
    ('CWP-01',  'Blast Furnace Cooling Water Pump',  'Utilities',          71, 'HIGH',     'degraded',  'A',  26, 64, CURRENT_DATE - INTERVAL '55 days')
  RETURNING id, equipment_id
)
INSERT INTO public.alerts (equipment_id, severity, observed_symptom, root_cause, risk_score, impact, recommended_action, assigned_engineer, status)
SELECT id, sev, sym, rc, score, imp, act, eng, st FROM ins JOIN (VALUES
  ('HSM-F4',  'critical', 'Bearing vibration 11.8 mm/s RMS, exceeding ISO 10816 alarm', 'Spherical roller bearing inner-race spalling, lubrication starvation', 92, 'Imminent unplanned outage; ~$8.4M lost production over 36h', 'Replace BRG-7322 within 9 days; switch to backup mill; air-freight spare', 'R. Banerjee', 'open'),
  ('HSM-F4',  'high',     'Motor current imbalance 7.2% phase B-C',                     'Roll eccentricity loading drive motor asymmetrically',                  74, 'Energy loss; accelerated bearing wear',                          'Re-grind work roll; rebalance drive train at next planned stop', 'R. Banerjee', 'open'),
  ('BF-03',   'critical', 'Tuyere #14 thermal drift +180°C in 4h',                      'Tuyere tip wear; cooling water annulus partial blockage',                89, 'Risk of tuyere burn-through and unscheduled tap stop',           'Inspect tuyere; clear cooling annulus; schedule replacement at next cast', 'A. Kapoor', 'open'),
  ('BF-03',   'high',     'Stave cooler #22 ΔT trending up 12°C over 14d',              'Scaling on cooler water side reducing heat extraction',                  68, 'Refractory hot-spot risk',                                       'Chemical clean cooler; verify water chemistry', 'A. Kapoor', 'open'),
  ('CWP-01',  'high',     'Pump discharge pressure 4.1 bar vs setpoint 4.8 bar',        'Impeller wear and incipient cavitation',                                 72, 'Reduced BF cooling capacity; bearing degradation',               'Schedule impeller inspection; verify NPSH margin', 'S. Iyer', 'open'),
  ('CWP-01',  'medium',   'Bearing vibration 6.4 mm/s, trending up',                    'Bearing wear consistent with cavitation history',                        58, 'Predicted failure within 26 days',                               'Order BRG-6314 and plan replacement at next maintenance window', 'S. Iyer', 'open'),
  ('EAF-T1',  'high',     'DGA: acetylene 4 ppm, ethylene 92 ppm (rising)',             'High-energy thermal fault, possible arcing in winding',                  76, 'Risk of transformer failure; furnace stoppage',                  'Increase DGA frequency to weekly; plan offline inspection', 'M. Pillai', 'open'),
  ('EAF-T1',  'medium',   'Top-oil temperature 78°C at 0.82 load factor',               'Cooling fan #3 underperforming; partial blockage of radiators',          51, 'Accelerated insulation ageing',                                  'Clean radiators; replace fan motor F-3', 'M. Pillai', 'acknowledged'),
  ('SP-CL1',  'medium',   'Conveyor drive amperage spikes 18%',                         'Material build-up on cooler grate causing intermittent overload',        44, 'Throughput dip; gearbox wear',                                   'Manual de-scaling at next shift handover', 'D. Roy', 'open'),
  ('SP-CL1',  'low',      'Cooling air fan vibration 3.1 mm/s',                         'Early-stage imbalance; within alarm but trending',                       28, 'Monitor only',                                                   'Re-balance at next planned outage', 'D. Roy', 'acknowledged'),
  ('CC-02',   'medium',   'Mould oscillation friction +6%',                             'Lubrication film breakdown on narrow face',                              42, 'Surface defect risk on slab',                                    'Adjust mould flux feed rate; verify oscillator', 'P. Menon', 'open'),
  ('CGL-01',  'low',      'Zinc pot temperature deviation 4°C',                         'Burner controller tuning drift',                                         18, 'Coating weight variation within tolerance',                      'Re-tune burner PID loop', 'V. Singh', 'acknowledged')
) AS a(eqid, sev, sym, rc, score, imp, act, eng, st) ON ins.equipment_id = a.eqid;

INSERT INTO public.maintenance_logs (equipment_id, issue, diagnosis, action_taken, engineer, outcome, duration_hours)
SELECT e.id, l.issue, l.diagnosis, l.action_taken, l.engineer, l.outcome, l.duration FROM public.equipment e JOIN (VALUES
  ('HSM-F4',  'Bearing temperature 88°C alarm',           'Lubrication film breakdown, low oil flow on DS bearing', 'Increased oil flow setpoint, replaced filter element', 'R. Banerjee', 'Temperature returned to 62°C; vibration trend resumed upward 21 days later', 6),
  ('HSM-F4',  'Work roll surface defects',                'Roll eccentricity 38µm out of spec',                      'Re-ground work roll and rebalanced',                    'K. Verma',    'Strip quality recovered; production restored',                                 9),
  ('BF-03',   'Stave cooler #18 leak',                    'Localised refractory wear, water leakage 0.6 m³/h',       'Isolated cooler, brick repair, returned to service',    'A. Kapoor',   'Leak stopped; refractory life extended ~6 months',                            14),
  ('BF-03',   'Tuyere #9 burn-through',                   'Cooling annulus blockage by sinter dust',                 'Replaced tuyere assembly and cleared cooling line',     'A. Kapoor',   'Restored cast continuity; updated cleaning interval',                          8),
  ('CWP-01',  'Cavitation noise reported',                'NPSH margin 0.4m below recommended',                      'Trimmed suction line; air vented; impeller inspected',  'S. Iyer',     'Noise reduced; recommended impeller replacement at next outage',               4),
  ('EAF-T1',  'High dissolved gas trend',                 'Hot spot in LV winding ~250°C estimated by IEEE C57.104', 'Reduced load 0.78 → 0.72; increased oil sampling',      'M. Pillai',   'Stabilised gas generation; awaiting outage for visual inspection',             3),
  ('SP-CL1',  'Cooler discharge belt slip',               'Belt tension low after thermal cycling',                  'Re-tensioned belt; replaced damaged scraper',           'D. Roy',      'Throughput restored to 480 t/h',                                               5),
  ('CC-02',   'Slab surface cracks',                      'Mould powder feed inconsistency',                         'Recalibrated powder feeder and adjusted flux grade',    'P. Menon',    'Defect rate down from 4.1% to 0.6%',                                           7)
) AS l(eqid, issue, diagnosis, action_taken, engineer, outcome, duration) ON e.equipment_id = l.eqid;

INSERT INTO public.spares (part_number, description, current_stock, reorder_level, lead_time, unit_cost, supplier, criticality, associated_equipment) VALUES
  ('BRG-7322', 'Spherical Roller Bearing 22322 EJ',         2,  4, 21, 1850, 'SKF India',              'A', 'HSM-F4'),
  ('BRG-6314', 'Deep Groove Bearing 6314-2RS1',             6,  6, 14,  420, 'SKF India',              'A', 'CWP-01'),
  ('TUY-BF03', 'Copper Tuyere Assembly 220mm',              3,  5, 30, 4200, 'Paul Wurth',             'A', 'BF-03'),
  ('STV-CL18', 'Cast Iron Stave Cooler #18 (refurbished)',  1,  2, 45, 9800, 'TRL Krosaki',            'A', 'BF-03'),
  ('IMP-CWP1', 'CWP-01 Impeller, 480mm, Duplex Steel',      0,  1, 35, 5600, 'KSB Pumps',              'A', 'CWP-01'),
  ('DGA-OIL',  'Transformer Oil — IEC 60296 inhibited',    18, 12,  7,   95, 'Apar Industries',        'B', 'EAF-T1'),
  ('FILT-HSM', 'Hydraulic Filter Cartridge 25µm',          12,  8, 10,  140, 'Parker Hannifin',        'B', 'HSM-F4'),
  ('BELT-SP1', 'Conveyor Belt EP800 1200mm × 12m',          1,  2, 28,  3100, 'ContiTech',             'B', 'SP-CL1'),
  ('OSC-CC2',  'Mould Oscillator Bearing Set',              4,  3, 18,   780, 'SMS Group',             'B', 'CC-02'),
  ('FAN-EAFT', 'Radiator Cooling Fan Motor 1.5kW',          2,  2, 12,   620, 'Crompton Greaves',      'B', 'EAF-T1');
