-- 1. 群组表增加反垃圾配置字段
ALTER TABLE groups ADD COLUMN anti_spam_enabled INTEGER DEFAULT 0;
ALTER TABLE groups ADD COLUMN ban_links INTEGER DEFAULT 1;
ALTER TABLE groups ADD COLUMN banned_keywords TEXT DEFAULT '';

-- 2. 每日签到记录表
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  telegram_id INTEGER NOT NULL,
  checkin_date TEXT NOT NULL,
  streak INTEGER DEFAULT 1,
  points_awarded INTEGER DEFAULT 10,
  created_at INTEGER NOT NULL,
  UNIQUE(group_id, telegram_id, checkin_date)
);

-- 3. 积分商城商品表
CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  cost_points INTEGER NOT NULL,
  stock INTEGER DEFAULT -1,
  created_at INTEGER NOT NULL
);

-- 4. 积分兑换记录表
CREATE TABLE IF NOT EXISTS store_redemptions (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  telegram_id INTEGER NOT NULL,
  cost_points INTEGER NOT NULL,
  redeem_code TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 5. 定时周期播报表
CREATE TABLE IF NOT EXISTS group_broadcasts (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  interval_hours INTEGER DEFAULT 24,
  last_sent_at INTEGER DEFAULT 0,
  last_message_id INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);
