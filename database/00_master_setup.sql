-- ============================================
-- VENA PICTURES CRM - MASTER DATABASE SETUP
-- ============================================
-- Created: 2025-10-23
-- Database: PostgreSQL (Supabase)
-- Total Tables: 26
-- ============================================

-- EXECUTION ORDER:
-- Run these files in sequence:

-- 1. Extensions & Setup
\i 01_create_extensions.sql

-- 2. Users & Authentication
\i 02_create_users_table.sql

-- 3. Profiles & Settings
\i 03_create_profiles_table.sql

-- 4. Clients & Leads
\i 04_create_clients_leads_tables.sql

-- 5. Packages & Add-ons
\i 05_create_packages_addons_tables.sql

-- 6. Projects (Main Table)
\i 06_create_projects_table.sql

-- 7. Financial Tables
\i 07_create_financial_tables.sql

-- 8. Team & Freelancer Management
\i 08_create_team_tables.sql

-- 9. Other Tables (Contracts, SOPs, Feedback, Gallery, Notifications)
\i 09_create_other_tables.sql

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all tables created
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check table row counts
SELECT 
    schemaname,
    tablename,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check all foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- DATABASE STATISTICS
-- ============================================

-- Total database size
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'VENA PICTURES CRM - DATABASE SETUP COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total Tables: 26';
    RAISE NOTICE 'Total Views: 4';
    RAISE NOTICE 'Total Functions: 8+';
    RAISE NOTICE 'Total Triggers: 20+';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Review sample data';
    RAISE NOTICE '2. Configure Supabase Auth';
    RAISE NOTICE '3. Set up Row Level Security (RLS)';
    RAISE NOTICE '4. Configure Realtime subscriptions';
    RAISE NOTICE '5. Test application connection';
    RAISE NOTICE '============================================';
END $$;
