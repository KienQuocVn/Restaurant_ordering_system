-- Sample data for testing the QR Order System

-- Create sample restaurant owned by test owner
INSERT INTO public.restaurants (id, name, owner_id, address, phone)
VALUES (
  'rest-001',
  'Pizza Palace',
  'user-owner-1',
  '123 Main Street',
  '555-0123'
) ON CONFLICT DO NOTHING;

-- Create sample dining tables
INSERT INTO public.dining_tables (id, restaurant_id, table_number, capacity, status)
VALUES 
  ('table-001', 'rest-001', 1, 4, 'available'),
  ('table-002', 'rest-001', 2, 4, 'available'),
  ('table-003', 'rest-001', 3, 6, 'available'),
  ('table-004', 'rest-001', 4, 2, 'available'),
  ('table-005', 'rest-001', 5, 4, 'available'),
  ('table-006', 'rest-001', 6, 8, 'available')
ON CONFLICT DO NOTHING;

-- Create sample menu categories
INSERT INTO public.menu_categories (id, restaurant_id, name, description, display_order)
VALUES 
  ('cat-001', 'rest-001', 'Pizza', 'Delicious fresh pizzas', 1),
  ('cat-002', 'rest-001', 'Pasta', 'Italian pasta dishes', 2),
  ('cat-003', 'rest-001', 'Drinks', 'Beverages', 3),
  ('cat-004', 'rest-001', 'Desserts', 'Sweet treats', 4)
ON CONFLICT DO NOTHING;

-- Create sample menu items
INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, is_available, display_order)
VALUES 
  ('item-001', 'rest-001', 'cat-001', 'Margherita Pizza', 'Classic pizza with tomato and mozzarella', 12.99, true, 1),
  ('item-002', 'rest-001', 'cat-001', 'Pepperoni Pizza', 'Pizza with pepperoni and cheese', 14.99, true, 2),
  ('item-003', 'rest-001', 'cat-001', 'Vegetarian Pizza', 'Pizza with fresh vegetables', 13.99, true, 3),
  ('item-004', 'rest-001', 'cat-002', 'Spaghetti Carbonara', 'Classic Italian pasta', 11.99, true, 1),
  ('item-005', 'rest-001', 'cat-002', 'Fettuccine Alfredo', 'Creamy pasta dish', 12.99, true, 2),
  ('item-006', 'rest-001', 'cat-003', 'Coca Cola', 'Soft drink', 2.99, true, 1),
  ('item-007', 'rest-001', 'cat-003', 'Iced Tea', 'Refreshing iced tea', 2.99, true, 2),
  ('item-008', 'rest-001', 'cat-003', 'Orange Juice', 'Fresh orange juice', 3.99, true, 3),
  ('item-009', 'rest-001', 'cat-004', 'Tiramisu', 'Italian dessert', 5.99, true, 1),
  ('item-010', 'rest-001', 'cat-004', 'Chocolate Cake', 'Rich chocolate cake', 4.99, true, 2)
ON CONFLICT DO NOTHING;
