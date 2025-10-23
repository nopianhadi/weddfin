-- ============================================
-- VENA PICTURES CRM - DATABASE SCHEMA
-- Part 1: Extensions & Setup
-- ============================================
-- Created: 2025-10-23
-- Database: PostgreSQL (Supabase)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_trgm for text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'Asia/Jakarta';

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON EXTENSION "uuid-ossp" IS 'Generate UUIDs for primary keys';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for password hashing';
COMMENT ON EXTENSION "pg_trgm" IS 'Text similarity and fuzzy search';
