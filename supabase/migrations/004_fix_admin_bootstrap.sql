-- Fix: allow creating the first admin account during initial setup
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Bootstrap: allow first admin when no admin exists yet
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
