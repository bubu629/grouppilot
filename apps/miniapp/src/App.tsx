import React, { useEffect, useState } from 'react';
import { AppRoot, Section, Cell, Button, Badge } from '@telegram-apps/telegram-ui';

const API_BASE = 'https://grouppilot-worker.zhangbanzhuan.workers.dev';

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Lang = 'zh' | 'en';
type Tab = 'ENGAGE' | 'STORE' | 'OPS' | 'PRO';
type SubView = 'NONE' | 'PACKETS' | 'RAFFLES' | 'EVENTS' | 'POLLS';

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
  border: '1px solid rgba(128,128,128,0.28)',
  background: 'transparent',
  color: 'inherit',
  fontSize: 14,
  boxSizing: 'border-box',
};

const unitBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flex: 1,
  border: '1px solid rgba(128,128,128,0.28)',
  borderRadius: 10,
  padding: '0 10px',
};

const unitInputStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '10px 0',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'inherit',
  fontSize: 14,
};

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('gp_lang');
    if (saved === 'zh' || saved === 'en') return saved;
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || navigator.language || 'zh';
    return tgLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  });
  const zh = lang === 'zh';
  const toggleLang = () => {
    const next: Lang = zh ? 'en' : 'zh';
    setLang(next);
    localStorage.setItem('gp_lang', next);
  };

  const [tab, setTab] = useState<Tab>('ENGAGE');
  const [subView, setSubView] = useState<SubView>('NONE');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  const [activeAds, setActiveAds] = useState<{ top: any; bottoms: any[] }>({ top: null, bottoms: [] });
  const [showAdBuy, setShowAdBuy] = useState(false);
  const [adPos, setAdPos] = useState<'TOP' | 'BOTTOM'>('TOP');
  const [adTitleInput, setAdTitleInput] = useState('');
  const [adUrlInput, setAdUrlInput] = useState('https://t.me/');

  const refreshAds = () => {
    apiFetch('/api/ads/active').then((d) => d.ok && setActiveAds({ top: d.top || null, bottoms: d.bottoms || [] }));
  };

  const handleShareApp = () => {
    const shareUrl = 'https://t.me/grouppilot6299bot';
    const shareText = zh
      ? '🚀 推荐一款超好用的 Telegram 群组运营神器 GroupPilot：支持拼手气红包、多级自动抽奖、每日签到积分商城、防外链反垃圾和定时播报，免费开用！'
      : '🚀 Check out GroupPilot — an all-in-one Telegram Mini App for group ops: Red Packets, Auto Raffles, Points Store, Anti-Spam & Broadcasts!';
    const tgShare = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(tgShare);
    } else {
      window.open(tgShare, '_blank');
    }
  };

  const handleBuyAd = async (mode: 'NORMAL' | 'TEST') => {
    if (!adTitleInput.trim() || !/^https?:\/\//i.test(adUrlInput.trim())) {
      return setMsg(zh ? '请填写广告标题和以 https:// 开头的跳转链接' : 'Enter ad title & valid https:// URL');
    }
    const res = await apiFetch('/api/ads/invoice', {
      method: 'POST',
      body: JSON.stringify({ position: adPos, title: adTitleInput.trim(), targetUrl: adUrlInput.trim(), mode }),
    });
    if (!res.ok) return setMsg(`❌ ${res.error}`);
    window.Telegram?.WebApp?.openInvoice?.(res.invoiceUrl, (st: string) => {
      if (st === 'paid') {
        setMsg(zh ? '🎉 广告位购买成功，已立即全站生效！' : '🎉 Ad purchased & live now!');
        setShowAdBuy(false);
        setAdTitleInput('');
        setTimeout(refreshAds, 1500);
      }
    });
  };


  // 红包
  const [pktTitle, setPktTitle] = useState(zh ? '群友专属福利红包' : 'Community Red Packet');
  const [pktAmount, setPktAmount] = useState('1000');
  const [pktCount, setPktCount] = useState('10');
  const [pktType, setPktType] = useState<'LUCKY' | 'EQUAL'>('LUCKY');
  const [pktDetail, setPktDetail] = useState<any>(null);

  // 抽奖
  const [rflTitle, setRflTitle] = useState(zh ? '周末幸运大抽奖' : 'Weekend Lucky Draw');
  const [rflTrigger, setRflTrigger] = useState<'MANUAL' | 'TIME' | 'PARTICIPANTS'>('MANUAL');
  const [rflDrawAt, setRflDrawAt] = useState(() => {
    const d = new Date(Date.now() + 2 * 3600 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [rflTargetCount, setRflTargetCount] = useState('20');
  const [rflPrizes, setRflPrizes] = useState([
    { prizeName: zh ? '一等奖：神秘大奖' : '1st Prize: Mystery Gift', winnerQuota: '1' },
    { prizeName: zh ? '二等奖：500 社区积分' : '2nd Prize: 500 PTS', winnerQuota: '3' },
  ]);
  const [rflDetail, setRflDetail] = useState<any>(null);

  // 活动
  const [evtTitle, setEvtTitle] = useState(zh ? '周末社区交流活动' : 'Weekend Meetup');
  const [evtLoc, setEvtLoc] = useState(zh ? '群内语音 / 待定' : 'Voice Chat / TBA');
  const [evtMax, setEvtMax] = useState('20');
  const [evtWaitlist, setEvtWaitlist] = useState(true);
  const [evtDetail, setEvtDetail] = useState<any>(null);

  // 投票
  const [polQuestion, setPolQuestion] = useState(zh ? '本周活动大家想选哪个时间？' : 'Best time for our event?');
  const [polOptionsText, setPolOptionsText] = useState(zh ? '周五晚 8 点\n周六下午 3 点\n周日下午 3 点' : 'Fri 8 PM\nSat 3 PM\nSun 3 PM');
  const [polMultiple, setPolMultiple] = useState(false);
  const [polAnonymous, setPolAnonymous] = useState(true);
  const [polDetail, setPolDetail] = useState<any>(null);
  const [polSelected, setPolSelected] = useState<number[]>([]);

  // 签到与商城
  const [storeData, setStoreData] = useState<any>({ isAdmin: false, balance: 0, items: [], orders: [] });
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('100');

  // 运营（反垃圾 + 定时播报 + 欢迎语 + 排行榜）
  const [adminData, setAdminData] = useState<any>(null);
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeText, setWelcomeText] = useState('欢迎 {name} 加入本群！🎉');
  const [antiSpam, setAntiSpam] = useState(false);
  const [banLinks, setBanLinks] = useState(true);
  const [bannedKws, setBannedKws] = useState('');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [bcText, setBcText] = useState('');
  const [bcHours, setBcHours] = useState('24');

  // Pro 专享
  const [forceChannel, setForceChannel] = useState('');
  const [customFooter, setCustomFooter] = useState('');
  const [paidStars, setPaidStars] = useState('50');
  const [customBotToken, setCustomBotToken] = useState('');
  const [customBotUsername, setCustomBotUsername] = useState('');
  const [inviteData, setInviteData] = useState<any>({ myLink: null, leaderboard: [] });
  const [proStats, setProStats] = useState<any>(null);
  const [multiBcText, setMultiBcText] = useState('');
  const [banUid, setBanUid] = useState('');
  const [codeItemId, setCodeItemId] = useState('');
  const [codesText, setCodesText] = useState('');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const urlParam = new URLSearchParams(window.location.search).get('tgWebAppStartParam') || '';
      const sp: string = tg.initDataUnsafe?.start_param || urlParam;
      if (sp.startsWith('pkt_')) { setTargetId(sp.slice(4)); setTab('ENGAGE'); setSubView('PACKETS'); }
      else if (sp.startsWith('rfl_')) { setTargetId(sp.slice(4)); setTab('ENGAGE'); setSubView('RAFFLES'); }
      else if (sp.startsWith('evt_')) { setTargetId(sp.slice(4)); setTab('ENGAGE'); setSubView('EVENTS'); }
      else if (sp.startsWith('pol_')) { setTargetId(sp.slice(4)); setTab('ENGAGE'); setSubView('POLLS'); }
    }
    refreshAds();
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
      if (d.ok && d.group) {
        setAdminData(d);
        setWelcomeEnabled(Boolean(d.group.welcome_enabled));
        setWelcomeText(d.group.welcome_text || '欢迎 {name} 加入本群！🎉');
        setAntiSpam(Boolean(d.group.anti_spam_enabled));
        setBanLinks(Boolean(d.group.ban_links));
        setBannedKws(d.group.banned_keywords || '');
        setForceChannel(d.group.force_channel_id || '');
        setCustomFooter(d.group.custom_footer || '');
        setPaidStars(String(d.group.paid_join_stars || 0));
        setCustomBotUsername(d.group.custom_bot_username || '');
      }
    });
    apiFetch(`/api/groups/${gid}/broadcasts`).then((d) => d.ok && setBroadcasts(d.broadcasts || []));
  };

  const refreshStore = (gid: string) => {
    if (!gid) return;
    apiFetch(`/api/groups/${gid}/store`).then((d) => {
      if (d.ok) {
        setStoreData(d);
        if (d.items?.length && !codeItemId) setCodeItemId(d.items[0].id);
      }
    });
  };

  useEffect(() => {
    setMsg('');
    if (subView === 'PACKETS' && targetId) apiFetch(`/api/red-packets/${targetId}`).then((d) => d.ok && setPktDetail(d));
    if (subView === 'RAFFLES' && targetId) apiFetch(`/api/raffles/${targetId}`).then((d) => d.ok && setRflDetail(d));
    if (subView === 'EVENTS' && targetId) apiFetch(`/api/events/${targetId}`).then((d) => d.ok && setEvtDetail(d));
    if (subView === 'POLLS' && targetId) apiFetch(`/api/polls/${targetId}`).then((d) => d.ok && setPolDetail(d));
    if (selectedGroupId) {
      if (tab === 'STORE') refreshStore(selectedGroupId);
      if (tab === 'OPS') refreshAdmin(selectedGroupId);
      if (tab === 'PRO') {
        refreshAdmin(selectedGroupId);
        refreshStore(selectedGroupId);
        apiFetch(`/api/groups/${selectedGroupId}/invites`).then((d) => d.ok && setInviteData(d));
        apiFetch(`/api/groups/${selectedGroupId}/stats`).then((d) => d.ok && setProStats(d.stats));
      }
    }
  }, [tab, subView, targetId, selectedGroupId]);

  const currentGroup = groups.find((g) => String(g.group_id) === selectedGroupId);
  const isPro = currentGroup?.plan === 'PRO' || adminData?.group?.plan === 'PRO';

  const AdSlot = ({ pos }: { pos: 'TOP' | 'BOTTOM' }) => {
    if (isPro) return null;
    const isTop = pos === 'TOP';

    // 顶部：独家 1 个黄金位
    if (isTop) {
      const ad = activeAds.top;
      return (
        <div style={{ padding: '8px 10px', borderRadius: 12, border: '1px dashed rgba(128,128,128,0.35)', background: 'rgba(15, 23, 42, 0.68)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <div
            onClick={() => {
              if (ad?.target_url) window.open(ad.target_url, '_blank');
              else { setAdPos('TOP'); setShowAdBuy(true); }
            }}
            style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(128,128,128,0.2)', whiteSpace: 'nowrap', flexShrink: 0 }}>{zh ? '顶置广告' : 'TOP AD'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ad ? ad.title : (zh ? '🔥 顶部独家赞助位招租 · 50 Stars/7天' : '🔥 Exclusive Top Slot · 50 Stars/7d')}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => { setAdPos('TOP'); setShowAdBuy(true); }} style={{ padding: '4px 7px', borderRadius: 8, border: 'none', background: 'rgba(255,152,0,0.16)', color: '#e65100', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {zh ? '投放' : 'Buy'}
            </button>
            <button onClick={() => { setShowAdBuy(false); setSubView('NONE'); setTab('PRO'); }} style={{ padding: '4px 7px', borderRadius: 8, border: 'none', background: 'rgba(36,129,204,0.15)', color: '#2481cc', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {zh ? '去广告' : 'No Ads'}
            </button>
          </div>
        </div>
      );
    }

    // 尾部：支持多条广告同时展示 + 底部常驻招租入口
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {activeAds.bottoms.map((ad: any) => (
          <div
            key={ad.id}
            onClick={() => window.open(ad.target_url, '_blank')}
            style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid rgba(128,128,128,0.22)', background: 'rgba(15, 23, 42, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(128,128,128,0.18)' }}>{zh ? '赞助' : 'AD'}</span>
              <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</span>
            </div>
            <span style={{ fontSize: 11, opacity: 0.5, whiteSpace: 'nowrap' }}>↗</span>
          </div>
        ))}
        <div style={{ padding: '7px 10px', borderRadius: 12, border: '1px dashed rgba(128,128,128,0.35)', background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span onClick={() => { setAdPos('BOTTOM'); setShowAdBuy(true); }} style={{ fontSize: 12, opacity: 0.75, cursor: 'pointer' }}>
            {activeAds.bottoms.length >= 3 ? (zh ? '🔒 尾部广告位已满（3/3）' : '🔒 Bottom Ad Slots Full (3/3)') : (zh ? `📢 尾部推广位招租（剩 ${3 - activeAds.bottoms.length}/3 位 · 30 Stars/7天）` : `📢 Bottom Slots (${3 - activeAds.bottoms.length}/3 left · 30 Stars/7d)`)}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {activeAds.bottoms.length < 3 && (
            <button onClick={() => { setAdPos('BOTTOM'); setShowAdBuy(true); }} style={{ padding: '4px 7px', borderRadius: 8, border: 'none', background: 'rgba(255,152,0,0.16)', color: '#e65100', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {zh ? '投放' : 'Buy'}
            </button>
          )}
            <button onClick={() => { setShowAdBuy(false); setSubView('NONE'); setTab('PRO'); }} style={{ padding: '4px 7px', borderRadius: 8, border: 'none', background: 'rgba(36,129,204,0.15)', color: '#2481cc', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {zh ? '去广告' : 'No Ads'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- 核心动作 ---
  const handleCreatePacket = async () => {
    if (!selectedGroupId) return setMsg(zh ? '请先将 Bot 拉进群并设为管理员' : 'Add Bot as Admin first');
    const res = await apiFetch('/api/red-packets', { method: 'POST', body: JSON.stringify({ groupId: Number(selectedGroupId), title: pktTitle, totalAmount: Number(pktAmount), totalCount: Number(pktCount), packetType: pktType }) });
    if (res.ok) { setMsg(zh ? '✅ 红包已发送到群聊！' : '✅ Red packet sent!'); setTargetId(res.id); } else setMsg(`❌ ${res.error}`);
  };
  const handleClaimPacket = async () => {
    const res = await apiFetch(`/api/red-packets/${pktDetail.packet.id}/claim`, { method: 'POST' });
    setMsg(res.ok ? (zh ? `🎉 抢到了 ${res.amount} 积分！` : `🎉 Claimed ${res.amount} PTS!`) : `提示：${res.error}`);
    apiFetch(`/api/red-packets/${pktDetail.packet.id}`).then((d) => d.ok && setPktDetail(d));
  };
  const handleCreateRaffle = async () => {
    if (!selectedGroupId) return setMsg(zh ? '请先选择群组' : 'Select a group');
    const prizes = rflPrizes.filter((p) => p.prizeName.trim()).map((p) => ({ prizeName: p.prizeName.trim(), prizeType: 'CUSTOM', winnerQuota: Math.max(1, Number(p.winnerQuota) || 1) }));
    const res = await apiFetch('/api/raffles', { method: 'POST', body: JSON.stringify({ groupId: Number(selectedGroupId), title: rflTitle, triggerType: rflTrigger, drawAt: rflTrigger === 'TIME' ? new Date(rflDrawAt).getTime() : null, targetParticipants: rflTrigger === 'PARTICIPANTS' ? Number(rflTargetCount) || 10 : null, prizes }) });
    if (res.ok) { setMsg(zh ? '✅ 抽奖已发送到群聊！' : '✅ Raffle posted!'); setTargetId(res.id); } else setMsg(`❌ ${res.error}`);
  };
  const handleCreateEvent = async () => {
    const now = Date.now();
    const res = await apiFetch('/api/events', { method: 'POST', body: JSON.stringify({ groupId: Number(selectedGroupId), title: evtTitle, location: evtLoc, eventTime: now + 48 * 3600 * 1000, deadlineTime: now + 24 * 3600 * 1000, maxParticipants: Number(evtMax) || 0, allowWaitlist: evtWaitlist }) });
    if (res.ok) { setMsg(zh ? '✅ 活动已发送到群聊！' : '✅ Event posted!'); setTargetId(res.id); } else setMsg(`❌ ${res.error}`);
  };
  const handleCreatePoll = async () => {
    const options = polOptionsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const res = await apiFetch('/api/polls', { method: 'POST', body: JSON.stringify({ groupId: Number(selectedGroupId), question: polQuestion, options, isMultiple: polMultiple, isAnonymous: polAnonymous }) });
    if (res.ok) { setMsg(zh ? '✅ 投票已发送到群聊！' : '✅ Poll posted!'); setPolSelected([]); setTargetId(res.id); } else setMsg(`❌ ${res.error}`);
  };
  const handleCheckin = async () => {
    const res = await apiFetch(`/api/groups/${selectedGroupId}/checkin`, { method: 'POST' });
    setMsg(res.ok ? (zh ? `🎉 签到成功！连续 ${res.streak} 天 (+${res.points} 积分)` : `🎉 Streak ${res.streak}d (+${res.points} PTS)`) : `提示：${res.error}`);
    refreshStore(selectedGroupId);
  };
  const handleUpgradePro = async (mode: 'NORMAL' | 'TEST') => {
    const res = await apiFetch('/api/payments/pro-invoice', { method: 'POST', body: JSON.stringify({ groupId: Number(selectedGroupId), mode }) });
    if (!res.ok) return setMsg(`❌ ${res.error}`);
    window.Telegram?.WebApp?.openInvoice?.(res.invoiceUrl, (st: string) => {
      if (st === 'paid') { setMsg(zh ? '👑 支付成功！已升级 Pro！' : '👑 Upgraded to Pro!'); setTimeout(() => refreshAdmin(selectedGroupId), 1500); }
    });
  };
  const handleExportCsv = async () => {
    const res = await apiFetch(`/api/groups/${selectedGroupId}/export/leaderboard`);
    setMsg(res.ok ? (zh ? '✅ CSV 表格已由 Bot 私聊发送给你，请返回聊天查看！' : '✅ CSV sent to your Telegram DM!') : `❌ ${res.error}`);
  };

  const GridCard = ({ icon, title, desc, badge, onClick }: any) => (
    <div onClick={onClick} style={{ padding: 14, borderRadius: 14, background: 'rgba(15, 23, 42, 0.72)', backdropFilter: 'blur(10px)', border: '1px solid rgba(128,128,128,0.16)', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        {badge && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 99, background: 'rgba(36,129,204,0.15)', color: '#2481cc', fontWeight: 600 }}>{badge}</span>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, opacity: 0.65, lineHeight: 1.3 }}>{desc}</div>
    </div>
  );

  return (
    <AppRoot>

      <style>{`
        .gp-geo-shell {
          min-height: 100vh;
          color: #e2e8f0;
          --tgui--bg_color: rgba(15, 23, 42, 0.72);
          --tgui--secondary_bg_color: #050814;
          --tgui--section_bg_color: rgba(15, 23, 42, 0.68);
          --tgui--text_color: #f1f5f9;
          --tgui--subtitle_text_color: #94a3b8;
          --tgui--hint_color: #94a3b8;
          --tgui--section_header_text_color: #7dd3fc;
          background-color: #050814;
          background-image:
            radial-gradient(at 15% 10%, rgba(56, 189, 248, 0.22) 0px, transparent 48%),
            radial-gradient(at 88% 18%, rgba(139, 92, 246, 0.24) 0px, transparent 46%),
            radial-gradient(at 50% 90%, rgba(14, 165, 233, 0.16) 0px, transparent 52%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='14' cy='22' r='1' fill-opacity='0.65'/%3E%3Ccircle cx='68' cy='16' r='0.8' fill-opacity='0.45'/%3E%3Ccircle cx='102' cy='44' r='1.2' fill-opacity='0.75'/%3E%3Ccircle cx='34' cy='76' r='0.9' fill-opacity='0.5'/%3E%3Ccircle cx='88' cy='96' r='1.1' fill-opacity='0.6'/%3E%3Ccircle cx='18' cy='108' r='0.7' fill-opacity='0.4'/%3E%3C/g%3E%3Cpath d='M0 60h120M60 0v120' stroke='%2338bdf8' stroke-opacity='0.06' stroke-width='0.8'/%3E%3C/svg%3E");
          background-size: 100% 100%, 100% 100%, 100% 100%, 120px 120px;
          background-attachment: fixed;
        }
        .gp-geo-shell section {
          background: rgba(15, 23, 42, 0.68) !important;
          backdrop-filter: blur(12px);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 14px !important;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
        }
        .gp-geo-shell select option {
          background: #0f172a;
          color: #f1f5f9;
        }
      `}</style>
      <div className="gp-geo-shell">

      {/* 顶部紧凑全局栏 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(12px)', background: 'rgba(9, 14, 28, 0.82)', padding: '10px 12px', borderBottom: '1px solid rgba(128,128,128,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit', fontSize: 13, fontWeight: 600 }}
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          {groups.length ? groups.map((g) => <option key={g.group_id} value={g.group_id}>{g.plan === 'PRO' ? '👑 ' : ''}{g.title}</option>) : <option value="">{zh ? '请先拉 Bot 进群设管理员' : 'Add Bot as Admin'}</option>}
        </select>
        <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, background: isPro ? 'rgba(255,193,7,0.2)' : 'rgba(128,128,128,0.15)', fontWeight: 700 }}>
          {isPro ? 'PRO' : 'FREE'}
        </span>
        <button onClick={handleShareApp} style={{ padding: '4px 8px', borderRadius: 8, border: 'none', background: 'rgba(36,129,204,0.15)', color: '#2481cc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          📤 {zh ? '分享' : 'Share'}
        </button>
        <button onClick={toggleLang} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit', fontSize: 12, cursor: 'pointer' }}>
          {zh ? 'EN' : '中'}
        </button>
      </div>

      {/* 主内容区（底部留白给 Tab 栏） */}
      <div style={{ padding: '10px 12px 84px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <AdSlot pos="TOP" />

        
        {showAdBuy && (
          <Section header={zh ? '📢 自助投放广告位（付款即上线）' : '📢 Buy Ad Slot (Instant Live)'}>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select style={inputStyle} value={adPos} onChange={(e) => setAdPos(e.target.value as any)}>
                <option value="TOP">{zh ? '🔥 顶部黄金广告位（50 Stars / 7天）' : '🔥 Top Banner Slot (50 Stars / 7d)'}</option>
                <option value="BOTTOM">{zh ? '📢 底部品牌广告位（30 Stars / 7天）' : '📢 Bottom Banner Slot (30 Stars / 7d)'}</option>
              </select>
              <input style={inputStyle} value={adTitleInput} onChange={(e) => setAdTitleInput(e.target.value)} placeholder={zh ? '广告标题（建议 20 字以内）' : 'Ad headline (max 36 chars)'} />
              <input style={inputStyle} value={adUrlInput} onChange={(e) => setAdUrlInput(e.target.value)} placeholder="https://t.me/your_channel" />
              <Button stretched onClick={() => handleBuyAd('NORMAL')}>⭐ {adPos === 'TOP' ? '50' : '30'} Stars {zh ? '立即购买并上线（7天）' : 'Buy & Go Live (7d)'}</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button stretched size="s" mode="bezeled" onClick={() => handleBuyAd('TEST')}>🧪 1 Star {zh ? '测试投放' : 'Test'}</Button>
                <Button stretched size="s" mode="outline" onClick={() => setShowAdBuy(false)}>{zh ? '关闭' : 'Close'}</Button>
              </div>
            </div>
          </Section>
        )}

        {msg && (
          <div
            onClick={() => setMsg('')}
            style={{
              position: 'fixed',
              top: 56,
              left: 16,
              right: 16,
              zIndex: 99,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(15, 23, 42, 0.94)',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              color: '#f8fafc',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            {msg.includes('PRO_REQUIRED')
              ? (zh ? '👑 该功能为 Pro 专享，请先点击上方按钮升级 Pro' : '👑 Pro feature only. Please upgrade to Pro first.')
              : msg}
          </div>
        )}

        {/* ==================== TAB 1: 互动中心（2列宫格） ==================== */}
        {tab === 'ENGAGE' && subView === 'NONE' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <GridCard icon="🧧" title={zh ? '积分红包' : 'Red Packets'} desc={zh ? '拼手气/均分红包，自动发战报' : 'Lucky & equal points packets'} badge={zh ? '热门' : 'HOT'} onClick={() => { setTargetId(null); setSubView('PACKETS'); }} />
            <GridCard icon="🎰" title={zh ? '幸运抽奖' : 'Lucky Draw'} desc={zh ? '多级奖品 · 定时/满人自动开奖' : 'Multi-tier & auto-draw'} badge="2.0" onClick={() => { setTargetId(null); setSubView('RAFFLES'); }} />
            <GridCard icon="📅" title={zh ? '活动报名' : 'Event RSVP'} desc={zh ? '名额上限 · 候补自动递补' : 'Capacity & auto waitlist'} onClick={() => { setTargetId(null); setSubView('EVENTS'); }} />
            <GridCard icon="📊" title={zh ? '群组投票' : 'Group Polls'} desc={zh ? '单选/多选/真匿名群投票' : 'Single, multi & anonymous'} onClick={() => { setTargetId(null); setSubView('POLLS'); }} />
          </div>
        )}

        {tab === 'ENGAGE' && subView !== 'NONE' && (
          <Button size="s" mode="bezeled" onClick={() => { setTargetId(null); setSubView('NONE'); }}>
            {zh ? '← 返回互动中心' : '← Back'}
          </Button>
        )}

        {/* 红包子页 */}
        {tab === 'ENGAGE' && subView === 'PACKETS' && !targetId && (
          <Section header={zh ? '🧧 发群组积分红包' : '🧧 Send Red Packet'}>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={pktTitle} onChange={(e) => setPktTitle(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={unitBoxStyle}><input style={unitInputStyle} type="number" value={pktAmount} onChange={(e) => setPktAmount(e.target.value)} /><span style={{ fontSize: 12, opacity: 0.6 }}>PTS</span></div>
                <div style={unitBoxStyle}><input style={unitInputStyle} type="number" value={pktCount} onChange={(e) => setPktCount(e.target.value)} /><span style={{ fontSize: 12, opacity: 0.6 }}>{zh ? '个' : 'pcs'}</span></div>
              </div>
              <select style={inputStyle} value={pktType} onChange={(e) => setPktType(e.target.value as any)}>
                <option value="LUCKY">{zh ? '拼手气红包' : 'Lucky Draw'}</option>
                <option value="EQUAL">{zh ? '普通均分红包' : 'Equal Split'}</option>
              </select>
              <Button stretched onClick={handleCreatePacket}>{zh ? '🧧 发送到群聊' : '🧧 Send to Group'}</Button>
            </div>
          </Section>
        )}
        {tab === 'ENGAGE' && subView === 'PACKETS' && targetId && pktDetail && (
          <Section header={`🧧 ${pktDetail.packet.title}`}>
            <Cell subtitle={`${pktDetail.packet.claimed_count}/${pktDetail.packet.total_count} · ${pktDetail.packet.status}`}>{pktDetail.packet.total_amount} PTS</Cell>
            {pktDetail.packet.status === 'ACTIVE' && <div style={{ padding: '8px 16px' }}><Button stretched onClick={handleClaimPacket}>{zh ? '🧧 立即开红包' : '🧧 Open'}</Button></div>}
            {pktDetail.claims.map((c: any, i: number) => <Cell key={i} after={`${c.amount} PTS`}>{i === 0 ? '👑 ' : ''}{c.first_name || c.telegram_id}</Cell>)}
          </Section>
        )}

        {/* 抽奖子页 */}
        {tab === 'ENGAGE' && subView === 'RAFFLES' && !targetId && (
          <Section header={zh ? '🎰 发起幸运抽奖' : '🎰 Create Raffle'}>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={rflTitle} onChange={(e) => setRflTitle(e.target.value)} />
              <select style={inputStyle} value={rflTrigger} onChange={(e) => setRflTrigger(e.target.value as any)}>
                <option value="MANUAL">{zh ? '手动开奖' : 'Manual Draw'}</option>
                <option value="TIME">{zh ? '定时自动开奖' : 'Scheduled Auto-Draw'}</option>
                <option value="PARTICIPANTS">{zh ? '满人自动开奖' : 'Goal Auto-Draw'}</option>
              </select>
              {rflTrigger === 'TIME' && <input style={inputStyle} type="datetime-local" value={rflDrawAt} onChange={(e) => setRflDrawAt(e.target.value)} />}
              {rflTrigger === 'PARTICIPANTS' && <div style={unitBoxStyle}><input style={unitInputStyle} type="number" value={rflTargetCount} onChange={(e) => setRflTargetCount(e.target.value)} /><span style={{ fontSize: 12, opacity: 0.6 }}>{zh ? '人开奖' : 'users'}</span></div>}
              {rflPrizes.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...inputStyle, flex: 2 }} value={p.prizeName} onChange={(e) => { const n = [...rflPrizes]; n[idx].prizeName = e.target.value; setRflPrizes(n); }} />
                  <input style={{ ...inputStyle, flex: 1 }} type="number" value={p.winnerQuota} onChange={(e) => { const n = [...rflPrizes]; n[idx].winnerQuota = e.target.value; setRflPrizes(n); }} />
                </div>
              ))}
              <Button size="s" mode="bezeled" onClick={() => setRflPrizes([...rflPrizes, { prizeName: zh ? '三等奖：幸运奖' : '3rd Prize', winnerQuota: '5' }])}>+ {zh ? '添加奖项' : 'Add Tier'}</Button>
              <Button stretched onClick={handleCreateRaffle}>{zh ? '🎰 发布抽奖到群聊' : '🎰 Post Raffle'}</Button>
            </div>
          </Section>
        )}
        {tab === 'ENGAGE' && subView === 'RAFFLES' && targetId && rflDetail && (
          <Section header={`🎰 ${rflDetail.raffle.title}`}>
            <Cell subtitle={`${rflDetail.raffle.participant_count} · ${rflDetail.raffle.trigger_type} · ${rflDetail.raffle.status}`}>{rflDetail.prizes.map((p: any) => `${p.prize_name}×${p.winner_quota}`).join(' / ')}</Cell>
            {rflDetail.raffle.status === 'OPEN' && (
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button stretched onClick={async () => { const r = await apiFetch(`/api/raffles/${rflDetail.raffle.id}/enter`, { method: 'POST' }); setMsg(r.ok ? '✅ 参与成功' : r.error); apiFetch(`/api/raffles/${rflDetail.raffle.id}`).then((d) => d.ok && setRflDetail(d)); }}>{zh ? '🎰 免费参与抽奖' : '🎰 Enter'}</Button>
                <Button stretched mode="outline" onClick={async () => { const r = await apiFetch(`/api/raffles/${rflDetail.raffle.id}/draw`, { method: 'POST' }); setMsg(r.ok ? '🎉 已开奖' : r.error); apiFetch(`/api/raffles/${rflDetail.raffle.id}`).then((d) => d.ok && setRflDetail(d)); }}>{zh ? '🎲 群主立即开奖' : '🎲 Draw Now'}</Button>
              </div>
            )}
            {rflDetail.winners.map((w: any, i: number) => <Cell key={i} subtitle={w.claim_code} after={w.prize_name}>🏆 {w.first_name || w.telegram_id}</Cell>)}
          </Section>
        )}

        {/* 活动与投票子页 */}
        {tab === 'ENGAGE' && subView === 'EVENTS' && !targetId && (
          <Section header={zh ? '📅 发布活动报名' : '📅 Create Event'}>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} />
              <input style={inputStyle} value={evtLoc} onChange={(e) => setEvtLoc(e.target.value)} />
              <input style={inputStyle} type="number" value={evtMax} onChange={(e) => setEvtMax(e.target.value)} placeholder="Max" />
              <label style={{ fontSize: 13 }}><input type="checkbox" checked={evtWaitlist} onChange={(e) => setEvtWaitlist(e.target.checked)} /> {zh ? '满员自动候补' : 'Auto waitlist'}</label>
              <Button stretched onClick={handleCreateEvent}>{zh ? '📅 发布到群聊' : '📅 Post Event'}</Button>
            </div>
          </Section>
        )}
        {tab === 'ENGAGE' && subView === 'EVENTS' && targetId && evtDetail && (
          <Section header={`📅 ${evtDetail.event.title}`}>
            <Cell subtitle={evtDetail.event.location}>{zh ? '已报' : 'Joined'}: {evtDetail.members.length}</Cell>
            <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
              <Button stretched onClick={async () => { const r = await apiFetch(`/api/events/${evtDetail.event.id}/join`, { method: 'POST' }); setMsg(r.ok ? '✅ 报名成功' : r.error); apiFetch(`/api/events/${evtDetail.event.id}`).then((d) => d.ok && setEvtDetail(d)); }}>{zh ? '✅ 报名' : '✅ RSVP'}</Button>
              <Button stretched mode="outline" onClick={async () => { const r = await apiFetch(`/api/events/${evtDetail.event.id}/cancel`, { method: 'POST' }); setMsg(r.ok ? '已取消' : r.error); apiFetch(`/api/events/${evtDetail.event.id}`).then((d) => d.ok && setEvtDetail(d)); }}>{zh ? '取消' : 'Cancel'}</Button>
            </div>
            {evtDetail.members.map((m: any, i: number) => <Cell key={i} after={m.status}>{i + 1}. {m.first_name || m.telegram_id}</Cell>)}
          </Section>
        )}
        {tab === 'ENGAGE' && subView === 'POLLS' && !targetId && (
          <Section header={zh ? '📊 发起群组投票' : '📊 Create Poll'}>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={polQuestion} onChange={(e) => setPolQuestion(e.target.value)} />
              <textarea style={{ ...inputStyle, minHeight: 80 }} value={polOptionsText} onChange={(e) => setPolOptionsText(e.target.value)} />
              <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                <label><input type="checkbox" checked={polMultiple} onChange={(e) => setPolMultiple(e.target.checked)} /> {zh ? '多选' : 'Multi'}</label>
                <label><input type="checkbox" checked={polAnonymous} onChange={(e) => setPolAnonymous(e.target.checked)} /> {zh ? '匿名' : 'Anon'}</label>
              </div>
              <Button stretched onClick={handleCreatePoll}>{zh ? '📊 发布投票' : '📊 Post Poll'}</Button>
            </div>
          </Section>
        )}
        {tab === 'ENGAGE' && subView === 'POLLS' && targetId && polDetail && (
          <Section header={`📊 ${polDetail.poll.question}`}>
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(polDetail.poll.options || []).map((opt: string, idx: number) => (
                <div key={idx} onClick={() => setPolSelected(polDetail.poll.is_multiple ? (polSelected.includes(idx) ? polSelected.filter((i) => i !== idx) : [...polSelected, idx]) : [idx])} style={{ padding: 10, borderRadius: 10, border: polSelected.includes(idx) ? '1.5px solid #2481cc' : '1px solid rgba(128,128,128,0.3)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{polSelected.includes(idx) ? '☑️ ' : '⬜️ '}{opt}</span><span>{polDetail.counts?.[idx] || 0}</span>
                </div>
              ))}
              <Button stretched onClick={async () => { const r = await apiFetch(`/api/polls/${polDetail.poll.id}/vote`, { method: 'POST', body: JSON.stringify({ optionIndices: polSelected }) }); setMsg(r.ok ? '✅ 投票成功' : r.error); apiFetch(`/api/polls/${polDetail.poll.id}`).then((d) => d.ok && setPolDetail(d)); }}>{zh ? '✅ 提交投票' : '✅ Vote'}</Button>
            </div>
          </Section>
        )}

        {/* ==================== TAB 2: 福利与商城（群友/群主权限分离） ==================== */}
        {tab === 'STORE' && (
          <>
            <Section header={zh ? '📅 每日签到' : '📅 Daily Check-in'}>
              <Cell subtitle={zh ? '连续 3 天 +20 分 · 7 天 +30 分' : '3d streak +20 · 7d +30 PTS'}>
                {zh ? `我的可用积分：${storeData.balance}` : `Balance: ${storeData.balance} PTS`}
              </Cell>
              <div style={{ padding: '8px 16px' }}>
                <Button stretched onClick={handleCheckin}>{zh ? '✅ 立即每日签到' : '✅ Check In Today'}</Button>
              </div>
            </Section>

            <Section header={zh ? '🎁 群积分商城' : '🎁 Points Store'}>
              {storeData.items?.length > 0 ? storeData.items.map((it: any) => (
                <Cell
                  key={it.id}
                  subtitle={`${it.cost_points} PTS`}
                  after={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="s" onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/store/redeem`, { method: 'POST', body: JSON.stringify({ itemId: it.id }) }); setMsg(r.ok ? `🎉 兑换成功：${r.redeemCode}` : r.error); refreshStore(selectedGroupId); }}>{zh ? '兑换' : 'Redeem'}</Button>
                      {storeData.isAdmin && <Button size="s" mode="bezeled" onClick={async () => { await apiFetch(`/api/groups/${selectedGroupId}/store/items/${it.id}`, { method: 'DELETE' }); refreshStore(selectedGroupId); }}>×</Button>}
                    </div>
                  }
                >
                  {it.name}
                </Cell>
              )) : <Cell>{zh ? '暂未上架商品' : 'No items yet'}</Cell>}

              {storeData.isAdmin && (
                <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.65 }}>{zh ? '👑 群主专属：上架新商品' : '👑 Admin: Add Item'}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input style={{ ...inputStyle, flex: 2 }} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder={zh ? '商品名称' : 'Item name'} />
                    <input style={{ ...inputStyle, flex: 1 }} type="number" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)} />
                  </div>
                  <Button size="s" mode="bezeled" onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/store/items`, { method: 'POST', body: JSON.stringify({ name: newItemName, costPoints: Number(newItemCost) }) }); setMsg(r.ok ? '✅ 已上架' : r.error); setNewItemName(''); refreshStore(selectedGroupId); }}>+ {zh ? '上架商品' : 'Add Item'}</Button>
                </div>
              )}
            </Section>

            {storeData.orders?.length > 0 && (
              <Section header={zh ? '🧾 我的兑换记录' : '🧾 My Orders'}>
                {storeData.orders.map((o: any) => <Cell key={o.id} subtitle={o.redeem_code} after={`-${o.cost_points}`}>{o.item_name}</Cell>)}
              </Section>
            )}
          </>
        )}

        {/* ==================== TAB 3: 群组运营（反垃圾 + 播报 + 欢迎语 + 榜单） ==================== */}
        {tab === 'OPS' && (
          <>
            <Section header={zh ? '🛡️ 反垃圾与防外链' : '🛡️ Anti-Spam'}>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={antiSpam} onChange={(e) => setAntiSpam(e.target.checked)} /> {zh ? '开启自动删帖拦截（放行管理员）' : 'Enable Auto-Delete (Admins exempt)'}</label>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={banLinks} onChange={(e) => setBanLinks(e.target.checked)} /> {zh ? '拦截外链、t.me 与 @广告' : 'Block URLs & @mentions'}</label>
                <input style={inputStyle} value={bannedKws} onChange={(e) => setBannedKws(e.target.value)} placeholder={zh ? '违禁词（逗号分隔）' : 'Banned keywords'} />
                <Button size="s" onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/antispam`, { method: 'POST', body: JSON.stringify({ enabled: antiSpam, banLinks, keywords: bannedKws }) }); setMsg(r.ok ? '✅ 已保存' : r.error); }}>{zh ? '💾 保存规则' : '💾 Save'}</Button>
              </div>
            </Section>

            <Section header={zh ? '📢 定时周期播报（发新删旧）' : '📢 Auto Broadcasts'}>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea style={{ ...inputStyle, minHeight: 60 }} value={bcText} onChange={(e) => setBcText(e.target.value)} placeholder={zh ? '播报内容' : 'Message'} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={unitBoxStyle}><input style={unitInputStyle} type="number" value={bcHours} onChange={(e) => setBcHours(e.target.value)} /><span style={{ fontSize: 12, opacity: 0.6 }}>h</span></div>
                  <Button size="s" onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/broadcasts`, { method: 'POST', body: JSON.stringify({ content: bcText, intervalHours: Number(bcHours) }) }); setMsg(r.ok ? '✅ 已发送并定时' : r.error); setBcText(''); refreshAdmin(selectedGroupId); }}>{zh ? '发送并定时' : 'Schedule'}</Button>
                </div>
              </div>
              {broadcasts.map((b: any) => <Cell key={b.id} subtitle={`${b.interval_hours}h`} after={<Button size="s" mode="bezeled" onClick={async () => { await apiFetch(`/api/groups/${selectedGroupId}/broadcasts/${b.id}`, { method: 'DELETE' }); refreshAdmin(selectedGroupId); }}>×</Button>}>{b.content}</Cell>)}
            </Section>

            <Section header={zh ? '👋 入群欢迎语 & 🏆 积分榜' : '👋 Welcome & 🏆 Top 20'}>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} /> {zh ? '开启新人欢迎语' : 'Enable Welcome'}</label>
                <input style={inputStyle} value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} />
                <Button size="s" mode="bezeled" onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/settings`, { method: 'POST', body: JSON.stringify({ welcomeEnabled, welcomeText }) }); setMsg(r.ok ? '✅ 已保存' : r.error); }}>{zh ? '保存欢迎语' : 'Save'}</Button>
              </div>
              {(adminData?.leaderboard || []).slice(0, 10).map((u: any, i: number) => <Cell key={i} after={`${u.balance} PTS`}>{i + 1}. {u.first_name || u.telegram_id}</Cell>)}
            </Section>
          </>
        )}

        {/* ==================== TAB 4: Pro 专享中心 ==================== */}
        {tab === 'PRO' && (
          <>
            <Section header={zh ? '👑 GroupPilot Pro（Telegram Stars）' : '👑 GroupPilot Pro'}>
              <Cell after={<Badge type="number">{isPro ? 'PRO 👑' : 'FREE'}</Badge>} subtitle={isPro ? (zh ? '已解锁免广告与全部 8 项 Pro 工具' : 'Ad-free & all 8 Pro tools unlocked') : (zh ? '升级 Pro 立即免广告并解锁全部高阶功能' : 'Go ad-free & unlock all 8 Pro tools')}>
                {zh ? '当前群组套餐' : 'Group Plan'}
              </Cell>
              {!isPro && (
                <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button stretched onClick={() => handleUpgradePro('NORMAL')}>⭐ 100 Stars {zh ? '升级 Pro（30天）' : 'Upgrade Pro (30d)'}</Button>
                  <Button stretched mode="bezeled" onClick={() => handleUpgradePro('TEST')}>🧪 1 Star {zh ? '真机支付测试' : 'Live Test'}</Button>
                </div>
              )}
            </Section>

            
            <Section header={zh ? '📊 Pro 全维度数据看板' : '📊 Pro Full Analytics'}>
              <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: zh ? '持分人数' : 'Members', val: proStats?.activeMembers ?? '-' },
                  { label: zh ? '今日签到' : 'Today Check-in', val: proStats?.checkinsToday ?? '-' },
                  { label: zh ? '累计签到' : 'All Check-ins', val: proStats?.checkinsTotal ?? '-' },
                  { label: zh ? '裂变拉新' : 'Invites', val: proStats?.totalInvites ?? '-' },
                  { label: zh ? '累计红包' : 'Red Packets', val: proStats?.redPackets ?? '-' },
                  { label: zh ? '累计抽奖' : 'Raffles', val: proStats?.raffles ?? '-' },
                  { label: zh ? '活动场次' : 'Events', val: proStats?.events ?? '-' },
                  { label: zh ? '群组投票' : 'Polls', val: proStats?.polls ?? '-' },
                  { label: zh ? '累计发分' : 'PTS Issued', val: proStats?.totalPointsIssued ?? '-' },
                  { label: zh ? '商城耗分' : 'PTS Spent', val: proStats?.totalPointsSpent ?? '-' },
                  { label: zh ? '兑换笔数' : 'Orders', val: proStats?.totalRedemptions ?? '-' },
                  { label: zh ? '卡密余量' : 'Keys Left', val: proStats?.remainingCodes ?? '-' },
                ].map((s, idx) => (
                  <div key={idx} style={{ padding: '9px 6px', borderRadius: 10, background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.16)', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>{s.val}</div>
                    <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '0 14px 10px', display: 'flex', gap: 8 }}>
                <Button stretched size="s" mode="bezeled" onClick={handleExportCsv}>
                  {zh ? '📥 私聊发 CSV 报表' : '📥 DM CSV Report'}
                </Button>
                <Button size="s" mode="outline" onClick={() => apiFetch(`/api/groups/${selectedGroupId}/stats`).then((d) => { if (d.ok) { setProStats(d.stats); setMsg(zh ? '✅ 数据已刷新' : '✅ Refreshed'); } })}>
                  {zh ? '🔄 刷新' : '🔄'}
                </Button>
              </div>
            </Section>

            <Section header={zh ? '1️⃣ 邀请裂变排行（入群自动 +20 积分）' : '1️⃣ Referral Leaderboard'}>
              <div style={{ padding: '8px 16px' }}>
                {inviteData.myLink ? (
                  <div style={{ fontSize: 12, wordBreak: 'break-all', padding: 8, borderRadius: 8, background: 'rgba(128,128,128,0.1)' }}>{inviteData.myLink.invite_url}</div>
                ) : (
                  <Button stretched mode="bezeled" onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/invites`, { method: 'POST' }); setMsg(r.ok ? '✅ 已生成专属链接' : r.error); apiFetch(`/api/groups/${selectedGroupId}/invites`).then((d) => d.ok && setInviteData(d)); }}>{zh ? '🔗 生成我的专属拉新链接' : '🔗 Generate Invite Link'}</Button>
                )}
              </div>
              {inviteData.leaderboard?.map((r: any, i: number) => <Cell key={i} after={`${r.join_count} 人`}>{i + 1}. {r.first_name || r.creator_id}</Cell>)}
            </Section>

            
            <Section header={zh ? '🤖 接入自有 Bot（Stars 100% 直收）' : '🤖 Connect Own Bot (100% Direct Stars)'}>
              <Cell
                subtitle={customBotUsername ? (zh ? '付费进群 Stars 将直接进入你的 Bot 余额' : 'Paid join Stars go directly to your Bot') : (zh ? '请先将你的 Bot 拉进群设为管理员，再粘贴 Token' : 'Add your Bot as group admin, then paste Token')}
              >
                {customBotUsername ? `✅ 已绑定 @${customBotUsername}` : (zh ? '当前使用官方默认 Bot' : 'Using default official Bot')}
              </Cell>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  style={inputStyle}
                  type="password"
                  value={customBotToken}
                  onChange={(e) => setCustomBotToken(e.target.value)}
                  placeholder={zh ? '粘贴 @BotFather 获取的 Bot Token' : 'Paste Bot Token from @BotFather'}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    stretched
                    size="s"
                    onClick={async () => {
                      if (!customBotToken.trim()) return setMsg(zh ? '请先粘贴 Bot Token' : 'Paste Bot Token first');
                      const r = await apiFetch(`/api/groups/${selectedGroupId}/custom-bot`, {
                        method: 'POST',
                        body: JSON.stringify({ botToken: customBotToken.trim() }),
                      });
                      if (r.ok) {
                        setCustomBotUsername(r.username);
                        setCustomBotToken('');
                        setMsg(zh ? `✅ 已成功接入 @${r.username} 并自动配置 Webhook！` : `✅ Connected @${r.username}!`);
                      } else setMsg(`❌ ${r.error}`);
                    }}
                  >
                    {zh ? '🔗 绑定自有 Bot' : '🔗 Connect Bot'}
                  </Button>
                  {customBotUsername && (
                    <Button
                      size="s"
                      mode="outline"
                      onClick={async () => {
                        const r = await apiFetch(`/api/groups/${selectedGroupId}/custom-bot`, {
                          method: 'POST',
                          body: JSON.stringify({ botToken: '' }),
                        });
                        if (r.ok) {
                          setCustomBotUsername('');
                          setMsg(zh ? '已解绑自有 Bot' : 'Disconnected');
                        }
                      }}
                    >
                      {zh ? '解绑' : 'Unlink'}
                    </Button>
                  )}
                </div>
              </div>
            </Section>

            <Section header={zh ? '2️⃣ 付费进群 · 3️⃣ 强关频道 · 7️⃣ 白标' : '2️⃣ Paid Join · 3️⃣ Force Sub · 7️⃣ White-Label'}>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input style={inputStyle} value={forceChannel} onChange={(e) => setForceChannel(e.target.value)} placeholder={zh ? '强制关注频道（如 @mychannel）' : 'Force channel (@username)'} />
                <input style={inputStyle} value={customFooter} onChange={(e) => setCustomFooter(e.target.value)} placeholder={zh ? '白标水印尾巴' : 'Custom footer'} />
                <div style={unitBoxStyle}><input style={unitInputStyle} type="number" value={paidStars} onChange={(e) => setPaidStars(e.target.value)} /><span style={{ fontSize: 12, opacity: 0.6 }}>Stars</span></div>
                <Button stretched onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/pro-config`, { method: 'POST', body: JSON.stringify({ forceChannelId: forceChannel, customFooter, paidJoinStars: Number(paidStars), paidJoinDays: 30 }) }); setMsg(r.ok ? '✅ 已保存 Pro 配置' : r.error); }}>{zh ? '💾 保存 Pro 配置' : '💾 Save Pro Config'}</Button>
              </div>
            </Section>

            <Section header={zh ? '4️⃣ 多群联动 · 5️⃣ 自动发卡 · 6️⃣ 私聊发 CSV' : '4️⃣ Multi-Group · 5️⃣ Auto-Keys · 6️⃣ CSV'}>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...inputStyle, flex: 2 }} value={multiBcText} onChange={(e) => setMultiBcText(e.target.value)} placeholder={zh ? '多群同步群发内容' : 'Multi-group broadcast'} />
                  <Button size="s" onClick={async () => { const r = await apiFetch('/api/pro/multi-broadcast', { method: 'POST', body: JSON.stringify({ content: multiBcText }) }); setMsg(r.ok ? `✅ 已发 ${r.sentCount} 群` : r.error); setMultiBcText(''); }}>{zh ? '群发' : 'Send'}</Button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...inputStyle, flex: 2 }} type="number" value={banUid} onChange={(e) => setBanUid(e.target.value)} placeholder={zh ? '跨群全局拉黑 ID' : 'Global Ban User ID'} />
                  <Button size="s" mode="bezeled" onClick={async () => { const r = await apiFetch('/api/pro/global-ban', { method: 'POST', body: JSON.stringify({ targetTelegramId: Number(banUid) }) }); setMsg(r.ok ? `🛡️ 已封 ${r.bannedCount} 群` : r.error); setBanUid(''); }}>{zh ? '拉黑' : 'Ban'}</Button>
                </div>
                <select style={inputStyle} value={codeItemId} onChange={(e) => setCodeItemId(e.target.value)}>
                  {storeData.items?.length ? storeData.items.map((it: any) => <option key={it.id} value={it.id}>{it.name}</option>) : <option value="">{zh ? '请先在「福利」页上架商品' : 'Add an item in Store tab first'}</option>}
                </select>
                <textarea style={{ ...inputStyle, minHeight: 55 }} value={codesText} onChange={(e) => setCodesText(e.target.value)} placeholder={zh ? '每行粘贴一条卡密，兑换自动私发' : 'One key per line'} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button stretched size="s" mode="bezeled" onClick={async () => { const r = await apiFetch(`/api/groups/${selectedGroupId}/store/items/${codeItemId}/codes`, { method: 'POST', body: JSON.stringify({ codesText }) }); setMsg(r.ok ? `✅ 已导入 ${r.imported} 条` : r.error); setCodesText(''); }}>{zh ? '📥 导入卡密' : '📥 Import Keys'}</Button>
                  <Button stretched size="s" onClick={handleExportCsv}>{zh ? '📊 私聊发 CSV' : '📊 DM CSV'}</Button>
                </div>
              </div>
            </Section>
          </>
        )}

        <AdSlot pos="BOTTOM" />
      </div>

      {/* 底部 4-Tab 原生导航栏 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(128,128,128,0.2)', backdropFilter: 'blur(12px)', background: 'rgba(9, 14, 28, 0.88)', padding: '6px 0 10px' }}>
        {[
          { id: 'ENGAGE', icon: '🎉', label: zh ? '互动' : 'Engage' },
          { id: 'STORE', icon: '🎁', label: zh ? '福利' : 'Store' },
          { id: 'OPS', icon: '🛡️', label: zh ? '运营' : 'Ops' },
          { id: 'PRO', icon: '💎', label: 'Pro' },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <div key={t.id} onClick={() => { setTab(t.id as Tab); setSubView('NONE'); setTargetId(null); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', opacity: active ? 1 : 0.55, color: active ? '#2481cc' : 'inherit' }}>
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            </div>
          );
        })}
      </div>
          </div>
    </AppRoot>
  );
}
