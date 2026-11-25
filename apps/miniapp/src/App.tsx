import React, { useEffect, useState } from 'react';
import { AppRoot, Section, Cell, Button, Badge, Banner } from '@telegram-apps/telegram-ui';

const API_BASE = 'https://grouppilot-worker.zhangbanzhuan.workers.dev';

declare global {
  interface Window {
    Telegram?: any;
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const initData = window.Telegram?.WebApp?.initData || '';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(128,128,128,0.3)',
  background: 'transparent',
  color: 'inherit',
  fontSize: 15,
  boxSizing: 'border-box',
};

const unitBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  border: '1px solid rgba(128,128,128,0.3)',
  borderRadius: 10,
  padding: '0 12px',
};

const unitInputStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '10px 0',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'inherit',
  fontSize: 15,
};

export default function App() {
  const [route, setRoute] = useState<'HOME' | 'EVENTS' | 'PACKETS' | 'RAFFLES' | 'POLLS' | 'ADMIN'>('HOME');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<string>('检测中...');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  // 红包
  const [pktTitle, setPktTitle] = useState('群友专属福利红包');
  const [pktAmount, setPktAmount] = useState('1000');
  const [pktCount, setPktCount] = useState('10');
  const [pktType, setPktType] = useState<'LUCKY' | 'EQUAL'>('LUCKY');
  const [pktDetail, setPktDetail] = useState<any>(null);

  // 抽奖 2.0（支持定时/满人开奖 + 多等级奖品）
  const [rflTitle, setRflTitle] = useState('周末幸运大抽奖');
  const [rflTrigger, setRflTrigger] = useState<'MANUAL' | 'TIME' | 'PARTICIPANTS'>('MANUAL');
  const [rflDrawAt, setRflDrawAt] = useState(() => {
    const d = new Date(Date.now() + 2 * 3600 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [rflTargetCount, setRflTargetCount] = useState('20');
  const [rflPrizes, setRflPrizes] = useState<Array<{ prizeName: string; winnerQuota: string }>>([
    { prizeName: '一等奖：神秘大奖', winnerQuota: '1' },
    { prizeName: '二等奖：500 社区积分', winnerQuota: '3' },
  ]);
  const [rflDetail, setRflDetail] = useState<any>(null);

  // 活动报名
  const [evtTitle, setEvtTitle] = useState('周末线下聚会 / 线上分享');
  const [evtLoc, setEvtLoc] = useState('群内语音 / 待定');
  const [evtMax, setEvtMax] = useState('20');
  const [evtWaitlist, setEvtWaitlist] = useState(true);
  const [evtDetail, setEvtDetail] = useState<any>(null);

  // 群组投票
  const [polQuestion, setPolQuestion] = useState('本周活动大家想选哪个时间？');
  const [polOptionsText, setPolOptionsText] = useState('周五晚上 8 点\n周六下午 3 点\n周日下午 3 点');
  const [polMultiple, setPolMultiple] = useState(false);
  const [polAnonymous, setPolAnonymous] = useState(true);
  const [polDetail, setPolDetail] = useState<any>(null);
  const [polSelected, setPolSelected] = useState<number[]>([]);

  // 群组运营与设置 + Pro 订阅
  const [adminData, setAdminData] = useState<any>(null);
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeText, setWelcomeText] = useState('欢迎 {name} 加入本群！🎉');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTgUser(tg.initDataUnsafe?.user || null);

      const urlParam = new URLSearchParams(window.location.search).get('tgWebAppStartParam') || '';
      const startParam: string = tg.initDataUnsafe?.start_param || urlParam;
      if (startParam.startsWith('pkt_')) {
        setTargetId(startParam.slice(4));
        setRoute('PACKETS');
      } else if (startParam.startsWith('rfl_')) {
        setTargetId(startParam.slice(4));
        setRoute('RAFFLES');
      } else if (startParam.startsWith('evt_')) {
        setTargetId(startParam.slice(4));
        setRoute('EVENTS');
      } else if (startParam.startsWith('pol_')) {
        setTargetId(startParam.slice(4));
        setRoute('POLLS');
      }
    }

    fetch(API_BASE)
      .then((r) => r.json())
      .then((d) => setApiStatus(d.ok ? '已连接云端' : '异常'))
      .catch(() => setApiStatus('连接失败'));

    apiFetch('/api/groups').then((d) => {
      if (d.ok && d.groups?.length) {
        setGroups(d.groups);
        setSelectedGroupId(String(d.groups[0].group_id));
      }
    });
  }, []);

  const refreshAdmin = (gid: string) => {
    if (!gid) return;
    apiFetch(`/api/groups/${gid}/admin`).then((d) => {
      if (d.ok) {
        setAdminData(d);
        setWelcomeEnabled(Boolean(d.group?.welcome_enabled));
        setWelcomeText(d.group?.welcome_text || '欢迎 {name} 加入本群！🎉');
      }
    });
  };

  useEffect(() => {
    setMsg('');
    if (route === 'PACKETS' && targetId) apiFetch(`/api/red-packets/${targetId}`).then((d) => d.ok && setPktDetail(d));
    if (route === 'RAFFLES' && targetId) apiFetch(`/api/raffles/${targetId}`).then((d) => d.ok && setRflDetail(d));
    if (route === 'EVENTS' && targetId) apiFetch(`/api/events/${targetId}`).then((d) => d.ok && setEvtDetail(d));
    if (route === 'POLLS' && targetId) apiFetch(`/api/polls/${targetId}`).then((d) => d.ok && setPolDetail(d));
    if (route === 'ADMIN' && selectedGroupId) refreshAdmin(selectedGroupId);
  }, [route, targetId, selectedGroupId]);

  const handleCreatePacket = async () => {
    if (!selectedGroupId) return setMsg('请先将 Bot 拉入群组并设为管理员');
    setMsg('正在发送红包到群里...');
    const res = await apiFetch('/api/red-packets', {
      method: 'POST',
      body: JSON.stringify({
        groupId: Number(selectedGroupId),
        title: pktTitle,
        totalAmount: Number(pktAmount),
        totalCount: Number(pktCount),
        packetType: pktType,
      }),
    });
    if (res.ok) {
      setMsg('✅ 红包已发送到群里！');
      setTargetId(res.id);
    } else setMsg(`❌ 发送失败：${res.error}`);
  };

  const handleClaimPacket = async () => {
    if (!pktDetail?.packet?.id) return;
    setMsg('正在开红包...');
    const res = await apiFetch(`/api/red-packets/${pktDetail.packet.id}/claim`, { method: 'POST' });
    if (res.ok) {
      setMsg(`🎉 恭喜你抢到了 ${res.amount} 社区积分！`);
      const updated = await apiFetch(`/api/red-packets/${pktDetail.packet.id}`);
      if (updated.ok) setPktDetail(updated);
    } else setMsg(`提示：${res.error}`);
  };

  const handleCreateRaffle = async () => {
    if (!selectedGroupId) return setMsg('请先将 Bot 拉入群组并设为管理员');
    const validPrizes = rflPrizes
      .filter((p) => p.prizeName.trim())
      .map((p) => ({ prizeName: p.prizeName.trim(), prizeType: 'CUSTOM', winnerQuota: Math.max(1, Number(p.winnerQuota) || 1) }));
    if (!validPrizes.length) return setMsg('请至少填写 1 个奖品');

    setMsg('正在发布抽奖到群里...');
    const res = await apiFetch('/api/raffles', {
      method: 'POST',
      body: JSON.stringify({
        groupId: Number(selectedGroupId),
        title: rflTitle,
        triggerType: rflTrigger,
        drawAt: rflTrigger === 'TIME' ? new Date(rflDrawAt).getTime() : null,
        targetParticipants: rflTrigger === 'PARTICIPANTS' ? Number(rflTargetCount) || 10 : null,
        prizes: validPrizes,
      }),
    });
    if (res.ok) {
      setMsg('✅ 抽奖卡片已发送到群里！');
      setTargetId(res.id);
    } else setMsg(`❌ 发布失败：${res.error}`);
  };

  const handleEnterRaffle = async () => {
    if (!rflDetail?.raffle?.id) return;
    const res = await apiFetch(`/api/raffles/${rflDetail.raffle.id}/enter`, { method: 'POST' });
    setMsg(res.ok ? '✅ 参与成功！等待开奖' : `提示：${res.error}`);
    const updated = await apiFetch(`/api/raffles/${rflDetail.raffle.id}`);
    if (updated.ok) setRflDetail(updated);
  };

  const handleDrawRaffle = async () => {
    if (!rflDetail?.raffle?.id) return;
    const res = await apiFetch(`/api/raffles/${rflDetail.raffle.id}/draw`, { method: 'POST' });
    setMsg(res.ok ? '🎉 已开奖！结果已同步到群聊' : `提示：${res.error}`);
    const updated = await apiFetch(`/api/raffles/${rflDetail.raffle.id}`);
    if (updated.ok) setRflDetail(updated);
  };

  const handleCreateEvent = async () => {
    if (!selectedGroupId) return setMsg('请先将 Bot 拉入群组并设为管理员');
    setMsg('正在发布活动到群里...');
    const now = Date.now();
    const res = await apiFetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        groupId: Number(selectedGroupId),
        title: evtTitle,
        location: evtLoc,
        eventTime: now + 48 * 3600 * 1000,
        deadlineTime: now + 24 * 3600 * 1000,
        maxParticipants: Number(evtMax) || 0,
        allowWaitlist: evtWaitlist,
      }),
    });
    if (res.ok) {
      setMsg('✅ 活动卡片已发送到群里！');
      setTargetId(res.id);
    } else setMsg(`❌ 发布失败：${res.error}`);
  };

  const handleEventAction = async (action: 'join' | 'cancel') => {
    if (!evtDetail?.event?.id) return;
    const res = await apiFetch(`/api/events/${evtDetail.event.id}/${action}`, { method: 'POST' });
    setMsg(res.ok ? (action === 'join' ? `✅ 报名成功（状态：${res.status}）` : '已取消报名，候补将自动递补') : `提示：${res.error}`);
    const updated = await apiFetch(`/api/events/${evtDetail.event.id}`);
    if (updated.ok) setEvtDetail(updated);
  };

  const handleCreatePoll = async () => {
    if (!selectedGroupId) return setMsg('请先将 Bot 拉入群组并设为管理员');
    const options = polOptionsText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return setMsg('请至少填写 2 个投票选项（每行一个）');
    setMsg('正在发布投票到群里...');
    const res = await apiFetch('/api/polls', {
      method: 'POST',
      body: JSON.stringify({
        groupId: Number(selectedGroupId),
        question: polQuestion,
        options,
        isMultiple: polMultiple,
        isAnonymous: polAnonymous,
      }),
    });
    if (res.ok) {
      setMsg('✅ 投票卡片已发送到群里！');
      setPolSelected([]);
      setTargetId(res.id);
    } else setMsg(`❌ 发布失败：${res.error}`);
  };

  const handleVotePoll = async () => {
    if (!polDetail?.poll?.id || !polSelected.length) return setMsg('请先选择投票选项');
    const res = await apiFetch(`/api/polls/${polDetail.poll.id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionIndices: polSelected }),
    });
    if (res.ok) {
      setMsg('✅ 投票成功！');
      const updated = await apiFetch(`/api/polls/${polDetail.poll.id}`);
      if (updated.ok) setPolDetail(updated);
    } else setMsg(`提示：${res.error}`);
  };

  const handleSaveSettings = async () => {
    if (!selectedGroupId) return;
    const res = await apiFetch(`/api/groups/${selectedGroupId}/settings`, {
      method: 'POST',
      body: JSON.stringify({ welcomeEnabled, welcomeText }),
    });
    setMsg(res.ok ? '✅ 群组入群欢迎语已保存！' : `❌ 保存失败：${res.error}`);
  };

  const handleUpgradePro = async (mode: 'NORMAL' | 'TEST') => {
    if (!selectedGroupId) return setMsg('请先选择群组');
    setMsg('正在唤起 Telegram Stars 支付...');
    const res = await apiFetch('/api/payments/pro-invoice', {
      method: 'POST',
      body: JSON.stringify({ groupId: Number(selectedGroupId), mode }),
    });
    if (!res.ok || !res.invoiceUrl) return setMsg(`❌ 订单创建失败：${res.error}`);

    const tg = window.Telegram?.WebApp;
    if (tg?.openInvoice) {
      tg.openInvoice(res.invoiceUrl, (status: string) => {
        if (status === 'paid') {
          setMsg('👑 支付成功！群组已升级为 GroupPilot Pro！');
          setTimeout(() => refreshAdmin(selectedGroupId), 1500);
        } else if (status === 'cancelled') {
          setMsg('已取消支付');
        } else {
          setMsg(`支付状态：${status}`);
        }
      });
    } else {
      window.open(res.invoiceUrl, '_blank');
    }
  };

  const GroupSelector = () => (
    <div style={{ padding: '8px 16px' }}>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>选择目标群组（需先拉 Bot 进群设管理员）</div>
      {groups.length > 0 ? (
        <select style={inputStyle} value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.group_id} value={g.group_id}>{g.title}</option>
          ))}
        </select>
      ) : (
        <div style={{ fontSize: 13, color: '#e53935' }}>暂未检测到已绑定的群组，请先将 Bot 拉进测试群并设为管理员。</div>
      )}
    </div>
  );

  return (
    <AppRoot>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Banner
          header={`GroupPilot${tgUser ? ` · 你好，${tgUser.first_name}` : ''}`}
          subheader={`活动 · 积分红包 · 幸运抽奖 · 群协作 (${apiStatus})`}
        />

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(36,129,204,0.12)', fontSize: 14 }}>
            {msg}
          </div>
        )}

        {route === 'HOME' && (
          <>
            <Section header="社群激励与互动">
              <Cell
                before={<span style={{ fontSize: 24 }}>🧧</span>}
                after={<Badge type="number">积分版</Badge>}
                subtitle="拼手气 / 均分积分红包"
                onClick={() => { setTargetId(null); setRoute('PACKETS'); }}
              >
                红包中心
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>🎰</span>}
                after={<Badge type="number">2.0</Badge>}
                subtitle="多等级奖品 · 手动/定时/满人自动开奖"
                onClick={() => { setTargetId(null); setRoute('RAFFLES'); }}
              >
                幸运抽奖
              </Cell>
            </Section>

            <Section header="群组协作与商业化">
              <Cell before={<span style={{ fontSize: 24 }}>📅</span>} subtitle="名额上限 · 候补自动递补" onClick={() => { setTargetId(null); setRoute('EVENTS'); }}>
                活动报名
              </Cell>
              <Cell before={<span style={{ fontSize: 24 }}>📊</span>} subtitle="单选 / 多选 / 真匿名投票" onClick={() => { setTargetId(null); setRoute('POLLS'); }}>
                群组投票
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>👑</span>}
                after={<Badge type="dot" />}
                subtitle="Stars 升级 Pro · 群积分榜 · 入群欢迎语"
                onClick={() => { setTargetId(null); setRoute('ADMIN'); }}
              >
                群组运营与 Pro 会员
              </Cell>
            </Section>
          </>
        )}

        {route !== 'HOME' && (
          <Button size="s" mode="bezeled" onClick={() => { setTargetId(null); setPktDetail(null); setRflDetail(null); setEvtDetail(null); setPolDetail(null); setRoute('HOME'); }}>
            ← 返回首页
          </Button>
        )}

        {/* ==================== 红包中心 ==================== */}
        {route === 'PACKETS' && !targetId && (
          <Section header="发一个群组积分红包">
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={pktTitle} onChange={(e) => setPktTitle(e.target.value)} placeholder="红包祝福语" />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={unitBoxStyle}>
                  <input style={unitInputStyle} type="number" value={pktAmount} onChange={(e) => setPktAmount(e.target.value)} placeholder="总积分" />
                  <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>积分</span>
                </div>
                <div style={unitBoxStyle}>
                  <input style={unitInputStyle} type="number" value={pktCount} onChange={(e) => setPktCount(e.target.value)} placeholder="份数" />
                  <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>个</span>
                </div>
              </div>
              <select style={inputStyle} value={pktType} onChange={(e) => setPktType(e.target.value as any)}>
                <option value="LUCKY">拼手气红包</option>
                <option value="EQUAL">普通均分红包</option>
              </select>
              <Button stretched onClick={handleCreatePacket}>🧧 发送红包到群聊</Button>
            </div>
          </Section>
        )}

        {route === 'PACKETS' && targetId && pktDetail && (
          <Section header={`🧧 ${pktDetail.packet.title}`}>
            <Cell subtitle={`已领取 ${pktDetail.packet.claimed_count} / ${pktDetail.packet.total_count} 份 · 状态：${pktDetail.packet.status}`}>
              总奖池：{pktDetail.packet.total_amount} 社区积分
            </Cell>
            {pktDetail.packet.status === 'ACTIVE' && (
              <div style={{ padding: '8px 16px' }}>
                <Button stretched onClick={handleClaimPacket}>🧧 立即开红包</Button>
              </div>
            )}
            {pktDetail.claims.map((c: any, i: number) => (
              <Cell key={i} after={`${c.amount} PTS`}>
                {i === 0 ? '👑 ' : ''}{c.first_name || c.telegram_id}
              </Cell>
            ))}
          </Section>
        )}

        {/* ==================== 幸运抽奖 2.0 ==================== */}
        {route === 'RAFFLES' && !targetId && (
          <Section header="发起群组幸运抽奖（2.0 进阶版）">
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={rflTitle} onChange={(e) => setRflTitle(e.target.value)} placeholder="抽奖标题" />

              <div style={{ fontSize: 13, opacity: 0.7 }}>开奖方式</div>
              <select style={inputStyle} value={rflTrigger} onChange={(e) => setRflTrigger(e.target.value as any)}>
                <option value="MANUAL">手动开奖（群主随时开奖）</option>
                <option value="TIME">定时自动开奖（到点自动开奖）</option>
                <option value="PARTICIPANTS">满人自动开奖（达标瞬间开奖）</option>
              </select>

              {rflTrigger === 'TIME' && (
                <input style={inputStyle} type="datetime-local" value={rflDrawAt} onChange={(e) => setRflDrawAt(e.target.value)} />
              )}

              {rflTrigger === 'PARTICIPANTS' && (
                <div style={unitBoxStyle}>
                  <input style={unitInputStyle} type="number" value={rflTargetCount} onChange={(e) => setRflTargetCount(e.target.value)} placeholder="满多少人自动开奖" />
                  <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>人开奖</span>
                </div>
              )}

              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>奖项设置（支持多等级奖品）</div>
              {rflPrizes.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    style={{ ...inputStyle, flex: 2 }}
                    value={p.prizeName}
                    onChange={(e) => {
                      const next = [...rflPrizes];
                      next[idx].prizeName = e.target.value;
                      setRflPrizes(next);
                    }}
                    placeholder={`奖品 ${idx + 1} 名称`}
                  />
                  <div style={{ ...unitBoxStyle, flex: 1 }}>
                    <input
                      style={unitInputStyle}
                      type="number"
                      value={p.winnerQuota}
                      onChange={(e) => {
                        const next = [...rflPrizes];
                        next[idx].winnerQuota = e.target.value;
                        setRflPrizes(next);
                      }}
                    />
                    <span style={{ fontSize: 13, opacity: 0.65, marginLeft: 4 }}>名</span>
                  </div>
                  {rflPrizes.length > 1 && (
                    <button
                      onClick={() => setRflPrizes(rflPrizes.filter((_, i) => i !== idx))}
                      style={{ border: 'none', background: 'transparent', color: '#e53935', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <Button
                size="s"
                mode="bezeled"
                onClick={() => setRflPrizes([...rflPrizes, { prizeName: `三等奖：幸运奖`, winnerQuota: '5' }])}
              >
                + 添加一个奖项等级
              </Button>

              <Button stretched onClick={handleCreateRaffle}>🎰 发布抽奖到群聊</Button>
            </div>
          </Section>
        )}

        {route === 'RAFFLES' && targetId && rflDetail && (
          <Section header={`🎰 ${rflDetail.raffle.title}`}>
            <Cell subtitle={`当前参与：${rflDetail.raffle.participant_count} 人 · 开奖方式：${rflDetail.raffle.trigger_type} · 状态：${rflDetail.raffle.status}`}>
              奖品：{rflDetail.prizes.map((p: any) => `${p.prize_name}×${p.winner_quota}`).join(' / ')}
            </Cell>
            {rflDetail.raffle.status === 'OPEN' && (
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button stretched onClick={handleEnterRaffle}>🎰 免费点击参与抽奖</Button>
                <Button stretched mode="outline" onClick={handleDrawRaffle}>🎲 群主立即开奖</Button>
              </div>
            )}
            {rflDetail.winners.map((w: any, i: number) => (
              <Cell key={i} subtitle={`核销码：${w.claim_code}`} after={w.prize_name}>
                🏆 {w.first_name || w.telegram_id}
              </Cell>
            ))}
          </Section>
        )}

        {/* ==================== 活动报名 ==================== */}
        {route === 'EVENTS' && !targetId && (
          <Section header="发布群组活动报名">
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder="活动名称" />
              <input style={inputStyle} value={evtLoc} onChange={(e) => setEvtLoc(e.target.value)} placeholder="活动地点 / 形式" />
              <div style={unitBoxStyle}>
                <input style={unitInputStyle} type="number" value={evtMax} onChange={(e) => setEvtMax(e.target.value)} placeholder="名额上限（0为不限）" />
                <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>人</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={evtWaitlist} onChange={(e) => setEvtWaitlist(e.target.checked)} />
                满员后开启候补队列（有人取消自动递补）
              </label>
              <Button stretched onClick={handleCreateEvent}>📅 发布活动到群聊</Button>
            </div>
          </Section>
        )}

        {route === 'EVENTS' && targetId && evtDetail && (
          <Section header={`📅 ${evtDetail.event.title}`}>
            <Cell subtitle={`地点：${evtDetail.event.location || '群内通知'} · 名额上限：${evtDetail.event.max_participants || '不限'}`}>
              当前已报：{evtDetail.members.length} 人
            </Cell>
            <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
              <Button stretched onClick={() => handleEventAction('join')}>✅ 立即报名</Button>
              <Button stretched mode="outline" onClick={() => handleEventAction('cancel')}>取消报名</Button>
            </div>
            {evtDetail.members.map((m: any, i: number) => (
              <Cell key={i} after={m.status === 'CONFIRMED' ? '✅ 已确认' : '⏳ 候补中'}>
                {i + 1}. {m.first_name || m.telegram_id}
              </Cell>
            ))}
          </Section>
        )}

        {/* ==================== 群组投票 ==================== */}
        {route === 'POLLS' && !targetId && (
          <Section header="发起群组投票">
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={polQuestion} onChange={(e) => setPolQuestion(e.target.value)} placeholder="投票问题" />
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                value={polOptionsText}
                onChange={(e) => setPolOptionsText(e.target.value)}
                placeholder="每行输入一个选项"
              />
              <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={polMultiple} onChange={(e) => setPolMultiple(e.target.checked)} />
                  允许多选
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={polAnonymous} onChange={(e) => setPolAnonymous(e.target.checked)} />
                  匿名投票
                </label>
              </div>
              <Button stretched onClick={handleCreatePoll}>📊 发布投票到群聊</Button>
            </div>
          </Section>
        )}

        {route === 'POLLS' && targetId && polDetail && (
          <Section header={`📊 ${polDetail.poll.question}`}>
            <Cell subtitle={`${polDetail.poll.is_multiple ? '多选' : '单选'} · ${polDetail.poll.is_anonymous ? '真匿名投票' : '公开投票'}`}>
              点击选项后提交投票
            </Cell>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(polDetail.poll.options || []).map((opt: string, idx: number) => {
                const checked = polSelected.includes(idx);
                const count = polDetail.counts?.[idx] || 0;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (polDetail.poll.is_multiple) {
                        setPolSelected(checked ? polSelected.filter((i) => i !== idx) : [...polSelected, idx]);
                      } else {
                        setPolSelected([idx]);
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: checked ? '1.5px solid #2481cc' : '1px solid rgba(128,128,128,0.3)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{checked ? '☑️ ' : '⬜️ '}{opt}</span>
                    <span style={{ opacity: 0.7 }}>{count} 票</span>
                  </div>
                );
              })}
              <Button stretched onClick={handleVotePoll}>✅ 提交投票</Button>
            </div>
          </Section>
        )}

        {/* ==================== 群组运营与 Pro 会员 ==================== */}
        {route === 'ADMIN' && (
          <>
            <Section header="👑 GroupPilot Pro 商业订阅（Telegram Stars）">
              <GroupSelector />
              <Cell
                after={<Badge type="number">{adminData?.group?.plan === 'PRO' ? 'PRO 👑' : 'FREE'}</Badge>}
                subtitle={adminData?.group?.plan === 'PRO' ? '当前群组已解锁全部 Pro 高级功能' : '升级 Pro 解锁无限活动、多级抽奖与专属标识'}
              >
                当前群组套餐
              </Cell>
              {adminData?.group?.plan !== 'PRO' && (
                <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button stretched onClick={() => handleUpgradePro('NORMAL')}>⭐ 100 Stars 升级 Pro（30天）</Button>
                  <Button stretched mode="bezeled" onClick={() => handleUpgradePro('TEST')}>🧪 1 Star 真机支付测试</Button>
                </div>
              )}
            </Section>

            <Section header="入群欢迎语设置">
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} />
                  开启新成员入群自动欢迎
                </label>
                <textarea
                  style={{ ...inputStyle, minHeight: 75 }}
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  placeholder="支持使用 {name} 代表新成员昵称"
                />
                <Button stretched onClick={handleSaveSettings}>💾 保存群组设置</Button>
              </div>
            </Section>

            <Section header="🏆 群积分排行榜（Top 20）">
              {adminData?.leaderboard?.length > 0 ? (
                adminData.leaderboard.map((u: any, i: number) => (
                  <Cell key={i} after={`${u.balance} 积分`}>
                    {i + 1}. {u.first_name || u.telegram_id}
                  </Cell>
                ))
              ) : (
                <Cell subtitle="群友抢红包或中奖后，积分将自动显示在这里">暂无积分记录</Cell>
              )}
            </Section>
          </>
        )}
      </div>
    </AppRoot>
  );
}
