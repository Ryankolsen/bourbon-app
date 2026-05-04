-- Drop any game_daily_sessions rows with game_type = 'sacred_pour'.
-- The Sacred Pour never shipped to users, so these rows (if any) are safe to delete.
DELETE FROM game_daily_sessions WHERE game_type = 'sacred_pour';
