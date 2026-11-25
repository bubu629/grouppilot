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

export default function App() {
  const [route, setRoute] = useState<'HOME' | 'EVENTS' | 'PACKETS' | 'RAFFLES' | 'POLLS' | 'ADMIN'>('HOME');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<string>('检测中...');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  const [pktTitle, setPktTitle] = useState('群友专属福利红包');
  const [pktAmount, setPktAmount] = useState('1000');
  const [pktCount, setPktCount] = useState('10');
  const [pktType, setPktType] = useState<'LUCKY' | 'EQUAL'>('LUCKY');
  const [pktDetail, setPktDetail] = useState<any>(null);

  const [rflTitle, setRflTitle] = useState('周末幸运大抽奖');
  const [rflPrize, setRflPrize] = useState('1000 社区积分 / 神秘大奖');
  const [rflQuota, setRflQuota] = useState('3');
  const [rflDetail, setRflDetail] = useState<any>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTgUser(tg.initDataUnsafe?.user || null);

      const startParam: string = tg.initDataUnsafe?.start_param || '';
      if (startParam.startsWith('pkt_')) {
        setTargetId(startParam.slice(4));
        setRoute('PACKETS');
      } else if (startParam.startsWith('rfl_')) {
        setTargetId(startParam.slice(4));
        setRoute('RAFFLES');
      } else if (startParam.startsWith('evt_')) {
        setTargetId(startParam.slice(4));
        setRoute('EVENTS');
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

  useEffect(() => {
    setMsg('');
    if (route === 'PACKETS' && targetId) {
      apiFetch(`/api/red-packets/${targetId}`).then((d) => d.ok && setPktDetail(d));
    }
    if (route === 'RAFFLES' && targetId) {
      apiFetch(`/api/raffles/${targetId}`).then((d) => d.ok && setRflDetail(d));
    }
  }, [route, targetId]);

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
    } else {
      setMsg(`❌ 发送失败：${res.error}`);
    }
  };

  const handleClaimPacket = async () => {
    if (!pktDetail?.packet?.id) return;
    setMsg('正在开红包...');
    const res = await apiFetch(`/api/red-packets/${pktDetail.packet.id}/claim`, { method: 'POST' });
    if (res.ok) {
      setMsg(`🎉 恭喜你抢到了 ${res.amount} 社区积分！`);
      const updated = await apiFetch(`/api/red-packets/${pktDetail.packet.id}`);
      if (updated.ok) setPktDetail(updated);
    } else {
      setMsg(`提示：${res.error}`);
    }
  };

  const handleCreateRaffle = async () => {
    if (!selectedGroupId) return setMsg('请先将 Bot 拉入群组并设为管理员');
    setMsg('正在发布抽奖到群里...');
    const res = await apiFetch('/api/raffles', {
      method: 'POST',
      body: JSON.stringify({
        groupId: Number(selectedGroupId),
        title: rflTitle,
        triggerType: 'MANUAL',
        prizes: [{ prizeName: rflPrize, prizeType: 'CUSTOM', winnerQuota: Number(rflQuota) }],
      }),
    });
    if (res.ok) {
      setMsg('✅ 抽奖卡片已发送到群里！');
      setTargetId(res.id);
    } else {
      setMsg(`❌ 发布失败：${res.error}`);
    }
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
                after={<Badge type="number">1.0 积分版</Badge>}
                subtitle="拼手气 / 均分积分红包（2.0 支持 Gifts）"
                onClick={() => { setTargetId(null); setRoute('PACKETS'); }}
              >
                红包中心
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>🎰</span>}
                after={<Badge type="dot" />}
                subtitle="群主自定义奖品 · 手动/定时/满人开奖"
                onClick={() => { setTargetId(null); setRoute('RAFFLES'); }}
              >
                幸运抽奖
              </Cell>
            </Section>

            <Section header="群组协作与管理">
              <Cell before={<span style={{ fontSize: 24 }}>📅</span>} subtitle="名额上限 · 候补自动递补" onClick={() => setRoute('EVENTS')}>
                活动报名
              </Cell>
              <Cell before={<span style={{ fontSize: 24 }}>📊</span>} subtitle="单选 / 多选 / 真匿名投票" onClick={() => setRoute('POLLS')}>
                群组投票
              </Cell>
              <Cell before={<span style={{ fontSize: 24 }}>⚙️</span>} subtitle="群积分榜 · 入群欢迎语" onClick={() => setRoute('ADMIN')}>
                群组运营与设置
              </Cell>
            </Section>
          </>
        )}

        {route !== 'HOME' && (
          <Button size="s" mode="bezeled" onClick={() => { setTargetId(null); setPktDetail(null); setRflDetail(null); setRoute('HOME'); }}>
            ← 返回首页
          </Button>
        )}

        {route === 'PACKETS' && !targetId && (
          <Section header="发一个群组积分红包">
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={pktTitle} onChange={(e) => setPktTitle(e.target.value)} placeholder="红包祝福语" />
              <div style={{ display: 'flex', gap: 8 }}>
                
  <div style={{ display: "flex", alignItems: "center", flex: 1, border: "1px solid rgba(128,128,128,0.3)", borderRadius: 10, padding: "0 12px" }}>
    <input style={{ flex: 1, width: "100%", padding: "10px 0", border: "none", outline: "none", background: "transparent", color: "inherit", fontSize: 15 }} type="number" value={pktAmount} onChange={(e) => setPktAmount(e.target.value)} placeholder="总积分" />
    <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: "nowrap" }}>积分</span>
  </div>

                
  <div style={{ display: "flex", alignItems: "center", flex: 1, border: "1px solid rgba(128,128,128,0.3)", borderRadius: 10, padding: "0 12px" }}>
    <input style={{ flex: 1, width: "100%", padding: "10px 0", border: "none", outline: "none", background: "transparent", color: "inherit", fontSize: 15 }} type="number" value={pktCount} onChange={(e) => setPktCount(e.target.value)} placeholder="份数" />
    <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: "nowrap" }}>个</span>
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

        {route === 'RAFFLES' && !targetId && (
          <Section header="发起群组幸运抽奖">
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={rflTitle} onChange={(e) => setRflTitle(e.target.value)} placeholder="抽奖标题" />
              <input style={inputStyle} value={rflPrize} onChange={(e) => setRflPrize(e.target.value)} placeholder="奖品名称（群主自定义）" />
              
  <div style={{ display: "flex", alignItems: "center", flex: 1, border: "1px solid rgba(128,128,128,0.3)", borderRadius: 10, padding: "0 12px" }}>
    <input style={{ flex: 1, width: "100%", padding: "10px 0", border: "none", outline: "none", background: "transparent", color: "inherit", fontSize: 15 }} type="number" value={rflQuota} onChange={(e) => setRflQuota(e.target.value)} placeholder="中奖名额" />
    <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: "nowrap" }}>名</span>
  </div>

              <Button stretched onClick={handleCreateRaffle}>🎰 发布抽奖到群聊</Button>
            </div>
          </Section>
        )}

        {route === 'RAFFLES' && targetId && rflDetail && (
          <Section header={`🎰 ${rflDetail.raffle.title}`}>
            <Cell subtitle={`当前参与：${rflDetail.raffle.participant_count} 人 · 状态：${rflDetail.raffle.status}`}>
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

        {(route === 'EVENTS' || route === 'POLLS' || route === 'ADMIN') && (
          <Section header={`模块：${route}`}>
            <Cell subtitle="红包与抽奖已上线！活动报名、投票与群设置表单下一步接入。">
              即将开放
            </Cell>
          </Section>
        )}
      </div>
    </AppRoot>
  );
}
