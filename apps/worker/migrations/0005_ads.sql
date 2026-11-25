CREATE TABLE IF NOT EXISTS ad_orders (
  id TEXT PRIMARY KEY,
  buyer_id INTEGER NOT NULL,
  position TEXT NOT NULL,
  title TEXT NOT NULL,
  target_url TEXT NOT NULL,
  stars_amount INTEGER NOT NULL,
  days INTEGER DEFAULT 7,
  status TEXT DEFAULT 'PENDING',
  expires_at INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
