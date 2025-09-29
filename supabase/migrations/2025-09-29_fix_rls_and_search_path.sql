-- Migration: Fix RLS and function search_path for lints
-- Created at: 2025-09-29 11:15:00+07:00

BEGIN;

-- Enable RLS on public.project_revisions and project_revision_submissions
DO $$
BEGIN
  BEGIN
    EXECUTE 'alter table public.project_revisions enable row level security';
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    EXECUTE 'alter table public.project_revision_submissions enable row level security';
  EXCEPTION WHEN undefined_table THEN NULL; END;
END $$;

-- Simple permissive policies for development (align with existing pattern)
DO $$
BEGIN
  -- project_revisions
  BEGIN
    CREATE POLICY "dev read all" ON public.project_revisions FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "dev insert all" ON public.project_revisions FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "dev update all" ON public.project_revisions FOR UPDATE USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "dev delete all" ON public.project_revisions FOR DELETE USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- project_revision_submissions
  BEGIN
    CREATE POLICY "dev read all" ON public.project_revision_submissions FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "dev insert all" ON public.project_revision_submissions FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "dev update all" ON public.project_revision_submissions FOR UPDATE USING (true) WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    CREATE POLICY "dev delete all" ON public.project_revision_submissions FOR DELETE USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Set fixed search_path on functions flagged by linter
DO $$
BEGIN
  -- get_dashboard_stats()
  BEGIN
    EXECUTE 'ALTER FUNCTION public.get_dashboard_stats() SET search_path = public';
  EXCEPTION WHEN undefined_function THEN NULL; END;

  -- get_project_analytics(integer, text)
  BEGIN
    EXECUTE 'ALTER FUNCTION public.get_project_analytics(integer, text) SET search_path = public';
  EXCEPTION WHEN undefined_function THEN NULL; END;

  -- get_financial_summary(date, date)
  BEGIN
    EXECUTE 'ALTER FUNCTION public.get_financial_summary(date, date) SET search_path = public';
  EXCEPTION WHEN undefined_function THEN NULL; END;
END $$;

COMMIT;
