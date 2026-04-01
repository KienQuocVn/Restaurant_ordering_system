INSERT INTO users (
  id,
  email,
  password_hash,
  full_name,
  role,
  restaurant_id,
  is_active,
  permissions_json,
  created_at,
  updated_at
) VALUES
  (
    'user_owner_demo',
    'owner@example.com',
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    'Demo Owner',
    'owner',
    'rest_demo_001',
    TRUE,
    '{"manage_menu": true, "manage_categories": true, "manage_staff": true, "manage_tables": true, "view_dashboard": true, "manage_orders": true, "process_payments": true}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'user_staff_demo',
    'staff@example.com',
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    'Demo Staff',
    'staff',
    'rest_demo_001',
    TRUE,
    '{"manage_menu": false, "manage_categories": false, "manage_staff": false, "manage_tables": false, "view_dashboard": false, "manage_orders": true, "process_payments": true}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO restaurants (id, name, address, owner_id, created_at, updated_at)
VALUES (
  'rest_demo_001',
  'Demo QR Restaurant',
  '123 Demo Street',
  'user_owner_demo',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

UPDATE users
SET restaurant_id = 'rest_demo_001', updated_at = NOW()
WHERE id IN ('user_owner_demo', 'user_staff_demo');

INSERT INTO tables (id, restaurant_id, table_number, zone, capacity, guest_count, status, qr_token, created_at, updated_at)
VALUES
  ('table_demo_001', 'rest_demo_001', 1, 'Tang 1', 4, 0, 'empty', 'qrtoken_demo_001', NOW(), NOW()),
  ('table_demo_002', 'rest_demo_001', 2, 'Tang 1', 4, 0, 'empty', 'qrtoken_demo_002', NOW(), NOW()),
  ('table_demo_003', 'rest_demo_001', 3, 'VIP', 6, 0, 'empty', 'qrtoken_demo_003', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, restaurant_id, name, sort_order, is_active, created_at, updated_at)
VALUES
  ('cat_pizza_demo', 'rest_demo_001', 'Pizza', 1, TRUE, NOW(), NOW()),
  ('cat_drinks_demo', 'rest_demo_001', 'Drinks', 2, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (
  id,
  restaurant_id,
  category_id,
  name,
  description,
  price,
  image_url,
  is_available,
  display_order,
  options_json,
  created_at,
  updated_at
) VALUES
  (
    'item_margherita_demo',
    'rest_demo_001',
    'cat_pizza_demo',
    'Margherita Pizza',
    'Classic pizza with tomato and mozzarella',
    129000,
    '',
    TRUE,
    1,
    '[{"name":"Size","values":[{"label":"M","price":0},{"label":"L","price":20000}]}]'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'item_pepperoni_demo',
    'rest_demo_001',
    'cat_pizza_demo',
    'Pepperoni Pizza',
    'Pepperoni and cheese',
    149000,
    '',
    TRUE,
    2,
    '[]'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'item_iced_tea_demo',
    'rest_demo_001',
    'cat_drinks_demo',
    'Iced Tea',
    'Refreshing iced tea',
    29000,
    '',
    TRUE,
    3,
    '[{"name":"Sugar","values":[{"label":"100%","price":0},{"label":"50%","price":0},{"label":"0%","price":0}]}]'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO vouchers (
  id,
  restaurant_id,
  code,
  name,
  type,
  value,
  min_order_value,
  max_discount_amount,
  is_active,
  created_at,
  updated_at
) VALUES
  ('voucher_welcome_demo', 'rest_demo_001', 'WELCOME10', 'Giam 10% hoa don', 'percent', 10, 100000, 50000, TRUE, NOW(), NOW()),
  ('voucher_coffee_demo', 'rest_demo_001', 'COFFEE25K', 'Giam 25.000 VND', 'fixed', 25000, 120000, 25000, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
