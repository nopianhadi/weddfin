-- Migration: Add custom_costs JSONB to projects
-- Created at: 2025-09-29 10:53:00+07:00

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='projects' AND column_name='custom_costs'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN custom_costs jsonb;
  END IF;
END$$;

COMMIT;
