-- Borrowing Management System - Initial Schema
-- Run in Supabase SQL Editor or via Supabase CLI

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('borrower', 'staff', 'assistant_admin', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'disabled', 'pending_verification');
CREATE TYPE borrower_account_type AS ENUM ('student', 'teacher');
CREATE TYPE invitation_type AS ENUM ('borrower', 'staff');
CREATE TYPE staff_role AS ENUM ('staff', 'assistant_admin');
CREATE TYPE inventory_status AS ENUM ('available', 'borrowed', 'damaged', 'lost', 'archived');
CREATE TYPE item_condition AS ENUM ('good', 'minor_damage', 'damaged', 'lost');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'returned', 'cancelled', 'overdue');
CREATE TYPE return_condition AS ENUM ('good', 'minor_damage', 'damaged', 'lost');
CREATE TYPE return_timing AS ENUM ('very_early', 'early', 'on_time', 'late_1', 'late_2_3', 'late_4_7', 'late_8_plus');
CREATE TYPE photo_retention AS ENUM ('90', '180', '365', 'forever');

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'borrower',
  account_status account_status NOT NULL DEFAULT 'pending_verification',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(account_status);

-- Borrower profiles
CREATE TABLE borrower_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  account_type borrower_account_type NOT NULL,
  id_code TEXT NOT NULL,
  year TEXT,
  section TEXT,
  phone TEXT,
  credit_score INTEGER NOT NULL DEFAULT 500 CHECK (credit_score >= 0 AND credit_score <= 1000),
  photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_borrower_id_code ON borrower_profiles(id_code);
CREATE INDEX idx_borrower_account_type ON borrower_profiles(account_type);
CREATE INDEX idx_borrower_credit ON borrower_profiles(credit_score);

-- Staff profiles
CREATE TABLE staff_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registration invitations
CREATE TABLE registration_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  invitation_type invitation_type NOT NULL,
  staff_role staff_role,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES profiles(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_role_required CHECK (
    (invitation_type = 'staff' AND staff_role IS NOT NULL) OR
    (invitation_type = 'borrower' AND staff_role IS NULL)
  )
);

CREATE INDEX idx_invitations_token ON registration_invitations(token);
CREATE INDEX idx_invitations_email ON registration_invitations(email);
CREATE INDEX idx_invitations_expires ON registration_invitations(expires_at);

-- Guest profiles
CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  account_type borrower_account_type NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_code TEXT NOT NULL,
  year TEXT,
  section TEXT,
  photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guest_email ON guest_profiles(email);
CREATE INDEX idx_guest_id_code ON guest_profiles(id_code);
CREATE INDEX idx_guest_phone ON guest_profiles(phone);

-- Inventory categories
CREATE TABLE inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SKU sequence for auto-generation
CREATE SEQUENCE sku_sequence START 1;

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES inventory_categories(id),
  description TEXT,
  photo_path TEXT,
  sku_prefix TEXT NOT NULL CHECK (sku_prefix ~ '^[A-Za-z0-9]{1,5}$'),
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT NOT NULL UNIQUE,
  quantity_total INTEGER NOT NULL DEFAULT 0 CHECK (quantity_total >= 0),
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_borrowed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_borrowed >= 0),
  quantity_damaged INTEGER NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0),
  quantity_lost INTEGER NOT NULL DEFAULT 0 CHECK (quantity_lost >= 0),
  status inventory_status NOT NULL DEFAULT 'available',
  track_individual BOOLEAN NOT NULL DEFAULT FALSE,
  specifications JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT quantity_integrity CHECK (
    quantity_total = quantity_available + quantity_borrowed + quantity_damaged + quantity_lost
  )
);

CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_barcode ON inventory(barcode);
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_category ON inventory(category_id);
CREATE INDEX idx_inventory_name ON inventory(name);

-- Individual inventory items
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT NOT NULL UNIQUE,
  status inventory_status NOT NULL DEFAULT 'available',
  condition item_condition NOT NULL DEFAULT 'good',
  current_borrower_id UUID REFERENCES profiles(id),
  current_request_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_inventory ON inventory_items(inventory_id);
CREATE INDEX idx_inventory_items_barcode ON inventory_items(barcode);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);

-- Request number sequence
CREATE SEQUENCE request_sequence START 1;

-- Borrow requests
CREATE TABLE borrow_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT NOT NULL UNIQUE,
  borrower_id UUID REFERENCES profiles(id),
  guest_profile_id UUID REFERENCES guest_profiles(id),
  is_guest BOOLEAN NOT NULL DEFAULT FALSE,
  status request_status NOT NULL DEFAULT 'pending',
  borrow_date DATE,
  due_date DATE,
  photo_path TEXT,
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT borrower_or_guest CHECK (
    (is_guest = TRUE AND guest_profile_id IS NOT NULL AND borrower_id IS NULL) OR
    (is_guest = FALSE AND borrower_id IS NOT NULL AND guest_profile_id IS NULL)
  )
);

CREATE INDEX idx_requests_number ON borrow_requests(request_number);
CREATE INDEX idx_requests_status ON borrow_requests(status);
CREATE INDEX idx_requests_borrower ON borrow_requests(borrower_id);
CREATE INDEX idx_requests_guest ON borrow_requests(guest_profile_id);
CREATE INDEX idx_requests_due_date ON borrow_requests(due_date);
CREATE INDEX idx_requests_created ON borrow_requests(created_at DESC);

-- Borrow request items
CREATE TABLE borrow_request_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_items_request ON borrow_request_items(request_id);
CREATE INDEX idx_request_items_inventory ON borrow_request_items(inventory_id);

-- Request status history
CREATE TABLE request_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
  from_status request_status,
  to_status request_status NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_request ON request_status_history(request_id);

-- Returns
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES borrow_requests(id),
  request_item_id UUID NOT NULL REFERENCES borrow_request_items(id),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  inventory_item_id UUID REFERENCES inventory_items(id),
  return_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  condition return_condition NOT NULL DEFAULT 'good',
  notes TEXT,
  return_timing return_timing,
  days_late INTEGER NOT NULL DEFAULT 0,
  processed_by UUID NOT NULL REFERENCES profiles(id),
  credit_change INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_returns_request ON returns(request_id);
CREATE INDEX idx_returns_inventory ON returns(inventory_id);
CREATE INDEX idx_returns_date ON returns(return_date DESC);

-- Credit history
CREATE TABLE credit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id UUID NOT NULL REFERENCES borrower_profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  behavior TEXT NOT NULL,
  credit_change INTEGER NOT NULL,
  new_score INTEGER NOT NULL CHECK (new_score >= 0 AND new_score <= 1000),
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_history_borrower ON credit_history(borrower_id);
CREATE INDEX idx_credit_history_created ON credit_history(created_at DESC);

-- Activity logs (immutable)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id),
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_actor ON activity_logs(actor_id);
CREATE INDEX idx_activity_action ON activity_logs(action);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_target ON activity_logs(target_type, target_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);

-- System settings
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit trail for important field changes
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_record ON audit_trail(table_name, record_id);

-- Initial admin setup token (single-use, for bootstrapping first admin)
CREATE TABLE setup_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default system settings
INSERT INTO system_settings (key, value) VALUES
  ('organization_name', '"Borrowing Management System"'),
  ('logo_url', '""'),
  ('default_borrowing_days', '7'),
  ('invitation_expiration_hours', '72'),
  ('photo_retention_days', '"180"'),
  ('credit_settings', '{
    "very_early_return": 20,
    "early_return": 10,
    "on_time_return": 3,
    "late_1_day": -10,
    "late_2_3_days": -25,
    "late_4_7_days": -50,
    "late_8_plus_days": -80,
    "minor_damage": -50,
    "moderate_damage": -100,
    "severe_damage": -150,
    "lost_item": -200,
    "min_score": 0,
    "max_score": 1000,
    "default_score": 500,
    "rolling_weight_recent": 0.7,
    "rolling_weight_historical": 0.3
  }'),
  ('email_notifications', '{
    "invitation": true,
    "verification": true,
    "password_reset": true,
    "request_submitted": true,
    "request_approved": true,
    "request_rejected": true,
    "due_soon": true,
    "overdue": true,
    "return_confirmation": true
  }'),
  ('due_soon_days', '1');

-- Default categories
INSERT INTO inventory_categories (name, slug, description) VALUES
  ('Sports Equipment', 'sports-equipment', 'Balls, rackets, and sports gear'),
  ('Electronics', 'electronics', 'Cameras, projectors, and devices'),
  ('Books & Materials', 'books-materials', 'Books, lab materials, and supplies'),
  ('Tools & Equipment', 'tools-equipment', 'Tools and general equipment'),
  ('Other', 'other', 'Miscellaneous items');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER borrower_profiles_updated_at BEFORE UPDATE ON borrower_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER borrow_requests_updated_at BEFORE UPDATE ON borrow_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
