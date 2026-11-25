CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT,
  language_code TEXT DEFAULT 'zh',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
  group_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'FREE',
  bot_active INTEGER NOT NULL DEFAULT 1,
  welcome_enabled INTEGER NOT NULL DEFAULT 0,
  welcome_text TEXT,
  rules_text TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS group_admins (
  group_id INTEGER NOT NULL,
  telegram_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS points_accounts (
  group_id INTEGER NOT NULL,
  telegram_id INTEGER NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (group_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  telegram_id INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  biz_type TEXT NOT NULL,
  biz_id TEXT NOT NULL,
  remark TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(group_id, telegram_id, created_at DESC);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_time INTEGER NOT NULL,
  deadline_time INTEGER NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 0,
  allow_waitlist INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'OPEN',
  reminded_1h INTEGER NOT NULL DEFAULT 0,
  tg_message_id INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_group ON events(group_id, status, event_time);

CREATE TABLE IF NOT EXISTS event_members (
  event_id TEXT NOT NULL,
  telegram_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  joined_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (event_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS red_packets (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  packet_type TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'POINTS',
  funding_mode TEXT NOT NULL,
  title TEXT NOT NULL,
  total_amount INTEGER NOT NULL CHECK (total_amount > 0),
  remaining_amount INTEGER NOT NULL CHECK (remaining_amount >= 0),
  total_count INTEGER NOT NULL CHECK (total_count > 0),
  claimed_count INTEGER NOT NULL DEFAULT 0,
  tg_gift_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  tg_message_id INTEGER,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_packets_group ON red_packets(group_id, status);
CREATE INDEX IF NOT EXISTS idx_packets_expire ON red_packets(status, expires_at);

CREATE TABLE IF NOT EXISTS red_packet_claims (
  id TEXT PRIMARY KEY,
  red_packet_id TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  telegram_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL,
  UNIQUE(red_packet_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS raffles (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  draw_at INTEGER,
  target_participants INTEGER DEFAULT 0,
  entry_cost_points INTEGER NOT NULL DEFAULT 0 CHECK (entry_cost_points >= 0),
  participant_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN',
  tg_message_id INTEGER,
  drawn_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raffles_group ON raffles(group_id, status);
CREATE INDEX IF NOT EXISTS idx_raffles_due ON raffles(status, trigger_type, draw_at);

CREATE TABLE IF NOT EXISTS raffle_prizes (
  id TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL,
  rank_order INTEGER NOT NULL,
  prize_name TEXT NOT NULL,
  prize_type TEXT NOT NULL DEFAULT 'CUSTOM',
  points_value INTEGER NOT NULL DEFAULT 0,
  tg_gift_id TEXT,
  winner_quota INTEGER NOT NULL CHECK (winner_quota > 0)
);

CREATE TABLE IF NOT EXISTS raffle_entries (
  id TEXT PRIMARY KEY,
  raffle_id TEXT NOT NULL,
  group_id INTEGER NOT NULL,
  telegram_id INTEGER NOT NULL,
  is_winner INTEGER NOT NULL DEFAULT 0,
  prize_id TEXT,
  claim_code TEXT,
  joined_at INTEGER NOT NULL,
  UNIQUE(raffle_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  options_json TEXT NOT NULL,
  is_multiple INTEGER NOT NULL DEFAULT 0,
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN',
  closes_at INTEGER,
  tg_message_id INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(poll_id, option_index, voter_hash)
);

CREATE TABLE IF NOT EXISTS gift_dispatches (
  id TEXT PRIMARY KEY,
  group_id INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  recipient_telegram_id INTEGER NOT NULL,
  tg_gift_id TEXT NOT NULL,
  star_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  created_at INTEGER NOT NULL,
  sent_at INTEGER
);
