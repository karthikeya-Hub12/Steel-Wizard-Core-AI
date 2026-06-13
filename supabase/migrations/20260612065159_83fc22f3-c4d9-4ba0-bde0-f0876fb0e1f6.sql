
-- 1. SCHEMA
ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS installed_year integer,
  ADD COLUMN IF NOT EXISTS next_pm_date date,
  ADD COLUMN IF NOT EXISTS mtbf_hours integer,
  ADD COLUMN IF NOT EXISTS mttr_hours numeric,
  ADD COLUMN IF NOT EXISTS production_impact_kt numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_impact text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='equipment_equipment_id_key') THEN
    ALTER TABLE public.equipment ADD CONSTRAINT equipment_equipment_id_key UNIQUE (equipment_id);
  END IF;
END $$;

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS team_assignment text,
  ADD COLUMN IF NOT EXISTS detection_method text,
  ADD COLUMN IF NOT EXISTS failure_mode text,
  ADD COLUMN IF NOT EXISTS evidence text,
  ADD COLUMN IF NOT EXISTS corrective_actions text,
  ADD COLUMN IF NOT EXISTS preventive_actions text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE public.spares
  ADD COLUMN IF NOT EXISTS alternative_suppliers text,
  ADD COLUMN IF NOT EXISTS usage_trend text,
  ADD COLUMN IF NOT EXISTS consumption_per_year integer DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='spares_part_number_key') THEN
    ALTER TABLE public.spares ADD CONSTRAINT spares_part_number_key UNIQUE (part_number);
  END IF;
END $$;

-- 2. NEW TABLES
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  summary text NOT NULL,
  content text,
  pages integer DEFAULT 12,
  updated_on date DEFAULT CURRENT_DATE,
  related_assets text[] DEFAULT '{}',
  related_failure_modes text[] DEFAULT '{}',
  cross_references text[] DEFAULT '{}',
  usage_count integer DEFAULT 0,
  confidence_contribution numeric DEFAULT 0.10,
  relevance_score numeric DEFAULT 0.70,
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.knowledge_documents TO anon, authenticated;
GRANT UPDATE (usage_count) ON public.knowledge_documents TO anon, authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read knowledge" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Public increment usage" ON public.knowledge_documents;
CREATE POLICY "Public read knowledge" ON public.knowledge_documents FOR SELECT TO public USING (true);
CREATE POLICY "Public increment usage" ON public.knowledge_documents FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE SEQUENCE IF NOT EXISTS public.pr_seq START 1001;

CREATE TABLE IF NOT EXISTS public.procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number text UNIQUE NOT NULL,
  part_number text NOT NULL,
  description text,
  supplier text,
  quantity integer NOT NULL DEFAULT 1,
  estimated_cost numeric NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'normal',
  justification text,
  status text NOT NULL DEFAULT 'pending_approval',
  requested_by text DEFAULT 'Maintenance Planning',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.procurement_requests TO anon, authenticated;
GRANT ALL ON public.procurement_requests TO service_role;
ALTER TABLE public.procurement_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read PRs" ON public.procurement_requests;
DROP POLICY IF EXISTS "Public create PRs" ON public.procurement_requests;
CREATE POLICY "Public read PRs" ON public.procurement_requests FOR SELECT TO public USING (true);
CREATE POLICY "Public create PRs" ON public.procurement_requests FOR INSERT TO public WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  asset_id text,
  title text NOT NULL,
  body_md text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reports TO anon, authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read reports" ON public.reports;
DROP POLICY IF EXISTS "Public insert reports" ON public.reports;
CREATE POLICY "Public read reports" ON public.reports FOR SELECT TO public USING (true);
CREATE POLICY "Public insert reports" ON public.reports FOR INSERT TO public WITH CHECK (true);

-- 3. REALTIME
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='equipment') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='procurement_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.procurement_requests;
  END IF;
END $$;
