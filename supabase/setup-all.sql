-- Run this ONCE in Supabase SQL Editor after creating your project
-- Combines all migrations for easy setup

-- ============================================================
-- PART 1: INITIAL SCHEMA (from 001_initial_schema.sql)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('borrower', 'staff', 'assistant_admin', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('active', 'inactive', 'disabled', 'pending_verification');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE borrower_account_type AS ENUM ('student', 'teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE invitation_type AS ENUM ('borrower', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('staff', 'assistant_admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE inventory_status AS ENUM ('available', 'borrowed', 'damaged', 'lost', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE item_condition AS ENUM ('good', 'minor_damage', 'damaged', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'returned', 'cancelled', 'overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE return_condition AS ENUM ('good', 'minor_damage', 'damaged', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE return_timing AS ENUM ('very_early', 'early', 'on_time', 'late_1', 'late_2_3', 'late_4_7', 'late_8_plus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Note: For full setup, run the three migration files in order via Supabase SQL Editor:
-- 1. supabase/migrations/001_initial_schema.sql
-- 2. supabase/migrations/002_rls_policies.sql
-- 3. supabase/migrations/003_storage_policies.sql
-- Then run: supabase/seed.sql (optional)

-- Create first admin token (run AFTER migrations):
-- INSERT INTO setup_tokens (token, expires_at)
-- VALUES (encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '24 hours')
-- RETURNING token;
