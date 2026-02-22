-- ============================================
-- Snook OS Seed Data v2
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================

-- ── 1. Default Club ──────────────────────────
INSERT INTO public.clubs (id, name, settings) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Snook OS Club',
  '{
    "isOpen": true,
    "upiQrCode": "",
    "reminderTemplate": "Hi {name}, your pending amount at Snook OS is ₹{amount}. Please clear it soon. Thanks!",
    "showMembershipBadge": true,
    "gstEnabled": false,
    "gstRate": 18,
    "timeFormat": "12h",
    "timezone": "Asia/Kolkata"
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ── 2. Global Table Pricing ──────────────────
INSERT INTO public.table_pricing
  (club_id, per_hour, per_minute, per_frame, peak_hour_rate, off_peak_rate, peak_hours_start, peak_hours_end, default_billing_mode)
VALUES
  ('00000000-0000-0000-0000-000000000001', 200, 4, 50, 300, 150, '18:00', '23:00', 'hourly')
ON CONFLICT (club_id) DO NOTHING;

-- ── 3. Tables ────────────────────────────────
-- Tables 1-5, 7, 9 use global pricing (Snooker/Pool)
-- Table 6, 10 have custom pricing (8-Ball)
INSERT INTO public.tables
  (club_id, table_number, table_name, table_type, status, billing_mode, use_global_pricing, custom_pricing)
VALUES
  ('00000000-0000-0000-0000-000000000001', 1,  'Table 01', 'Snooker', 'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 2,  'Table 02', 'Pool',    'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 3,  'Table 03', 'Snooker', 'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 4,  'Table 04', 'Pool',    'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 5,  'Table 05', 'Snooker', 'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 6,  'Table 06', '8-Ball',  'free', 'hourly',    false, '{"perHour": 250, "perMinute": 5, "perFrame": 60, "peakHourRate": 350}'::jsonb),
  ('00000000-0000-0000-0000-000000000001', 7,  'Table 07', 'Snooker', 'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 8,  'Table 08', 'Pool',    'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 9,  'Table 09', 'Snooker', 'free', 'hourly',    true,  NULL),
  ('00000000-0000-0000-0000-000000000001', 10, 'Table 10', '8-Ball',  'free', 'per_frame', false, '{"perHour": 180, "perMinute": 3, "perFrame": 40}'::jsonb)
ON CONFLICT (club_id, table_number) DO NOTHING;

-- ── 4. Members ───────────────────────────────
-- phone stored as entered by admin (WhatsApp normalizer handles international format)
INSERT INTO public.members
  (club_id, name, avatar, membership_type, credit_balance, games_played, wins, losses, phone, email, is_guest, trophies)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'RS', 'Gold',    0,       156, 98,  58, '+91 98765 43210', 'rahul@email.com',  false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Amit Patel',   'AP', 'Silver',  -500,    89,  45,  44, '+91 98765 43211', 'amit@email.com',   false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Vikram Singh', 'VS', 'Gold',    1200,    234, 167, 67, '+91 98765 43212', 'vikram@email.com', false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Priya Mehta',  'PM', 'Bronze',  -1500,   45,  18,  27, '+91 98765 43213', 'priya@email.com',  false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Rohan Das',    'RD', 'Regular', 0,       67,  34,  33, '+91 98765 43214', 'rohan@email.com',  false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Karan Kapoor', 'KK', 'Silver',  200,     112, 62,  50, '+91 98765 43215', 'karan@email.com',  false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Neha Gupta',   'NG', 'Regular', -300,    34,  14,  20, '+91 98765 43216', 'neha@email.com',   false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Arjun Reddy',  'AR', 'Regular', 0,       78,  40,  38, '+91 98765 43217', 'arjun@email.com',  false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Deepak Verma', 'DV', 'Bronze',  -800,    55,  22,  33, '+91 98765 43218', 'deepak@email.com', false, '[]'),
  ('00000000-0000-0000-0000-000000000001', 'Sanjay Kumar', 'SK', 'Guest',   0,       12,  6,   6,  '+91 98765 43219', '',                 true,  '[]');

-- ── 5. Inventory ─────────────────────────────
INSERT INTO public.inventory (club_id, name, price, category, icon, stock)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Coke',      50,  'drinks', '🥤', 24),
  ('00000000-0000-0000-0000-000000000001', 'Sprite',    50,  'drinks', '🥤', 18),
  ('00000000-0000-0000-0000-000000000001', 'Red Bull',  150, 'drinks', '🥫', 12),
  ('00000000-0000-0000-0000-000000000001', 'Beer',      200, 'drinks', '🍺', 30),
  ('00000000-0000-0000-0000-000000000001', 'Sandwich',  120, 'snacks', '🥪', 15),
  ('00000000-0000-0000-0000-000000000001', 'Chips',     80,  'snacks', '🍟', 20),
  ('00000000-0000-0000-0000-000000000001', 'Burger',    180, 'meals',  '🍔', 10),
  ('00000000-0000-0000-0000-000000000001', 'Biryani',   250, 'meals',  '🍛',  8),
  ('00000000-0000-0000-0000-000000000001', 'Water',     20,  'drinks', '💧', 50),
  ('00000000-0000-0000-0000-000000000001', 'Tea',       30,  'drinks', '☕', 40);

-- ── 6. Sample Match History ──────────────────
-- Note: players JSONB = [{name, result}]
INSERT INTO public.match_history
  (club_id, table_number, players, date, session_start_time, session_end_time, duration, billing_mode, total_bill, payment_method, split_count, qr_used, gst_amount)
VALUES
  (
    '00000000-0000-0000-0000-000000000001', 1,
    '[{"name": "Rahul Sharma", "result": "win"}, {"name": "Amit Patel", "result": "loss"}]'::jsonb,
    now() - INTERVAL '1 hour',
    now() - INTERVAL '2 hours',
    now() - INTERVAL '1 hour',
    3600000, 'hourly', 450.00, 'cash', 1, false, 0
  ),
  (
    '00000000-0000-0000-0000-000000000001', 3,
    '[{"name": "Vikram Singh", "result": "win"}, {"name": "Priya Mehta", "result": "loss"}]'::jsonb,
    now() - INTERVAL '1 day',
    now() - INTERVAL '25 hours',
    now() - INTERVAL '24 hours',
    5400000, 'per_minute', 520.00, 'upi', 1, true, 0
  ),
  (
    '00000000-0000-0000-0000-000000000001', 6,
    '[{"name": "Arjun Reddy", "result": "loss"}, {"name": "Sanjay Kumar", "result": "win"}]'::jsonb,
    now() - INTERVAL '2 days',
    now() - INTERVAL '50 hours',
    now() - INTERVAL '48 hours',
    7200000, 'per_frame', 1100.00, 'cash', 1, false, 0
  ),
  (
    '00000000-0000-0000-0000-000000000001', 2,
    '[{"name": "Karan Kapoor", "result": "win"}, {"name": "Neha Gupta", "result": "loss"}]'::jsonb,
    now() - INTERVAL '3 days',
    now() - INTERVAL '73 hours',
    now() - INTERVAL '72 hours',
    2400000, 'hourly', 280.00, 'split', 2, false, 0
  ),
  (
    '00000000-0000-0000-0000-000000000001', 8,
    '[{"name": "Deepak Verma", "result": "win"}, {"name": "Rohan Das", "result": "loss"}, {"name": "Sanjay Kumar", "result": "loss"}]'::jsonb,
    now() - INTERVAL '4 days',
    now() - INTERVAL '98 hours',
    now() - INTERVAL '96 hours',
    5400000, 'hourly', 890.00, 'cash', 3, false, 0
  ),
  (
    '00000000-0000-0000-0000-000000000001', 5,
    '[{"name": "Rohan Das", "result": "win"}, {"name": "Arjun Reddy", "result": "draw"}, {"name": "Karan Kapoor", "result": "draw"}]'::jsonb,
    now() - INTERVAL '5 days',
    now() - INTERVAL '122 hours',
    now() - INTERVAL '120 hours',
    3000000, 'per_frame', 300.00, 'upi', 1, true, 0
  );

-- ── 7. Sample Tournaments ────────────────────
-- Upcoming tournament (no bracket yet)
INSERT INTO public.tournaments
  (id, club_id, name, type, date, start_time, location, entry_fee, prize_pool,
   prize_distribution, max_players, registered_players, status, description, tables,
   default_best_of, bracket, trophies)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Winter 8-Ball Open', '8-Ball',
  now() + INTERVAL '10 days', '14:00',
  'Main Hall, Tables 1-4', 500, 15000,
  '[{"place": 1, "amount": 8000}, {"place": 2, "amount": 4000}, {"place": 3, "amount": 2000}]'::jsonb,
  16,
  ARRAY['Rahul Sharma', 'Vikram Singh', 'Karan Kapoor', 'Arjun Reddy'],
  'upcoming',
  'Annual winter championship for 8-ball enthusiasts.',
  ARRAY[1, 2, 3, 4],
  7, '[]'::jsonb, '{}'::jsonb
),
-- Completed tournament with trophies awarded
(
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'Monsoon Pool League', '8-Ball',
  now() - INTERVAL '180 days', '10:00',
  'Main Hall', 400, 20000,
  '[{"place": 1, "amount": 12000}, {"place": 2, "amount": 5000}, {"place": 3, "amount": 2000}]'::jsonb,
  8,
  ARRAY['Rahul Sharma', 'Amit Patel', 'Vikram Singh', 'Priya Mehta', 'Rohan Das', 'Karan Kapoor', 'Neha Gupta', 'Arjun Reddy'],
  'completed',
  'Monsoon season pool league.',
  ARRAY[1, 2, 3],
  5,
  '[]'::jsonb,
  '{"Vikram Singh": ["🥇 Champion"], "Rahul Sharma": ["🥈 Runner-up"], "Karan Kapoor": ["🥉 3rd Place"]}'::jsonb
),
-- In-progress tournament with bracket
(
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'Pro Snooker Qualifiers', 'Snooker',
  now() - INTERVAL '2 days', '09:00',
  'VIP Room', 1200, 50000,
  '[{"place": 1, "amount": 30000}, {"place": 2, "amount": 12000}, {"place": 3, "amount": 5000}]'::jsonb,
  8,
  ARRAY['Rahul Sharma', 'Amit Patel', 'Vikram Singh', 'Priya Mehta', 'Rohan Das', 'Karan Kapoor'],
  'in_progress',
  'Qualify for the regional snooker championship.',
  ARRAY[5, 6],
  7,
  -- Sample bracket: 6 players → 8-slot bracket (2 BYEs auto-advanced)
  '[
    {"id":"m1","round":0,"matchNumber":0,"player1":"Rahul Sharma","player2":"Amit Patel","score1":4,"score2":2,"bestOf":7,"tableNumber":5,"status":"completed","winner":"Rahul Sharma"},
    {"id":"m2","round":0,"matchNumber":1,"player1":"Vikram Singh","player2":"Priya Mehta","score1":4,"score2":3,"bestOf":7,"tableNumber":6,"status":"completed","winner":"Vikram Singh"},
    {"id":"m3","round":0,"matchNumber":2,"player1":"Rohan Das","player2":"Karan Kapoor","score1":2,"score2":4,"bestOf":7,"tableNumber":5,"status":"completed","winner":"Karan Kapoor"},
    {"id":"m4","round":0,"matchNumber":3,"player1":null,"player2":null,"score1":0,"score2":0,"bestOf":7,"tableNumber":6,"status":"completed","winner":null},
    {"id":"m5","round":1,"matchNumber":0,"player1":"Rahul Sharma","player2":"Vikram Singh","score1":0,"score2":0,"bestOf":7,"tableNumber":5,"status":"live","winner":null},
    {"id":"m6","round":1,"matchNumber":1,"player1":"Karan Kapoor","player2":null,"score1":0,"score2":0,"bestOf":7,"tableNumber":6,"status":"pending","winner":null},
    {"id":"m7","round":2,"matchNumber":0,"player1":null,"player2":null,"score1":0,"score2":0,"bestOf":7,"tableNumber":5,"status":"pending","winner":null}
  ]'::jsonb,
  '{}'::jsonb
);

-- ── 8. Sample CCTV Cameras ───────────────────
INSERT INTO public.cameras (club_id, name, url, status, thumbnail)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Table 1 Overhead', 'rtsp://192.168.1.101:554/cam/table1/overhead', 'online', ''),
  ('00000000-0000-0000-0000-000000000001', 'Table 2 Side View', 'rtsp://192.168.1.102:554/cam/table2/side',     'online', ''),
  ('00000000-0000-0000-0000-000000000001', 'Main Entrance',    'rtsp://192.168.1.103:554/cam/entrance',        'offline', '');

-- ── 9. Sample Booking ────────────────────────
INSERT INTO public.bookings (club_id, table_number, customer_name, date, start_time, end_time, status, advance_payment)
VALUES
  ('00000000-0000-0000-0000-000000000001', 3, 'Rahul Sharma', CURRENT_DATE + 1, '16:00', '18:00', 'confirmed', 200),
  ('00000000-0000-0000-0000-000000000001', 1, 'Vikram Singh', CURRENT_DATE + 2, '10:00', '12:00', 'pending',   0);
