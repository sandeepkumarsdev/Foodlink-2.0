-- Seed Initial Users
INSERT INTO public.users (id, name, email, phone, user_type, college, canteen_name, is_verified, avatar_url, created_at)
VALUES 
('usr_student_alex', 'Alex Rivera', 'alex.student@campus.edu', '+1 (555) 234-5678', 'USER', 'Stanford Central Campus', null, false, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', NOW()),
('usr_student_sarah', 'Sarah Chen', 'sarah.c@campus.edu', '+1 (555) 345-6789', 'USER', 'Stanford Central Campus', null, false, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', NOW()),
('usr_canteen_chef_marco', 'Chef Marco Rossi', 'chef.marco@campus.edu', '+1 (555) 789-0123', 'COLLEGE', 'Stanford Central Campus', 'Tresidder Student Dining Hall', true, 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=200&q=80', NOW()),
('usr_canteen_priya', 'Priya Sharma (Catering Dir.)', 'priya.catering@campus.edu', '+1 (555) 890-1234', 'COLLEGE', 'UC Berkeley Campus', 'Crossroads Dining Commons', true, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', NOW()),
('usr_admin', 'Foodlink Campus Admin', 'admin@foodlink.edu', '+1 (555) 999-0000', 'ADMIN', 'System-wide Admin', null, true, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', NOW())
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Food Posts
INSERT INTO public.food_posts (
  id, college_id, canteen_id, college_name, canteen_name, food_name, description, quantity, servings_count,
  price, original_price, image_url, available_from, collection_deadline, location, status, food_safety_info, dietary_tags, temperature,
  claimed_by, claimant_name, claimant_phone, claim_code, claimed_at, collected_at, created_at
) VALUES 
('post_lemon_rice', 'col_stanford', 'cant_tresidder', 'Stanford Central Campus', 'Tresidder Student Dining Hall',
'Fragrant Lemon Herb Rice & Dal', 'Freshly prepared South Asian style lemon rice with mustard seeds, roasted cashews, and rich yellow lentil tadka. Packaged in sanitized hot-food takeout containers from lunch service.',
'20 portions', 20, 20.00, 60.00, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80',
NOW(), NOW() + INTERVAL '2 hours',
'Tresidder Memorial Union, 2nd Floor Dining Counter #3 (Ask for Chef Marco)', 'AVAILABLE',
'Prepared at 11:30 AM today in our certified commercial kitchen. Kept in warm holding at 65°C. Safe to consume within 3 hours or refrigerate immediately.',
'["Vegetarian", "Vegan", "Gluten-Free", "Halal-Friendly"]'::jsonb, 'HOT',
null, null, null, null, null, null, NOW()),
('post_artisan_sandwiches', 'col_stanford', 'cant_tresidder', 'Stanford Central Campus', 'Tresidder Student Dining Hall',
'Gourmet Baguette Sandwiches & Salad Box', 'Assortment of freshly assembled sandwiches from today''s academic conference catering: Roasted Mediterranean Veggie & Pesto, Smoked Turkey Breast with Swiss, and Caprese Ciabatta.',
'15 meal boxes', 15, 25.00, 75.00, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
NOW(), NOW() + INTERVAL '3.5 hours',
'Faculty Club Catering Dispatch, Ground Floor Service Bay', 'AVAILABLE',
'Sealed individually in compostable boxes with ice-pack chilled transport. Consume by tonight.',
'["Vegetarian Option", "Halal-Friendly"]'::jsonb, 'COLD',
null, null, null, null, null, null, NOW())
ON CONFLICT (id) DO NOTHING;
