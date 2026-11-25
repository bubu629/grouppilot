-- 1. 群组表增加 Pro 配置字段（强关频道、白标尾巴、付费进群定价）
ALTER TABLE groups ADD COLUMN force_channel_id TEXT DEFAULT '';
ALTER TABLE groups ADD COLUMN custom_footer TEXT DEFAULT '';
ALTER TABLE groups ADD COLUMN paid_join_stars INTEGER DEFAULT 0;
ALTER TABLE groups ADD COLUMN paid_join_days INTEGER DEFAULT 30;

-- 2. 邀请裂变链接表
CREATE TABLE IF NOT EXISTS invite_links (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  invite_url TEXT NOT NULL,
  join_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE(group_id, creator_id)
);

-- 3. 积分商城卡密库存表（自动发货）
CREATE TABLE IF NOT EXISTS store_codes (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  code_text TEXT NOT NULL,
  used_by INTEGER DEFAULT 0,
  used_at INTEGER DEFAULT 0
);

-- 4. 跨群全局黑名单表
CREATE TABLE IF NOT EXISTS global_blacklist (
  owner_id INTEGER NOT NULL,
  banned_telegram_id INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, banned_telegram_id)
);
