-- RLS Policies for Borrowing Management System

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_tokens ENABLE ROW LEVEL SECURITY;

-- Helper functions for role checks
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND account_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('staff', 'assistant_admin', 'admin')
    AND account_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_assistant_admin_or_above()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('assistant_admin', 'admin')
    AND account_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND account_status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Staff can view all profiles" ON profiles
  FOR SELECT USING (is_staff_or_above());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admin can insert profiles" ON profiles
  FOR INSERT WITH CHECK (is_admin() OR auth.uid() = id);

-- BORROWER PROFILES policies
CREATE POLICY "Borrowers view own profile" ON borrower_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Staff view all borrower profiles" ON borrower_profiles
  FOR SELECT USING (is_staff_or_above());

CREATE POLICY "Borrowers update own profile" ON borrower_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Borrowers insert own profile" ON borrower_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin update borrower profiles" ON borrower_profiles
  FOR UPDATE USING (is_admin());

-- STAFF PROFILES policies
CREATE POLICY "Staff view own profile" ON staff_profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admin manage staff profiles" ON staff_profiles
  FOR ALL USING (is_admin());

-- REGISTRATION INVITATIONS policies
CREATE POLICY "Admin manage invitations" ON registration_invitations
  FOR ALL USING (is_admin());

CREATE POLICY "Anyone can validate invitation by token" ON registration_invitations
  FOR SELECT USING (used_at IS NULL AND expires_at > NOW());

-- GUEST PROFILES - no direct client access (server only via service role)
CREATE POLICY "Staff view guest profiles" ON guest_profiles
  FOR SELECT USING (is_staff_or_above());

CREATE POLICY "No direct guest insert" ON guest_profiles
  FOR INSERT WITH CHECK (FALSE);

-- INVENTORY CATEGORIES
CREATE POLICY "Anyone authenticated can view categories" ON inventory_categories
  FOR SELECT USING (auth.uid() IS NOT NULL OR TRUE);

CREATE POLICY "Public can view categories" ON inventory_categories
  FOR SELECT USING (TRUE);

CREATE POLICY "Admin manage categories" ON inventory_categories
  FOR ALL USING (is_admin());

-- INVENTORY
CREATE POLICY "Public view available inventory" ON inventory
  FOR SELECT USING (status != 'archived' OR is_staff_or_above());

CREATE POLICY "Admin manage inventory" ON inventory
  FOR ALL USING (is_admin());

CREATE POLICY "Assistant admin view inventory" ON inventory
  FOR SELECT USING (is_assistant_admin_or_above());

-- INVENTORY ITEMS
CREATE POLICY "Staff view inventory items" ON inventory_items
  FOR SELECT USING (is_staff_or_above() OR TRUE);

CREATE POLICY "Admin manage inventory items" ON inventory_items
  FOR ALL USING (is_admin());

-- BORROW REQUESTS
CREATE POLICY "Borrowers view own requests" ON borrow_requests
  FOR SELECT USING (borrower_id = auth.uid());

CREATE POLICY "Staff view all requests" ON borrow_requests
  FOR SELECT USING (is_staff_or_above());

CREATE POLICY "Borrowers create own requests" ON borrow_requests
  FOR INSERT WITH CHECK (borrower_id = auth.uid() AND is_guest = FALSE);

CREATE POLICY "Staff update requests" ON borrow_requests
  FOR UPDATE USING (is_staff_or_above());

-- BORROW REQUEST ITEMS
CREATE POLICY "View request items with request access" ON borrow_request_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM borrow_requests br
      WHERE br.id = request_id
      AND (br.borrower_id = auth.uid() OR is_staff_or_above())
    )
  );

CREATE POLICY "Borrowers insert request items" ON borrow_request_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM borrow_requests br
      WHERE br.id = request_id AND br.borrower_id = auth.uid()
    )
  );

CREATE POLICY "Staff manage request items" ON borrow_request_items
  FOR ALL USING (is_staff_or_above());

-- REQUEST STATUS HISTORY
CREATE POLICY "View status history with request access" ON request_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM borrow_requests br
      WHERE br.id = request_id
      AND (br.borrower_id = auth.uid() OR is_staff_or_above())
    )
  );

CREATE POLICY "Staff insert status history" ON request_status_history
  FOR INSERT WITH CHECK (is_staff_or_above());

-- RETURNS
CREATE POLICY "Staff manage returns" ON returns
  FOR ALL USING (is_staff_or_above());

CREATE POLICY "Borrowers view own returns" ON returns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM borrow_requests br
      WHERE br.id = request_id AND br.borrower_id = auth.uid()
    )
  );

-- CREDIT HISTORY
CREATE POLICY "Borrowers view own credit history" ON credit_history
  FOR SELECT USING (borrower_id = auth.uid());

CREATE POLICY "Staff view all credit history" ON credit_history
  FOR SELECT USING (is_staff_or_above());

CREATE POLICY "Staff insert credit history" ON credit_history
  FOR INSERT WITH CHECK (is_staff_or_above());

-- ACTIVITY LOGS
CREATE POLICY "Admin view activity logs" ON activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Staff insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (is_staff_or_above() OR auth.uid() IS NOT NULL);

CREATE POLICY "No update activity logs" ON activity_logs
  FOR UPDATE USING (FALSE);

CREATE POLICY "No delete activity logs" ON activity_logs
  FOR DELETE USING (FALSE);

-- NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- SYSTEM SETTINGS
CREATE POLICY "Staff read settings" ON system_settings
  FOR SELECT USING (is_staff_or_above());

CREATE POLICY "Admin manage settings" ON system_settings
  FOR ALL USING (is_admin());

-- AUDIT TRAIL
CREATE POLICY "Admin view audit trail" ON audit_trail
  FOR SELECT USING (is_admin());

CREATE POLICY "System insert audit trail" ON audit_trail
  FOR INSERT WITH CHECK (is_staff_or_above());

-- SETUP TOKENS
CREATE POLICY "No client access setup tokens" ON setup_tokens
  FOR ALL USING (FALSE);

-- Handle new user signup - create profile trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, account_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'borrower'),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN 'active'::account_status ELSE 'pending_verification'::account_status END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
BEGIN
  seq_val := nextval('request_sequence');
  RETURN 'REQ-' || LPAD(seq_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate SKU
CREATE OR REPLACE FUNCTION generate_sku(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
  new_sku TEXT;
BEGIN
  seq_val := nextval('sku_sequence');
  new_sku := UPPER(prefix) || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- Function to check and mark overdue requests
CREATE OR REPLACE FUNCTION mark_overdue_requests()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE borrow_requests
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'active'
    AND due_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;

  INSERT INTO request_status_history (request_id, from_status, to_status, notes)
  SELECT id, 'active', 'overdue', 'Automatically marked overdue'
  FROM borrow_requests
  WHERE status = 'overdue'
  AND due_date < CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM request_status_history rsh
    WHERE rsh.request_id = borrow_requests.id
    AND rsh.to_status = 'overdue'
    AND rsh.created_at > NOW() - INTERVAL '1 day'
  );

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent negative inventory on update
CREATE OR REPLACE FUNCTION check_inventory_quantities()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_available < 0 OR NEW.quantity_borrowed < 0 OR
     NEW.quantity_damaged < 0 OR NEW.quantity_lost < 0 THEN
    RAISE EXCEPTION 'Inventory quantities cannot be negative';
  END IF;
  IF NEW.quantity_total != NEW.quantity_available + NEW.quantity_borrowed +
     NEW.quantity_damaged + NEW.quantity_lost THEN
    RAISE EXCEPTION 'Inventory quantity totals do not match';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_quantity_check
  BEFORE INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION check_inventory_quantities();

-- Prevent role escalation by non-admins
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT is_admin() THEN
      RAISE EXCEPTION 'Only administrators can change user roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();
