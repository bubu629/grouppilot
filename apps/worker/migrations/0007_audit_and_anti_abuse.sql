-- 1. 付费进群会员表（支撑到期自动移出）
CREATE TABLE IF NOT EXISTS paid_memberships (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  telegram_id INTEGER NOT NULL,
  stars_paid INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at INTEGER NOT NULL
);

-- 2. 全站 Stars 支付流水表
CREATE TABLE IF NOT EXISTS payment_transactions (
  id TEXT PRIMARY KEY,
  biz_type TEXT NOT NULL,
  group_id INTEGER DEFAULT 0,
  payer_id INTEGER NOT NULL,
  amount_stars INTEGER NOT NULL,
  tg_charge_id TEXT DEFAULT '',
  payload TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

-- 3. 邀请裂变防刷明细表（防退群重进刷分）
CREATE TABLE IF NOT EXISTS invite_records (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  inviter_id INTEGER NOT NULL,
  invitee_id INTEGER NOT NULL,
  status TEXT DEFAULT 'JOINED',
  created_at INTEGER NOT NULL,
  UNIQUE(group_id, invitee_id)
);

-- 4. 反垃圾拦截日志表
CREATE TABLE IF NOT EXISTS spam_logs (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  offender_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 5. 补齐中奖核销状态（真实表名 raffle_entries）& 活动到场签到字段
ALTER TABLE raffle_entries ADD COLUMN is_claimed INTEGER DEFAULT 0;
ALTER TABLE event_members ADD COLUMN checked_in INTEGER DEFAULT 0;
