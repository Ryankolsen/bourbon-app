# BourbonVault DB Reference

Project ID: `dmudeosnwcizorotxlrs`
CLI command: `npx supabase db query --linked "<sql>"`

## Tables

| Table | Key Columns | Notes |
|---|---|---|
| `bourbons` | id, name, distillery, city, state, country, mashbill, age_statement, proof, type, msrp, image_url, description | Master bourbon list, readable by all authenticated users |
| `profiles` | id, username, display_name, avatar_url | Extends auth.users; auto-created on signup via trigger |
| `tastings` | id, user_id, bourbon_id, rating (int, 1–5), nose, palate, finish, overall_notes | Check constraint: `rating >= 1 AND rating <= 5` |
| `user_collection` | id, user_id, bourbon_id, purchase_price, purchase_date | `bottle_status` was dropped — do not reference it |
| `user_wishlist` | id, user_id, bourbon_id, priority (1–10) | |
| `groups` | id, name, created_by, updated_at | |
| `group_members` | id, group_id, user_id, role | |
| `group_recommendations` | id, group_id, bourbon_id, recommended_by | |
| `bourbon_comments` | id, bourbon_id, user_id, body, created_at | Named `bourbon_comments`, NOT `comments` |
| `user_follows` | id, follower_id, following_id | Named `user_follows`, NOT `follows` |

## Views

| View | Definition |
|---|---|
| `bourbon_rating_stats` | Aggregates `avg_rating`, `rating_count`, `tasting_count` per `bourbon_id` from `tastings`. Named `bourbon_rating_stats`, NOT `bourbon_ratings`. |

## RPCs (Functions)

| Function | Purpose |
|---|---|
| `find_profile_by_email(email)` | Look up a profile by email address |
| `get_group_avg_rating(group_id)` | Returns average rating for bourbons rated within a group |
| `get_user_public_stats(user_id)` | Returns public-facing stats for a user profile |
| `handle_new_user()` | Trigger: auto-creates profile row on auth.users insert |
| `handle_group_updated_at()` | Trigger: updates `groups.updated_at` on row change |

## RLS

All tables have RLS enabled. Users can only read/write their own rows in `tastings`, `user_collection`, `user_wishlist`, `bourbon_comments`, `user_follows`, `group_members`. `bourbons` is readable by all authenticated users.

## Common gotchas

- Use `bourbon_comments`, not `comments`
- Use `user_follows`, not `follows`
- Use `bourbon_rating_stats`, not `bourbon_ratings`
- `bottle_status` column no longer exists on `user_collection`
- `tastings.rating` is `integer`, range 1–5 (not 0–100)