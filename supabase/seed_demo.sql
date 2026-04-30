-- Seed data for demo@bourbondojo.app (issue #151)
-- Run once against production: npx supabase db query --linked "$(cat supabase/seed_demo.sql)"
DO $$
DECLARE
  demo_id uuid := '8cf26ed2-8949-4c4e-9ca1-787c0b2bcc46';
  ryan_id uuid := '63337648-8ce9-4b50-a776-fc327e2000d9';

  buffalo_trace  uuid := 'a7ce5acb-e91d-4daf-93ca-8ffe978f2230';
  blantons_single uuid := 'c595411d-e499-45e4-abd5-7b3fd5709788';
  eagle_rare_10  uuid := '805a55fb-c099-426b-a5bf-0a9eb3e03263';
  blantons_gold  uuid := '50662641-5fcd-4f8a-844b-3a7f3e1e9a17';
  makers_mark    uuid := '738470fd-ebdb-4acf-bb4a-0f1ba4a77ad8';
  weller_special uuid := 'f85c5ad8-c1dd-4843-b2b1-41119b5a5dd9';
  bourbon_1792   uuid := '365b4fed-dcaf-418b-8df6-e33927e5481e';

  bt_col_id uuid;
  bl_col_id uuid;
  er_col_id uuid;
  grp_id    uuid;
BEGIN
  -- 7 collection bottles
  INSERT INTO user_collection (user_id, bourbon_id, purchase_price, purchase_date, purchase_location)
  VALUES (demo_id, buffalo_trace, 29.99, '2025-11-15', 'Total Wine & More')
  RETURNING id INTO bt_col_id;

  INSERT INTO user_collection (user_id, bourbon_id, purchase_price, purchase_date, purchase_location)
  VALUES (demo_id, blantons_single, 64.99, '2025-12-01', 'Local Spirits')
  RETURNING id INTO bl_col_id;

  INSERT INTO user_collection (user_id, bourbon_id, purchase_price, purchase_date, purchase_location)
  VALUES (demo_id, eagle_rare_10, 34.99, '2025-12-20', 'Total Wine & More')
  RETURNING id INTO er_col_id;

  INSERT INTO user_collection (user_id, bourbon_id, purchase_price, purchase_date, purchase_location)
  VALUES
    (demo_id, blantons_gold,  74.99, '2026-01-05', 'The Whiskey Shop'),
    (demo_id, makers_mark,    24.99, '2026-01-20', 'Costco'),
    (demo_id, weller_special, 42.99, '2026-02-10', 'MSRP Bottle Shop'),
    (demo_id, bourbon_1792,   44.99, '2026-03-01', 'Local Spirits');

  -- 3 tastings with written notes
  INSERT INTO tastings (user_id, bourbon_id, collection_id, nose, palate, finish, overall_notes, rating, tasted_at)
  VALUES
    (demo_id, buffalo_trace, bt_col_id,
     'Vanilla, brown sugar, and a hint of anise',
     'Caramel and oak with subtle spice and dried fruit',
     'Long and smooth with lingering vanilla',
     'A fantastic everyday sipper. Great value at this price point — this is my go-to when I want something reliable.',
     4, '2025-11-20 19:00:00+00'),
    (demo_id, blantons_single, bl_col_id,
     'Floral honey, citrus peel, and sweet corn',
     'Rich caramel, toasted oak, and a pop of rye spice',
     'Medium finish with warming spice and a touch of dark chocolate',
     'Everything you want from a single barrel. Worth hunting down even at elevated prices.',
     5, '2025-12-10 20:00:00+00'),
    (demo_id, eagle_rare_10, er_col_id,
     'Stone fruit, butterscotch, and toasted oak',
     'Dark cherry, toffee, and baking spice in perfect balance',
     'Long and dry with pepper and vanilla',
     'Punches well above its price. One of the best values in bourbon if you can find it at MSRP.',
     5, '2026-01-02 19:30:00+00');

  -- 1 group
  INSERT INTO groups (name, description, created_by, is_public)
  VALUES ('The Barrel Room', 'A tight-knit crew sharing finds, tasting notes, and sale alerts.', demo_id, false)
  RETURNING id INTO grp_id;

  INSERT INTO group_members (group_id, user_id, role, status)
  VALUES (grp_id, demo_id, 'owner', 'accepted');

  -- 2 sale alerts
  INSERT INTO group_sale_alerts (group_id, bourbon_id, posted_by, price, place_id, place_name, place_address, note)
  VALUES
    (grp_id, weller_special, demo_id,
     '$42.99', 'ChIJgam8GhE7D4gRoKJa6O0kzBc', 'Total Wine & More', '2455 Ponce De Leon Blvd, Coral Gables, FL',
     'Spotted 3 bottles on the shelf at MSRP, no limit posted.'),
    (grp_id, eagle_rare_10, demo_id,
     '$34.99', 'ChIJ7Y5lhne3BIgRsFBbQ0MPNBQ', 'Binny''s Beverage Depot', '213 W Grand Ave, Chicago, IL 60654',
     'Allocation just dropped. Call ahead before making the trip.');

  -- Demo follows Ryan (Feed tab shows Ryan''s activity)
  INSERT INTO user_follows (follower_id, following_id)
  VALUES (demo_id, ryan_id)
  ON CONFLICT DO NOTHING;
END $$;
