-- FIX: "Database error creating new user" during admin setup
-- Run this entire file in Supabase SQL Editor

-- 1. Fix the auth trigger (safe role handling + search_path)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role user_role := 'borrower';
  meta_role text;
BEGIN
  meta_role := NEW.raw_user_meta_data->>'role';
  IF meta_role IN ('borrower', 'staff', 'assistant_admin', 'admin') THEN
    assigned_role := meta_role::user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    assigned_role,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL
      THEN 'active'::account_status
      ELSE 'pending_verification'::account_status
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RAISE;
END;
$$;

-- 2. Fix first-admin bootstrap
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NEW.role = 'admin' AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE role = 'admin' AND id != NEW.id
    ) THEN
      RETURN NEW;
    END IF;
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Clean up failed signup attempts for your email (safe to re-run)
DELETE FROM auth.users WHERE email = 'janjie02123@gmail.com';

-- 4. Fresh setup token
INSERT INTO setup_tokens (token, expires_at)
VALUES (encode(gen_random_bytes(32), 'hex'), NOW() + INTERVAL '24 hours')
RETURNING token;
