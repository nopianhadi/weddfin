-- Migration: Enable RLS and Realtime Publication for core tables
-- Created at: 2025-09-29 13:05:00+07:00

BEGIN;

-- List of tables to enable RLS and Realtime on
DO $$
DECLARE
    t_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'projects', 'clients', 'team_members', 'transactions', 'contracts', 'sops',
        'cards', 'pockets', 'team_payment_records', 'reward_ledger_entries'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_update
    LOOP
        -- 1. Enable Row Level Security
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);

        -- 2. Create permissive policies ONLY IF they don't already exist (idempotent)
        -- NOTE: For production, consider more restrictive policies.
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t_name AND policyname = 'Allow authenticated read access'
        ) THEN
            EXECUTE format('CREATE POLICY "Allow authenticated read access" ON public.%I FOR SELECT TO authenticated USING (true);', t_name);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t_name AND policyname = 'Allow authenticated insert access'
        ) THEN
            EXECUTE format('CREATE POLICY "Allow authenticated insert access" ON public.%I FOR INSERT TO authenticated WITH CHECK (true);', t_name);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t_name AND policyname = 'Allow authenticated update access'
        ) THEN
            EXECUTE format('CREATE POLICY "Allow authenticated update access" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);', t_name);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t_name AND policyname = 'Allow authenticated delete access'
        ) THEN
            EXECUTE format('CREATE POLICY "Allow authenticated delete access" ON public.%I FOR DELETE TO authenticated USING (true);', t_name);
        END IF;

    END LOOP;
END;
$$;

-- 3. Add tables to the supabase_realtime publication (idempotent)
DO $$
DECLARE
    t_name TEXT;
    tables_to_publish TEXT[] := ARRAY[
        'projects', 'clients', 'team_members', 'transactions', 'contracts', 'sops',
        'cards', 'pockets', 'team_payment_records', 'reward_ledger_entries'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_publish LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = t_name
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t_name);
        END IF;
    END LOOP;
END;
$$;

COMMIT;
