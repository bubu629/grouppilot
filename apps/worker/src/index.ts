import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  BOT_USERNAME: string;
  MINIAPP_URL: string;
};

type Variables = {
  tgUser: { id: number; first_name: string; last_name?: string; username?: string };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
app.use('*', cors());

// 健康检查接口（部署后可直接在浏览器打开测试）
app.get('/', (c) => c.json({ ok: true, service: 'GroupPilot API', status: 'running' }));

async function tgApi(botToken: string, method: string, payload: Record<string, any>) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json<any>();
}

async function checkGroupMembership(botToken: string, groupId: number, userId: number) {
  const res = await tgApi(botToken, 'getChatMember', { chat_id: groupId, user_id: userId });
  if (!res.ok) return { isMember: false, isAdmin: false };
  const status = res.result?.status;
  return {
    isMember: ['creator', 'administrator', 'member', 'restricted'].includes(status),
    isAdmin: ['creator', 'administrator'].includes(status),
  };
}

async function verifyInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const authDate = Number(params.get('auth_date') || 0);
  if (!hash || !authDate || Math.floor(Date.now() / 1000) - authDate > 86400) return null;

  params.delete('hash');
  const checkStr = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const enc = new TextEncoder();
  const secretKey = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    enc.encode(botToken)
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    enc.encode(checkStr)
  );
  const computed = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  if (computed !== hash) return null;

  const userStr = params.get('user');
  return userStr ? JSON.parse(userStr) : null;
}

app.use('/api/*', async (c, next) => {
  const user = await verifyInitData(c.req.header('X-Telegram-Init-Data') || '', c.env.TELEGRAM_BOT_TOKEN);
  if (!user) return c.json({ ok: false, error: 'UNAUTHORIZED' }, 401);
  c.set('tgUser', user);

  const now = Date.now();
  await c.env.DB.prepare(`
    INSERT INTO users (telegram_id, username, first_name, last_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = excluded.updated_at
  `).bind(user.id, user.username || null, user.first_name, user.last_name || null, now, now).run();

  await next();
});

// ==================== 1. 活动报名 ====================
app.post('/api/events', async (c) => {
  const user = c.get('tgUser');
  const body = await c.req.json();
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, body.groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: 'ADMIN_REQUIRED' }, 403);

  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(`
    INSERT INTO events (id, group_id, creator_id, title, description, location, event_time, deadline_time, max_participants, allow_waitlist, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, body.groupId, user.id, body.title, body.description || '', body.location || '',
    body.eventTime, body.deadlineTime, body.maxParticipants || 0, body.allowWaitlist ? 1 : 0, now
  ).run();

  const startParam = `evt_${id.replace(/-/g, '')}`;
  const msg = await tgApi(c.env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
    chat_id: body.groupId,
    text: `📅 *新活动发布：${body.title}*\n📍 地点：${body.location || '群内通知'}\n👥 名额上限：${body.maxParticipants || '不限'}\n\n点击下方按钮一键报名 👇`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '✅ 立即报名 / 查看名单', url: `https://t.me/${c.env.BOT_USERNAME}?startapp=${startParam}` }]],
    },
  });

  if (msg.ok) {
    await c.env.DB.prepare(`UPDATE events SET tg_message_id = ? WHERE id = ?`).bind(msg.result.message_id, id).run();
  }
  return c.json({ ok: true, id });
});

app.post('/api/events/:id/join', async (c) => {
  const user = c.get('tgUser');
  const eventId = c.req.param('id');
  const event = await c.env.DB.prepare(`SELECT * FROM events WHERE id = ?`).bind(eventId).first<any>();
  if (!event || event.status !== 'OPEN') return c.json({ ok: false, error: 'EVENT_CLOSED' }, 400);

  const { isMember } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, event.group_id, user.id);
  if (!isMember) return c.json({ ok: false, error: 'NOT_GROUP_MEMBER' }, 403);

  const row = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM event_members WHERE event_id = ? AND status = 'CONFIRMED'`
  ).bind(eventId).first<{ cnt: number }>();

  const isFull = event.max_participants > 0 && (row?.cnt || 0) >= event.max_participants;
  if (isFull && !event.allow_waitlist) return c.json({ ok: false, error: 'EVENT_FULL' }, 400);

  const status = isFull ? 'WAITLIST' : 'CONFIRMED';
  const now = Date.now();
  await c.env.DB.prepare(`
    INSERT INTO event_members (event_id, telegram_id, status, joined_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(event_id, telegram_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
  `).bind(eventId, user.id, status, now, now).run();

  return c.json({ ok: true, status });
});

app.post('/api/events/:id/cancel', async (c) => {
  const user = c.get('tgUser');
  const eventId = c.req.param('id');
  const now = Date.now();

  const current = await c.env.DB.prepare(
    `SELECT status FROM event_members WHERE event_id = ? AND telegram_id = ?`
  ).bind(eventId, user.id).first<{ status: string }>();

  if (!current || current.status === 'CANCELLED') return c.json({ ok: true });

  await c.env.DB.prepare(
    `UPDATE event_members SET status = 'CANCELLED', updated_at = ? WHERE event_id = ? AND telegram_id = ?`
  ).bind(now, eventId, user.id).run();

  if (current.status === 'CONFIRMED') {
    const nextWaiter = await c.env.DB.prepare(
      `SELECT telegram_id FROM event_members WHERE event_id = ? AND status = 'WAITLIST' ORDER BY joined_at ASC LIMIT 1`
    ).bind(eventId).first<{ telegram_id: number }>();

    if (nextWaiter) {
      await c.env.DB.prepare(
        `UPDATE event_members SET status = 'CONFIRMED', updated_at = ? WHERE event_id = ? AND telegram_id = ?`
      ).bind(now, eventId, nextWaiter.telegram_id).run();
    }
  }
  return c.json({ ok: true });
});

// ==================== 2. 红包中心 ====================
app.post('/api/red-packets', async (c) => {
  const user = c.get('tgUser');
  const body = await c.req.json();
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, body.groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: 'ADMIN_REQUIRED' }, 403);

  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 24 * 3600 * 1000;

  await c.env.DB.prepare(`
    INSERT INTO red_packets (id, group_id, creator_id, packet_type, reward_type, funding_mode, title, total_amount, remaining_amount, total_count, expires_at, created_at)
    VALUES (?, ?, ?, ?, 'POINTS', 'FREE_GRANT', ?, ?, ?, ?, ?, ?)
  `).bind(id, body.groupId, user.id, body.packetType, body.title, body.totalAmount, body.totalAmount, body.totalCount, expiresAt, now).run();

  const startParam = `pkt_${id.replace(/-/g, '')}`;
  const modeLabel = body.packetType === 'LUCKY' ? '拼手气' : '均分';
  await tgApi(c.env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
    chat_id: body.groupId,
    text: `🧧 *GroupPilot 群组红包*\n\n*${body.title}*\n• 总奖池：*${body.totalAmount} 社区积分*\n• 份数：*${body.totalCount} 个*（${modeLabel}）\n\n点击下方按钮立即开红包 👇`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🧧 开红包 / 查看手气', url: `https://t.me/${c.env.BOT_USERNAME}?startapp=${startParam}` }]],
    },
  });

  return c.json({ ok: true, id });
});

app.post('/api/red-packets/:id/claim', async (c) => {
  const user = c.get('tgUser');
  const packetId = c.req.param('id');
  const now = Date.now();

  const packet = await c.env.DB.prepare(`SELECT * FROM red_packets WHERE id = ?`).bind(packetId).first<any>();
  if (!packet) return c.json({ ok: false, error: 'NOT_FOUND' }, 404);
  if (packet.status !== 'ACTIVE' || packet.expires_at <= now) return c.json({ ok: false, error: 'EXPIRED' }, 400);

  const { isMember } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, packet.group_id, user.id);
  if (!isMember) return c.json({ ok: false, error: 'NOT_GROUP_MEMBER' }, 403);

  const remCount = packet.total_count - packet.claimed_count;
  if (remCount <= 0 || packet.remaining_amount <= 0) return c.json({ ok: false, error: 'SOLD_OUT' }, 400);

  let amount = packet.remaining_amount;
  if (remCount > 1) {
    if (packet.packet_type === 'EQUAL') {
      amount = Math.floor(packet.remaining_amount / remCount);
    } else {
      const max = Math.max(1, Math.floor((packet.remaining_amount / remCount) * 2) - 1);
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      amount = (buf[0] % max) + 1;
    }
  }

  const isLast = remCount === 1;
  try {
    const res = await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE red_packets
        SET remaining_amount = remaining_amount - ?, claimed_count = claimed_count + 1, status = ?
        WHERE id = ? AND status = 'ACTIVE' AND remaining_amount = ? AND claimed_count = ?
      `).bind(amount, isLast ? 'COMPLETED' : 'ACTIVE', packetId, packet.remaining_amount, packet.claimed_count),

      c.env.DB.prepare(`
        INSERT INTO red_packet_claims (id, red_packet_id, group_id, telegram_id, amount, claimed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), packetId, packet.group_id, user.id, amount, now),

      c.env.DB.prepare(`
        INSERT INTO points_accounts (group_id, telegram_id, balance, total_earned, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(group_id, telegram_id) DO UPDATE SET
          balance = balance + excluded.balance, total_earned = total_earned + excluded.total_earned, updated_at = excluded.updated_at
      `).bind(packet.group_id, user.id, amount, amount, now),

      c.env.DB.prepare(`
        INSERT INTO points_ledger (id, group_id, telegram_id, delta, biz_type, biz_id, remark, created_at)
        VALUES (?, ?, ?, ?, 'PACKET_CLAIM', ?, ?, ?)
      `).bind(crypto.randomUUID(), packet.group_id, user.id, amount, packetId, `领取红包：${packet.title}`, now),
    ]);

    if (!res[0].meta.changes) return c.json({ ok: false, error: 'CONCURRENT_RETRY' }, 409);

    if (isLast) {
      const best = await c.env.DB.prepare(`
        SELECT u.first_name, c.amount FROM red_packet_claims c
        JOIN users u ON c.telegram_id = u.telegram_id
        WHERE c.red_packet_id = ? ORDER BY c.amount DESC LIMIT 1
      `).bind(packetId).first<{ first_name: string; amount: number }>();

      await tgApi(c.env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
        chat_id: packet.group_id,
        text: `🎉 *红包已抢完战报 · ${packet.title}*\n共 ${packet.total_count} 份（总计 ${packet.total_amount} 积分）已全部领完！\n👑 本轮手气最佳：*${best?.first_name}*（${best?.amount} 积分）`,
        parse_mode: 'Markdown',
      });
    }
    return c.json({ ok: true, amount, isCompleted: isLast });
  } catch (e: any) {
    if (String(e?.message).includes('UNIQUE')) return c.json({ ok: false, error: 'ALREADY_CLAIMED' }, 400);
    throw e;
  }
});

// ==================== 3. 幸运抽奖 ====================
async function runRaffleDraw(db: D1Database, botToken: string, raffleId: string) {
  const now = Date.now();
  const lock = await db.prepare(`UPDATE raffles SET status = 'DRAWING' WHERE id = ? AND status = 'OPEN'`).bind(raffleId).run();
  if (!lock.meta.changes) return { ok: false, error: 'NOT_OPEN' };

  const raffle = await db.prepare(`SELECT * FROM raffles WHERE id = ?`).bind(raffleId).first<any>();
  const prizes = (await db.prepare(`SELECT * FROM raffle_prizes WHERE raffle_id = ? ORDER BY rank_order ASC`).bind(raffleId).all<any>()).results || [];
  const entries = (await db.prepare(`SELECT * FROM raffle_entries WHERE raffle_id = ?`).bind(raffleId).all<any>()).results || [];

  const pool = [...entries];
  for (let i = pool.length - 1; i > 0; i--) {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    const j = b[0] % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const stmts: D1PreparedStatement[] = [];
  const winLines: string[] = [];
  let idx = 0;

  for (const p of prizes) {
    for (let k = 0; k < p.winner_quota && idx < pool.length; k++) {
      const w = pool[idx++];
      const code = `GP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      stmts.push(db.prepare(`UPDATE raffle_entries SET is_winner = 1, prize_id = ?, claim_code = ? WHERE id = ?`).bind(p.id, code, w.id));

      if (p.prize_type === 'POINTS' && p.points_value > 0) {
        stmts.push(
          db.prepare(`
            INSERT INTO points_accounts (group_id, telegram_id, balance, total_earned, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(group_id, telegram_id) DO UPDATE SET
              balance = balance + excluded.balance, total_earned = total_earned + excluded.total_earned, updated_at = excluded.updated_at
          `).bind(raffle.group_id, w.telegram_id, p.points_value, p.points_value, now),
          db.prepare(`
            INSERT INTO points_ledger (id, group_id, telegram_id, delta, biz_type, biz_id, remark, created_at)
            VALUES (?, ?, ?, ?, 'RAFFLE_WIN', ?, ?, ?)
          `).bind(crypto.randomUUID(), raffle.group_id, w.telegram_id, p.points_value, raffleId, `抽奖中奖：${p.prize_name}`, now)
        );
      }
      const u = await db.prepare(`SELECT first_name FROM users WHERE telegram_id = ?`).bind(w.telegram_id).first<{ first_name: string }>();
      winLines.push(`🏆 *${p.prize_name}*：${u?.first_name || w.telegram_id}（核销码 \`${code}\`）`);
    }
  }

  stmts.push(db.prepare(`UPDATE raffles SET status = 'DRAWN', drawn_at = ? WHERE id = ?`).bind(now, raffleId));
  await db.batch(stmts);

  await tgApi(botToken, 'sendMessage', {
    chat_id: raffle.group_id,
    text: `🎰 *抽奖开奖结果 · ${raffle.title}*\n共 ${entries.length} 人参与，恭喜以下中奖群友：\n\n${winLines.join('\n') || '无人参与，本轮流局'}`,
    parse_mode: 'Markdown',
  });
  return { ok: true };
}

app.post('/api/raffles', async (c) => {
  const user = c.get('tgUser');
  const body = await c.req.json();
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, body.groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: 'ADMIN_REQUIRED' }, 403);

  const id = crypto.randomUUID();
  const now = Date.now();
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare(`
      INSERT INTO raffles (id, group_id, creator_id, title, description, trigger_type, draw_at, target_participants, entry_cost_points, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, body.groupId, user.id, body.title, body.description || '', body.triggerType, body.drawAt || null, body.targetParticipants || 0, body.entryCostPoints || 0, now),
  ];

  (body.prizes || []).forEach((p: any, i: number) => {
    stmts.push(
      c.env.DB.prepare(`
        INSERT INTO raffle_prizes (id, raffle_id, rank_order, prize_name, prize_type, points_value, winner_quota)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(crypto.randomUUID(), id, i + 1, p.prizeName, p.prizeType || 'CUSTOM', p.pointsValue || 0, p.winnerQuota || 1)
    );
  });

  await c.env.DB.batch(stmts);

  const startParam = `rfl_${id.replace(/-/g, '')}`;
  const prizeSummary = (body.prizes || []).map((p: any) => `• ${p.prizeName} × ${p.winnerQuota}名`).join('\n');
  await tgApi(c.env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
    chat_id: body.groupId,
    text: `🎰 *群组幸运抽奖：${body.title}*\n\n*奖品清单：*\n${prizeSummary}\n\n点击下方按钮立即参与抽奖 👇`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: '🎰 免费点击参与抽奖', url: `https://t.me/${c.env.BOT_USERNAME}?startapp=${startParam}` }]],
    },
  });
  return c.json({ ok: true, id });
});

app.post('/api/raffles/:id/enter', async (c) => {
  const user = c.get('tgUser');
  const raffleId = c.req.param('id');
  const raffle = await c.env.DB.prepare(`SELECT * FROM raffles WHERE id = ?`).bind(raffleId).first<any>();
  if (!raffle || raffle.status !== 'OPEN') return c.json({ ok: false, error: 'RAFFLE_CLOSED' }, 400);

  const { isMember } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, raffle.group_id, user.id);
  if (!isMember) return c.json({ ok: false, error: 'NOT_GROUP_MEMBER' }, 403);

  const now = Date.now();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO raffle_entries (id, raffle_id, group_id, telegram_id, joined_at) VALUES (?, ?, ?, ?, ?)`).bind(
        crypto.randomUUID(), raffleId, raffle.group_id, user.id, now
      ),
      c.env.DB.prepare(`UPDATE raffles SET participant_count = participant_count + 1 WHERE id = ?`).bind(raffleId),
    ]);
  } catch (e: any) {
    if (String(e?.message).includes('UNIQUE')) return c.json({ ok: false, error: 'ALREADY_ENTERED' }, 400);
    throw e;
  }

  if (raffle.trigger_type === 'COUNT' && raffle.participant_count + 1 >= raffle.target_participants) {
    await runRaffleDraw(c.env.DB, c.env.TELEGRAM_BOT_TOKEN, raffleId);
  }
  return c.json({ ok: true });
});

app.post('/api/raffles/:id/draw', async (c) => {
  const user = c.get('tgUser');
  const raffleId = c.req.param('id');
  const raffle = await c.env.DB.prepare(`SELECT * FROM raffles WHERE id = ?`).bind(raffleId).first<any>();
  if (!raffle) return c.json({ ok: false, error: 'NOT_FOUND' }, 404);

  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, raffle.group_id, user.id);
  if (!isAdmin) return c.json({ ok: false, error: 'ADMIN_REQUIRED' }, 403);

  return c.json(await runRaffleDraw(c.env.DB, c.env.TELEGRAM_BOT_TOKEN, raffleId));
});


// ==================== 5. 前端查询接口（群列表、红包详情、抽奖详情） ====================
app.get("/api/groups", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT group_id, title, plan FROM groups WHERE bot_active = 1 ORDER BY updated_at DESC LIMIT 50"
  ).all();
  return c.json({ ok: true, groups: rows.results || [] });
});

app.get("/api/red-packets/:id", async (c) => {
  const id = c.req.param("id");
  const packet = await c.env.DB.prepare("SELECT * FROM red_packets WHERE id = ? OR replace(id, \"-\", \"\") = ?").bind(id, id).first();
  if (!packet) return c.json({ ok: false, error: "NOT_FOUND" }, 404);
  const claims = await c.env.DB.prepare(`
    SELECT c.telegram_id, c.amount, c.claimed_at, u.first_name
    FROM red_packet_claims c
    LEFT JOIN users u ON c.telegram_id = u.telegram_id
    WHERE c.red_packet_id = ?
    ORDER BY c.amount DESC
  `).bind(packet.id).all();
  return c.json({ ok: true, packet, claims: claims.results || [] });
});

app.get("/api/raffles/:id", async (c) => {
  const id = c.req.param("id");
  const raffle = await c.env.DB.prepare("SELECT * FROM raffles WHERE id = ? OR replace(id, \"-\", \"\") = ?").bind(id, id).first();
  if (!raffle) return c.json({ ok: false, error: "NOT_FOUND" }, 404);
  const prizes = await c.env.DB.prepare("SELECT * FROM raffle_prizes WHERE raffle_id = ? ORDER BY rank_order ASC").bind(raffle.id).all();
  const winners = await c.env.DB.prepare(`
    SELECT e.telegram_id, e.claim_code, p.prize_name, u.first_name
    FROM raffle_entries e
    JOIN raffle_prizes p ON e.prize_id = p.id
    LEFT JOIN users u ON e.telegram_id = u.telegram_id
    WHERE e.raffle_id = ? AND e.is_winner = 1
  `).bind(raffle.id).all();
  return c.json({ ok: true, raffle, prizes: prizes.results || [], winners: winners.results || [] });
});


// ==================== 6. 活动详情、群组投票与群运营接口 ====================
app.get("/api/events/:id", async (c) => {
  const id = c.req.param("id");
  const event = await c.env.DB.prepare("SELECT * FROM events WHERE id = ? OR replace(id, \"-\", \"\") = ?").bind(id, id).first();
  if (!event) return c.json({ ok: false, error: "NOT_FOUND" }, 404);
  const members = await c.env.DB.prepare(`
    SELECT m.telegram_id, m.status, m.joined_at, u.first_name
    FROM event_members m
    LEFT JOIN users u ON m.telegram_id = u.telegram_id
    WHERE m.event_id = ? AND m.status != \x27CANCELLED\x27
    ORDER BY m.joined_at ASC
  `).bind(event.id).all();
  return c.json({ ok: true, event, members: members.results || [] });
});

app.post("/api/polls", async (c) => {
  const user = c.get("tgUser");
  const body = await c.req.json();
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, body.groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  const options = (body.options || []).map((s: string) => s.trim()).filter(Boolean);
  if (options.length < 2) return c.json({ ok: false, error: "NEED_AT_LEAST_2_OPTIONS" }, 400);

  const id = crypto.randomUUID();
  const now = Date.now();
  await c.env.DB.prepare(`
    INSERT INTO polls (id, group_id, creator_id, question, options_json, is_multiple, is_anonymous, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, body.groupId, user.id, body.question, JSON.stringify(options), body.isMultiple ? 1 : 0, body.isAnonymous ? 1 : 0, now).run();

  const startParam = "pol_" + id.replace(/-/g, "");
  const optText = options.map((o: string, i: number) => (i + 1) + ". " + o).join("\n");
  await tgApi(c.env.TELEGRAM_BOT_TOKEN, "sendMessage", {
    chat_id: body.groupId,
    text: "📊 *群组投票：" + body.question + "*\n\n" + optText + "\n\n" + (body.isMultiple ? "（多选" : "（单选") + (body.isAnonymous ? " · 匿名）" : "）") + "\n点击下方按钮参与投票 👇",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "📊 立即投票 / 查看结果", url: "https://t.me/" + c.env.BOT_USERNAME + "?startapp=" + startParam }]],
    },
  });
  return c.json({ ok: true, id });
});

app.get("/api/polls/:id", async (c) => {
  const id = c.req.param("id");
  const poll = await c.env.DB.prepare("SELECT * FROM polls WHERE id = ? OR replace(id, \"-\", \"\") = ?").bind(id, id).first<any>();
  if (!poll) return c.json({ ok: false, error: "NOT_FOUND" }, 404);
  const votes = await c.env.DB.prepare("SELECT option_index, COUNT(*) as cnt FROM poll_votes WHERE poll_id = ? GROUP BY option_index").bind(poll.id).all<any>();
  const counts: Record<number, number> = {};
  for (const v of votes.results || []) counts[v.option_index] = v.cnt;
  return c.json({ ok: true, poll: { ...poll, options: JSON.parse(poll.options_json || "[]") }, counts });
});

app.post("/api/polls/:id/vote", async (c) => {
  const user = c.get("tgUser");
  const pollId = c.req.param("id");
  const body = await c.req.json();
  const poll = await c.env.DB.prepare("SELECT * FROM polls WHERE id = ? OR replace(id, \"-\", \"\") = ?").bind(pollId, pollId).first<any>();
  if (!poll || poll.status !== "OPEN") return c.json({ ok: false, error: "POLL_CLOSED" }, 400);

  const { isMember } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, poll.group_id, user.id);
  if (!isMember) return c.json({ ok: false, error: "NOT_GROUP_MEMBER" }, 403);

  const indices: number[] = Array.isArray(body.optionIndices) ? body.optionIndices : [body.optionIndex];
  if (!indices.length) return c.json({ ok: false, error: "NO_OPTION_SELECTED" }, 400);
  if (!poll.is_multiple && indices.length > 1) return c.json({ ok: false, error: "SINGLE_CHOICE_ONLY" }, 400);

  const enc = new TextEncoder();
  const hashBuf = await crypto.subtle.digest("SHA-256", enc.encode(poll.id + ":" + user.id));
  const voterHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const now = Date.now();

  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare("DELETE FROM poll_votes WHERE poll_id = ? AND voter_hash = ?").bind(poll.id, voterHash),
  ];
  for (const idx of indices) {
    stmts.push(
      c.env.DB.prepare("INSERT INTO poll_votes (id, poll_id, option_index, voter_hash, created_at) VALUES (?, ?, ?, ?, ?)").bind(
        crypto.randomUUID(), poll.id, idx, voterHash, now
      )
    );
  }
  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

app.get("/api/groups/:id/admin", async (c) => {
  const groupId = Number(c.req.param("id"));
  const group = await c.env.DB.prepare("SELECT group_id, title, plan, welcome_enabled, welcome_text, anti_spam_enabled, ban_links, banned_keywords FROM groups WHERE group_id = ?").bind(groupId).first();
  if (!group) return c.json({ ok: false, error: "NOT_FOUND" }, 404);
  const leaderboard = await c.env.DB.prepare(`
    SELECT p.telegram_id, p.balance, p.total_earned, u.first_name
    FROM points_accounts p
    LEFT JOIN users u ON p.telegram_id = u.telegram_id
    WHERE p.group_id = ?
    ORDER BY p.balance DESC
    LIMIT 20
  `).bind(groupId).all();
  return c.json({ ok: true, group, leaderboard: leaderboard.results || [] });
});

app.post("/api/groups/:id/settings", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  const body = await c.req.json();
  await c.env.DB.prepare("UPDATE groups SET welcome_enabled = ?, welcome_text = ?, updated_at = ? WHERE group_id = ?")
    .bind(body.welcomeEnabled ? 1 : 0, body.welcomeText || "", Date.now(), groupId).run();
  return c.json({ ok: true });
});


// ==================== 7. Telegram Stars Pro 订阅支付 ====================
app.post("/api/payments/pro-invoice", async (c) => {
  const user = c.get("tgUser");
  const body = await c.req.json();
  const groupId = Number(body.groupId);
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  const isTest = body.mode === "TEST";
  const amount = isTest ? 1 : 100;
  const title = isTest ? "GroupPilot Pro 测试订阅" : "GroupPilot Pro 群组会员（30天）";
  const description = isTest ? "1 Star 真机支付闭环测试，支付后立即激活 Pro" : "解锁无限活动、多级抽奖、定时/满人自动开奖与专属标识";

  const res = await tgApi(c.env.TELEGRAM_BOT_TOKEN, "createInvoiceLink", {
    title,
    description,
    payload: "pro:" + groupId + ":" + (isTest ? 7 : 30),
    provider_token: "",
    currency: "XTR",
    prices: [{ label: title, amount }],
  });

  if (!res.ok) return c.json({ ok: false, error: res.description || "INVOICE_FAILED" }, 400);
  return c.json({ ok: true, invoiceUrl: res.result });
});


// ==================== 8. 免费刚需三件套：签到商城 / 反垃圾 / 定时播报 ====================
app.post("/api/groups/:id/checkin", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const { isMember } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, groupId, user.id);
  if (!isMember) return c.json({ ok: false, error: "NOT_GROUP_MEMBER" }, 403);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const existing = await c.env.DB.prepare("SELECT id FROM checkins WHERE group_id = ? AND telegram_id = ? AND checkin_date = ?")
    .bind(groupId, user.id, today).first();
  if (existing) return c.json({ ok: false, error: "ALREADY_CHECKED_IN_TODAY" }, 400);

  const prev = await c.env.DB.prepare("SELECT streak FROM checkins WHERE group_id = ? AND telegram_id = ? AND checkin_date = ?")
    .bind(groupId, user.id, yesterday).first<any>();
  const streak = prev ? prev.streak + 1 : 1;
  const points = streak >= 7 ? 30 : streak >= 3 ? 20 : 10;
  const now = Date.now();

  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO checkins (id, group_id, telegram_id, checkin_date, streak, points_awarded, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), groupId, user.id, today, streak, points, now),
    c.env.DB.prepare(`
      INSERT INTO points_accounts (group_id, telegram_id, balance, total_earned, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(group_id, telegram_id) DO UPDATE SET
        balance = balance + excluded.balance,
        total_earned = total_earned + excluded.total_earned,
        updated_at = excluded.updated_at
    `).bind(groupId, user.id, points, points, now),
  ]);

  return c.json({ ok: true, streak, points });
});

app.get("/api/groups/:id/store", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const acct = await c.env.DB.prepare("SELECT balance FROM points_accounts WHERE group_id = ? AND telegram_id = ?")
    .bind(groupId, user.id).first<any>();
  const items = await c.env.DB.prepare("SELECT * FROM store_items WHERE group_id = ? ORDER BY created_at DESC")
    .bind(groupId).all();
  const myOrders = await c.env.DB.prepare("SELECT * FROM store_redemptions WHERE group_id = ? AND telegram_id = ? ORDER BY created_at DESC LIMIT 10")
    .bind(groupId, user.id).all();
  return c.json({ ok: true, balance: acct?.balance || 0, items: items.results || [], orders: myOrders.results || [] });
});

app.post("/api/groups/:id/store/items", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  const body = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.DB.prepare("INSERT INTO store_items (id, group_id, name, cost_points, stock, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, groupId, body.name, Math.max(1, Number(body.costPoints) || 100), Number(body.stock ?? -1), Date.now()).run();
  return c.json({ ok: true, id });
});

app.post("/api/groups/:id/store/redeem", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const body = await c.req.json();
  const item = await c.env.DB.prepare("SELECT * FROM store_items WHERE id = ? AND group_id = ?").bind(body.itemId, groupId).first<any>();
  if (!item) return c.json({ ok: false, error: "ITEM_NOT_FOUND" }, 404);
  if (item.stock === 0) return c.json({ ok: false, error: "OUT_OF_STOCK" }, 400);

  const acct = await c.env.DB.prepare("SELECT balance FROM points_accounts WHERE group_id = ? AND telegram_id = ?")
    .bind(groupId, user.id).first<any>();
  if (!acct || acct.balance < item.cost_points) return c.json({ ok: false, error: "INSUFFICIENT_POINTS" }, 400);

  const redeemCode = "GP-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  const now = Date.now();
  const stmts: D1PreparedStatement[] = [
    c.env.DB.prepare("UPDATE points_accounts SET balance = balance - ?, updated_at = ? WHERE group_id = ? AND telegram_id = ?")
      .bind(item.cost_points, now, groupId, user.id),
    c.env.DB.prepare("INSERT INTO store_redemptions (id, group_id, item_id, item_name, telegram_id, cost_points, redeem_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), groupId, item.id, item.name, user.id, item.cost_points, redeemCode, now),
  ];
  if (item.stock > 0) {
    stmts.push(c.env.DB.prepare("UPDATE store_items SET stock = stock - 1 WHERE id = ?").bind(item.id));
  }
  await c.env.DB.batch(stmts);
  return c.json({ ok: true, redeemCode });
});

app.post("/api/groups/:id/antispam", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  const body = await c.req.json();
  await c.env.DB.prepare("UPDATE groups SET anti_spam_enabled = ?, ban_links = ?, banned_keywords = ?, updated_at = ? WHERE group_id = ?")
    .bind(body.enabled ? 1 : 0, body.banLinks ? 1 : 0, body.keywords || "", Date.now(), groupId).run();
  return c.json({ ok: true });
});

app.get("/api/groups/:id/broadcasts", async (c) => {
  const groupId = Number(c.req.param("id"));
  const rows = await c.env.DB.prepare("SELECT * FROM group_broadcasts WHERE group_id = ? ORDER BY created_at DESC").bind(groupId).all();
  return c.json({ ok: true, broadcasts: rows.results || [] });
});

app.post("/api/groups/:id/broadcasts", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  const body = await c.req.json();
  const id = crypto.randomUUID();
  const sent = await tgApi(c.env.TELEGRAM_BOT_TOKEN, "sendMessage", {
    chat_id: groupId,
    text: "📢 " + body.content,
  });
  const msgId = sent?.result?.message_id || 0;

  await c.env.DB.prepare("INSERT INTO group_broadcasts (id, group_id, content, interval_hours, last_sent_at, last_message_id, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
    .bind(id, groupId, body.content, Math.max(1, Number(body.intervalHours) || 24), Date.now(), msgId, Date.now()).run();
  return c.json({ ok: true, id });
});

app.delete("/api/groups/:id/broadcasts/:bid", async (c) => {
  const user = c.get("tgUser");
  const groupId = Number(c.req.param("id"));
  const { isAdmin } = await checkGroupMembership(c.env.TELEGRAM_BOT_TOKEN, groupId, user.id);
  if (!isAdmin) return c.json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  await c.env.DB.prepare("DELETE FROM group_broadcasts WHERE id = ? AND group_id = ?").bind(c.req.param("bid"), groupId).run();
  return c.json({ ok: true });
});

// ==================== 4. Webhook & Cron ====================
app.post('/webhook', async (c) => {
  if (c.req.header('X-Telegram-Bot-Api-Secret-Token') !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.text('Forbidden', 403);
  }
  const update = await c.req.json();
  const now = Date.now();

  if (update.my_chat_member) {
    const chat = update.my_chat_member.chat;
    const newStatus = update.my_chat_member.new_chat_member?.status;
    if (['group', 'supergroup'].includes(chat.type)) {
      const active = ['member', 'administrator'].includes(newStatus) ? 1 : 0;
      await c.env.DB.prepare(`
        INSERT INTO groups (group_id, title, bot_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(group_id) DO UPDATE SET title = excluded.title, bot_active = excluded.bot_active, updated_at = excluded.updated_at
      `).bind(chat.id, chat.title || 'Unnamed Group', active, now, now).run();
    }
  }

  if (update.message?.new_chat_members) {
    const chatId = update.message.chat.id;
    const grp = await c.env.DB.prepare(`SELECT welcome_enabled, welcome_text FROM groups WHERE group_id = ?`).bind(chatId).first<any>();
    if (grp?.welcome_enabled && grp.welcome_text) {
      const names = update.message.new_chat_members.map((m: any) => m.first_name).join(', ');
      await tgApi(c.env.TELEGRAM_BOT_TOKEN, 'sendMessage', {
        chat_id: chatId,
        text: grp.welcome_text.replace('{name}', names),
      });
    }
  }
  return c.json({ ok: true });
});

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings) {
    const now = Date.now();
    const dueRaffles = await env.DB.prepare(
      `SELECT id FROM raffles WHERE status = 'OPEN' AND trigger_type = 'TIME' AND draw_at <= ? LIMIT 20`
    ).bind(now).all<{ id: string }>();

    for (const r of dueRaffles.results || []) {
      await runRaffleDraw(env.DB, env.TELEGRAM_BOT_TOKEN, r.id);
    }

    await env.DB.prepare(
      `UPDATE red_packets SET status = 'EXPIRED' WHERE status = 'ACTIVE' AND expires_at <= ?`
    ).bind(now).run();
  },
};
