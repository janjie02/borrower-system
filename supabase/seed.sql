-- Development seed data (optional, run after migrations)
-- DO NOT run in production

-- Note: Users must be created via Supabase Auth or setup token
-- This seed adds sample inventory only

INSERT INTO inventory (name, category_id, description, sku_prefix, sku, barcode, quantity_total, quantity_available, quantity_borrowed, quantity_damaged, quantity_lost, status, track_individual)
SELECT
  'Basketball',
  (SELECT id FROM inventory_categories WHERE slug = 'sports-equipment'),
  'Official size 7 basketball for indoor/outdoor use',
  'BAS',
  'BAS-000001',
  'BAS000001',
  10, 10, 0, 0, 0, 'available', false
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'BAS-000001');

INSERT INTO inventory (name, category_id, description, sku_prefix, sku, barcode, quantity_total, quantity_available, quantity_borrowed, quantity_damaged, quantity_lost, status, track_individual)
SELECT
  'Volleyball',
  (SELECT id FROM inventory_categories WHERE slug = 'sports-equipment'),
  'Standard volleyball for gym use',
  'VOL',
  'VOL-000001',
  'VOL000001',
  8, 8, 0, 0, 0, 'available', false
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'VOL-000001');

INSERT INTO inventory (name, category_id, description, sku_prefix, sku, barcode, quantity_total, quantity_available, quantity_borrowed, quantity_damaged, quantity_lost, status, track_individual)
SELECT
  'Canon Camera',
  (SELECT id FROM inventory_categories WHERE slug = 'electronics'),
  'Canon DSLR camera with lens kit',
  'CAM',
  'CAM-000001',
  'CAM000001',
  5, 5, 0, 0, 0, 'available', true
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'CAM-000001');

INSERT INTO inventory (name, category_id, description, sku_prefix, sku, barcode, quantity_total, quantity_available, quantity_borrowed, quantity_damaged, quantity_lost, status, track_individual)
SELECT
  'Projector',
  (SELECT id FROM inventory_categories WHERE slug = 'electronics'),
  'HD multimedia projector',
  'PRO',
  'PRO-000001',
  'PRO000001',
  3, 3, 0, 0, 0, 'available', false
WHERE NOT EXISTS (SELECT 1 FROM inventory WHERE sku = 'PRO-000001');

-- Individual items for Canon Camera
INSERT INTO inventory_items (inventory_id, sku, barcode, status, condition)
SELECT i.id, 'CAM-000001-001', 'CAM000001001', 'available', 'good'
FROM inventory i WHERE i.sku = 'CAM-000001'
AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE sku = 'CAM-000001-001');

INSERT INTO inventory_items (inventory_id, sku, barcode, status, condition)
SELECT i.id, 'CAM-000001-002', 'CAM000001002', 'available', 'good'
FROM inventory i WHERE i.sku = 'CAM-000001'
AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE sku = 'CAM-000001-002');

INSERT INTO inventory_items (inventory_id, sku, barcode, status, condition)
SELECT i.id, 'CAM-000001-003', 'CAM000001003', 'available', 'good'
FROM inventory i WHERE i.sku = 'CAM-000001'
AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE sku = 'CAM-000001-003');

INSERT INTO inventory_items (inventory_id, sku, barcode, status, condition)
SELECT i.id, 'CAM-000001-004', 'CAM000001004', 'available', 'good'
FROM inventory i WHERE i.sku = 'CAM-000001'
AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE sku = 'CAM-000001-004');

INSERT INTO inventory_items (inventory_id, sku, barcode, status, condition)
SELECT i.id, 'CAM-000001-005', 'CAM000001005', 'available', 'good'
FROM inventory i WHERE i.sku = 'CAM-000001'
AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE sku = 'CAM-000001-005');
