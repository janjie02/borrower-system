-- Storage bucket policies
-- Run after creating buckets in Supabase Dashboard

-- Inventory photos: public read
CREATE POLICY "Public read inventory photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'inventory-photos');

CREATE POLICY "Admin upload inventory photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inventory-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Admin update inventory photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'inventory-photos' AND auth.role() = 'authenticated');

-- Transaction photos: authenticated staff only
CREATE POLICY "Staff read transaction photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'transaction-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated upload transaction photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transaction-photos' AND auth.role() = 'authenticated');

-- Borrower photos: owner and staff only
CREATE POLICY "Staff read borrower photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'borrower-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated upload borrower photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'borrower-photos' AND auth.role() = 'authenticated');
