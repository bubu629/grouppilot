import React, { useEffect, useState } from 'react';
import { AppRoot, Section, Cell, Button, Badge, Banner } from '@telegram-apps/telegram-ui';

const API_BASE = 'https://grouppilot-worker.zhangbanzhuan.workers.dev';

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Lang = 'zh' | 'en';

const I18N: Record<Lang, Record<string, string>> = {
  zh: {
    hello: '你好',
    subtitle: '活动 · 积分红包 · 幸运抽奖 · 群协作',
    checking: '检测中...',
    connected: '已连接云端',
    abnormal: '异常',
    connFailed: '连接失败',
    secEngage: '社群激励与互动',
    secCollab: '群组协作与商业化',
    pktTitle: '红包中心',
    pktSub: '拼手气 / 均分积分红包',
    pktBadge: '积分版',
    rflTitle: '幸运抽奖',
    rflSub: '多等级奖品 · 手动/定时/满人自动开奖',
    evtTitle: '活动报名',
    evtSub: '名额上限 · 候补自动递补',
    polTitle: '群组投票',
    polSub: '单选 / 多选 / 真匿名投票',
    admTitle: '群组运营与 Pro 会员',
    admSub: 'Stars 升级 Pro · 群积分榜 · 入群欢迎语',
    backHome: '← 返回首页',
    selectGroup: '选择目标群组（需先拉 Bot 进群设管理员）',
    noGroup: '暂未检测到已绑定的群组，请先将 Bot 拉进测试群并设为管理员。',
    needGroup: '请先将 Bot 拉入群组并设为管理员',
    // Red Packet
    pktCreateHeader: '发一个群组积分红包',
    pktPlaceholder: '红包祝福语',
    pktAmountPh: '总积分',
    pktUnitPts: '积分',
    pktCountPh: '份数',
    pktUnitCnt: '个',
    pktLucky: '拼手气红包',
    pktEqual: '普通均分红包',
    pktSendBtn: '🧧 发送红包到群聊',
    pktSending: '正在发送红包到群里...',
    pktSent: '✅ 红包已发送到群里！',
    pktClaiming: '正在开红包...',
    pktClaimBtn: '🧧 立即开红包',
    pktClaimed: '已领取',
    pktStatus: '状态',
    pktPool: '总奖池',
    pktUnitPtsFull: '社区积分',
    // Raffle
    rflCreateHeader: '发起群组幸运抽奖（2.0 进阶版）',
    rflTitlePh: '抽奖标题',
    rflTriggerLabel: '开奖方式',
    rflManual: '手动开奖（群主随时开奖）',
    rflTime: '定时自动开奖（到点自动开奖）',
    rflPart: '满人自动开奖（达标瞬间开奖）',
    rflTargetPh: '满多少人自动开奖',
    rflTargetUnit: '人开奖',
    rflPrizesLabel: '奖项设置（支持多等级奖品）',
    rflPrizePh: '奖品名称',
    rflQuotaUnit: '名',
    rflAddPrize: '+ 添加一个奖项等级',
    rflNewPrizeDef: '三等奖：幸运奖',
    rflSendBtn: '🎰 发布抽奖到群聊',
    rflSending: '正在发布抽奖到群里...',
    rflSent: '✅ 抽奖卡片已发送到群里！',
    rflNeedPrize: '请至少填写 1 个奖品',
    rflEnterBtn: '🎰 免费点击参与抽奖',
    rflDrawBtn: '🎲 群主立即开奖',
    rflEntered: '✅ 参与成功！等待开奖',
    rflDrawn: '🎉 已开奖！结果已同步到群聊',
    rflParticipants: '当前参与',
    rflPersonUnit: '人',
    rflMode: '开奖方式',
    rflPrizesPrefix: '奖品：',
    rflClaimCode: '核销码：',
    // Event
    evtCreateHeader: '发布群组活动报名',
    evtTitlePh: '活动名称',
    evtLocPh: '活动地点 / 形式',
    evtMaxPh: '名额上限（0为不限）',
    evtWaitlist: '满员后开启候补队列（有人取消自动递补）',
    evtSendBtn: '📅 发布活动到群聊',
    evtSending: '正在发布活动到群里...',
    evtSent: '✅ 活动卡片已发送到群里！',
    evtJoinBtn: '✅ 立即报名',
    evtCancelBtn: '取消报名',
    evtJoined: '✅ 报名成功',
    evtCancelled: '已取消报名，候补将自动递补',
    evtLocLabel: '地点：',
    evtLocDef: '群内通知',
    evtMaxLabel: '名额上限：',
    evtUnlimited: '不限',
    evtCurrent: '当前已报：',
    evtConfirmed: '✅ 已确认',
    evtWaitlisted: '⏳ 候补中',
    // Poll
    polCreateHeader: '发起群组投票',
    polQPh: '投票问题',
    polOptPh: '每行输入一个选项',
    polMulti: '允许多选',
    polAnon: '匿名投票',
    polSendBtn: '📊 发布投票到群聊',
    polSending: '正在发布投票到群里...',
    polSent: '✅ 投票卡片已发送到群里！',
    polNeed2: '请至少填写 2 个投票选项（每行一个）',
    polSingle: '单选',
    polMultiTag: '多选',
    polAnonTag: '真匿名投票',
    polPublicTag: '公开投票',
    polTapHint: '点击选项后提交投票',
    polVoteUnit: '票',
    polVoteBtn: '✅ 提交投票',
    polNeedSel: '请先选择投票选项',
    polVoted: '✅ 投票成功！',
    // Admin & Pro
    proHeader: '👑 GroupPilot Pro 商业订阅（Telegram Stars）',
    proPlanLabel: '当前群组套餐',
    proActiveSub: '当前群组已解锁全部 Pro 高级功能',
    proFreeSub: '升级 Pro 解锁无限活动、多级抽奖与专属标识',
    proBuyBtn: '⭐ 100 Stars 升级 Pro（30天）',
    proTestBtn: '🧪 1 Star 真机支付测试',
    proCreating: '正在唤起 Telegram Stars 支付...',
    proPaid: '👑 支付成功！群组已升级为 GroupPilot Pro！',
    proCancelled: '已取消支付',
    welcomeHeader: '入群欢迎语设置',
    welcomeEnable: '开启新成员入群自动欢迎',
    welcomePh: '支持使用 {name} 代表新成员昵称',
    saveSettings: '💾 保存群组设置',
    settingsSaved: '✅ 群组入群欢迎语已保存！',
    lbHeader: '🏆 群积分排行榜（Top 20）',
    lbEmpty: '暂无积分记录',
    lbEmptySub: '群友抢红包或中奖后，积分将自动显示在这里',
    failed: '失败',
    tip: '提示',
  },
  en: {
    hello: 'Hi',
    subtitle: 'Events · Red Packets · Raffles · Group Ops',
    checking: 'Checking...',
    connected: 'Cloud Connected',
    abnormal: 'Error',
    connFailed: 'Offline',
    secEngage: 'Community Engagement',
    secCollab: 'Group Ops & Pro',
    pktTitle: 'Red Packets',
    pktSub: 'Lucky / Equal Points Red Packets',
    pktBadge: 'PTS',
    rflTitle: 'Lucky Draw',
    rflSub: 'Multi-tier Prizes · Manual / Timed / Goal Auto-Draw',
    evtTitle: 'Event RSVP',
    evtSub: 'Capacity Limit · Auto Waitlist Promotion',
    polTitle: 'Group Polls',
    polSub: 'Single / Multiple / True Anonymous Polls',
    admTitle: 'Group Ops & Pro Plan',
    admSub: 'Upgrade Pro via Stars · Leaderboard · Welcome Msg',
    backHome: '← Back to Home',
    selectGroup: 'Select Target Group (Add Bot as Admin first)',
    noGroup: 'No group detected. Please add the Bot to your group as an Admin.',
    needGroup: 'Please add the Bot to a group as Admin first',
    // Red Packet
    pktCreateHeader: 'Send a Group Points Red Packet',
    pktPlaceholder: 'Greeting / Title',
    pktAmountPh: 'Total Points',
    pktUnitPts: 'PTS',
    pktCountPh: 'Count',
    pktUnitCnt: 'pcs',
    pktLucky: 'Lucky Draw (Random)',
    pktEqual: 'Equal Split',
    pktSendBtn: '🧧 Send Red Packet to Group',
    pktSending: 'Sending red packet...',
    pktSent: '✅ Red packet sent to group!',
    pktClaiming: 'Opening red packet...',
    pktClaimBtn: '🧧 Open Red Packet',
    pktClaimed: 'Claimed',
    pktStatus: 'Status',
    pktPool: 'Total Pool',
    pktUnitPtsFull: 'Points',
    // Raffle
    rflCreateHeader: 'Create Lucky Draw (v2.0)',
    rflTitlePh: 'Raffle Title',
    rflTriggerLabel: 'Draw Trigger',
    rflManual: 'Manual Draw (Admin draws anytime)',
    rflTime: 'Scheduled Auto-Draw (By Time)',
    rflPart: 'Goal Auto-Draw (By Participants)',
    rflTargetPh: 'Target participants',
    rflTargetUnit: 'users',
    rflPrizesLabel: 'Prizes (Multi-tier supported)',
    rflPrizePh: 'Prize Name',
    rflQuotaUnit: 'qty',
    rflAddPrize: '+ Add Prize Tier',
    rflNewPrizeDef: '3rd Prize: Lucky Reward',
    rflSendBtn: '🎰 Post Raffle to Group',
    rflSending: 'Posting raffle...',
    rflSent: '✅ Raffle card posted to group!',
    rflNeedPrize: 'Please add at least 1 prize',
    rflEnterBtn: '🎰 Enter Raffle for Free',
    rflDrawBtn: '🎲 Draw Winners Now (Admin)',
    rflEntered: '✅ Entered! Good luck',
    rflDrawn: '🎉 Winners drawn & posted to group!',
    rflParticipants: 'Entries',
    rflPersonUnit: '',
    rflMode: 'Mode',
    rflPrizesPrefix: 'Prizes: ',
    rflClaimCode: 'Claim Code: ',
    // Event
    evtCreateHeader: 'Create Group Event RSVP',
    evtTitlePh: 'Event Title',
    evtLocPh: 'Location / Venue',
    evtMaxPh: 'Max Capacity (0 = unlimited)',
    evtWaitlist: 'Enable auto-waitlist when full',
    evtSendBtn: '📅 Post Event to Group',
    evtSending: 'Posting event...',
    evtSent: '✅ Event card posted to group!',
    evtJoinBtn: '✅ RSVP Now',
    evtCancelBtn: 'Cancel RSVP',
    evtJoined: '✅ RSVP confirmed',
    evtCancelled: 'Cancelled. Waitlist auto-promoted.',
    evtLocLabel: 'Location: ',
    evtLocDef: 'TBA',
    evtMaxLabel: 'Limit: ',
    evtUnlimited: 'Unlimited',
    evtCurrent: 'Registered: ',
    evtConfirmed: '✅ Confirmed',
    evtWaitlisted: '⏳ Waitlist',
    // Poll
    polCreateHeader: 'Create Group Poll',
    polQPh: 'Poll Question',
    polOptPh: 'One option per line',
    polMulti: 'Multiple Choice',
    polAnon: 'Anonymous',
    polSendBtn: '📊 Post Poll to Group',
    polSending: 'Posting poll...',
    polSent: '✅ Poll posted to group!',
    polNeed2: 'Please enter at least 2 options (one per line)',
    polSingle: 'Single Choice',
    polMultiTag: 'Multiple Choice',
    polAnonTag: 'Anonymous',
    polPublicTag: 'Public',
    polTapHint: 'Select option(s) and submit',
    polVoteUnit: 'votes',
    polVoteBtn: '✅ Submit Vote',
    polNeedSel: 'Please select an option first',
    polVoted: '✅ Vote submitted!',
    // Admin & Pro
    proHeader: '👑 GroupPilot Pro (Telegram Stars)',
    proPlanLabel: 'Current Group Plan',
    proActiveSub: 'All Pro features unlocked for this group',
    proFreeSub: 'Upgrade to Pro for unlimited events, multi-tier raffles & badge',
    proBuyBtn: '⭐ Upgrade Pro · 100 Stars (30d)',
    proTestBtn: '🧪 1 Star Live Payment Test',
    proCreating: 'Opening Telegram Stars checkout...',
    proPaid: '👑 Payment successful! Group upgraded to Pro!',
    proCancelled: 'Payment cancelled',
    welcomeHeader: 'Welcome Message Settings',
    welcomeEnable: 'Auto-welcome new members',
    welcomePh: 'Use {name} for new member name',
    saveSettings: '💾 Save Settings',
    settingsSaved: '✅ Group settings saved!',
    lbHeader: '🏆 Points Leaderboard (Top 20)',
    lbEmpty: 'No points yet',
    lbEmptySub: 'Points earned from red packets & raffles appear here',
    failed: 'Failed',
    tip: 'Notice',
  },
};

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
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('gp_lang');
    if (saved === 'zh' || saved === 'en') return saved;
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || navigator.language || 'zh';
    return tgLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  });

  const t = (key: string) => I18N[lang][key] || key;

  const toggleLang = () => {
    const next: Lang = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
    localStorage.setItem('gp_lang', next);
  };

  const [route, setRoute] = useState<'HOME' | 'EVENTS' | 'PACKETS' | 'RAFFLES' | 'POLLS' | 'ADMIN'>('HOME');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<any>(null);
  const [apiState, setApiState] = useState<'checking' | 'connected' | 'abnormal' | 'connFailed'>('checking');
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [msg, setMsg] = useState<string>('');

  // Red Packet
  const [pktTitle, setPktTitle] = useState(lang === 'zh' ? '群友专属福利红包' : 'Community Bonus Red Packet');
  const [pktAmount, setPktAmount] = useState('1000');
  const [pktCount, setPktCount] = useState('10');
  const [pktType, setPktType] = useState<'LUCKY' | 'EQUAL'>('LUCKY');
  const [pktDetail, setPktDetail] = useState<any>(null);

  // Raffle 2.0
  const [rflTitle, setRflTitle] = useState(lang === 'zh' ? '周末幸运大抽奖' : 'Weekend Lucky Draw');
  const [rflTrigger, setRflTrigger] = useState<'MANUAL' | 'TIME' | 'PARTICIPANTS'>('MANUAL');
  const [rflDrawAt, setRflDrawAt] = useState(() => {
    const d = new Date(Date.now() + 2 * 3600 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [rflTargetCount, setRflTargetCount] = useState('20');
  const [rflPrizes, setRflPrizes] = useState<Array<{ prizeName: string; winnerQuota: string }>>(
    lang === 'zh'
      ? [
          { prizeName: '一等奖：神秘大奖', winnerQuota: '1' },
          { prizeName: '二等奖：500 社区积分', winnerQuota: '3' },
        ]
      : [
          { prizeName: '1st Prize: Mystery Gift', winnerQuota: '1' },
          { prizeName: '2nd Prize: 500 Points', winnerQuota: '3' },
        ]
  );
  const [rflDetail, setRflDetail] = useState<any>(null);

  // Event
  const [evtTitle, setEvtTitle] = useState(lang === 'zh' ? '周末线下聚会 / 线上分享' : 'Weekend Community Meetup');
  const [evtLoc, setEvtLoc] = useState(lang === 'zh' ? '群内语音 / 待定' : 'Telegram Voice Chat / TBA');
  const [evtMax, setEvtMax] = useState('20');
  const [evtWaitlist, setEvtWaitlist] = useState(true);
  const [evtDetail, setEvtDetail] = useState<any>(null);

  // Poll
  const [polQuestion, setPolQuestion] = useState(lang === 'zh' ? '本周活动大家想选哪个时间？' : 'Best time for this week’s event?');
  const [polOptionsText, setPolOptionsText] = useState(
    lang === 'zh' ? '周五晚上 8 点\n周六下午 3 点\n周日下午 3 点' : 'Friday 8 PM\nSaturday 3 PM\nSunday 3 PM'
  );
  const [polMultiple, setPolMultiple] = useState(false);
  const [polAnonymous, setPolAnonymous] = useState(true);
  const [polDetail, setPolDetail] = useState<any>(null);
  const [polSelected, setPolSelected] = useState<number[]>([]);

  // Admin & Pro
  const [adminData, setAdminData] = useState<any>(null);
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeText, setWelcomeText] = useState('欢迎 {name} 加入本群！/ Welcome {name}! 🎉');

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
      .then((d) => setApiState(d.ok ? 'connected' : 'abnormal'))
      .catch(() => setApiState('connFailed'));

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
        setWelcomeText(d.group?.welcome_text || '欢迎 {name} 加入本群！/ Welcome {name}! 🎉');
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
    if (!selectedGroupId) return setMsg(t('needGroup'));
    setMsg(t('pktSending'));
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
      setMsg(t('pktSent'));
      setTargetId(res.id);
    } else setMsg(`❌ ${t('failed')}: ${res.error}`);
  };

  const handleClaimPacket = async () => {
    if (!pktDetail?.packet?.id) return;
    setMsg(t('pktClaiming'));
    const res = await apiFetch(`/api/red-packets/${pktDetail.packet.id}/claim`, { method: 'POST' });
    if (res.ok) {
      setMsg(lang === 'zh' ? `🎉 恭喜你抢到了 ${res.amount} 社区积分！` : `🎉 You claimed ${res.amount} Points!`);
      const updated = await apiFetch(`/api/red-packets/${pktDetail.packet.id}`);
      if (updated.ok) setPktDetail(updated);
    } else setMsg(`${t('tip')}: ${res.error}`);
  };

  const handleCreateRaffle = async () => {
    if (!selectedGroupId) return setMsg(t('needGroup'));
    const validPrizes = rflPrizes
      .filter((p) => p.prizeName.trim())
      .map((p) => ({ prizeName: p.prizeName.trim(), prizeType: 'CUSTOM', winnerQuota: Math.max(1, Number(p.winnerQuota) || 1) }));
    if (!validPrizes.length) return setMsg(t('rflNeedPrize'));

    setMsg(t('rflSending'));
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
      setMsg(t('rflSent'));
      setTargetId(res.id);
    } else setMsg(`❌ ${t('failed')}: ${res.error}`);
  };

  const handleEnterRaffle = async () => {
    if (!rflDetail?.raffle?.id) return;
    const res = await apiFetch(`/api/raffles/${rflDetail.raffle.id}/enter`, { method: 'POST' });
    setMsg(res.ok ? t('rflEntered') : `${t('tip')}: ${res.error}`);
    const updated = await apiFetch(`/api/raffles/${rflDetail.raffle.id}`);
    if (updated.ok) setRflDetail(updated);
  };

  const handleDrawRaffle = async () => {
    if (!rflDetail?.raffle?.id) return;
    const res = await apiFetch(`/api/raffles/${rflDetail.raffle.id}/draw`, { method: 'POST' });
    setMsg(res.ok ? t('rflDrawn') : `${t('tip')}: ${res.error}`);
    const updated = await apiFetch(`/api/raffles/${rflDetail.raffle.id}`);
    if (updated.ok) setRflDetail(updated);
  };

  const handleCreateEvent = async () => {
    if (!selectedGroupId) return setMsg(t('needGroup'));
    setMsg(t('evtSending'));
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
      setMsg(t('evtSent'));
      setTargetId(res.id);
    } else setMsg(`❌ ${t('failed')}: ${res.error}`);
  };

  const handleEventAction = async (action: 'join' | 'cancel') => {
    if (!evtDetail?.event?.id) return;
    const res = await apiFetch(`/api/events/${evtDetail.event.id}/${action}`, { method: 'POST' });
    setMsg(res.ok ? (action === 'join' ? `${t('evtJoined')} (${res.status})` : t('evtCancelled')) : `${t('tip')}: ${res.error}`);
    const updated = await apiFetch(`/api/events/${evtDetail.event.id}`);
    if (updated.ok) setEvtDetail(updated);
  };

  const handleCreatePoll = async () => {
    if (!selectedGroupId) return setMsg(t('needGroup'));
    const options = polOptionsText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return setMsg(t('polNeed2'));
    setMsg(t('polSending'));
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
      setMsg(t('polSent'));
      setPolSelected([]);
      setTargetId(res.id);
    } else setMsg(`❌ ${t('failed')}: ${res.error}`);
  };

  const handleVotePoll = async () => {
    if (!polDetail?.poll?.id || !polSelected.length) return setMsg(t('polNeedSel'));
    const res = await apiFetch(`/api/polls/${polDetail.poll.id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionIndices: polSelected }),
    });
    if (res.ok) {
      setMsg(t('polVoted'));
      const updated = await apiFetch(`/api/polls/${polDetail.poll.id}`);
      if (updated.ok) setPolDetail(updated);
    } else setMsg(`${t('tip')}: ${res.error}`);
  };

  const handleSaveSettings = async () => {
    if (!selectedGroupId) return;
    const res = await apiFetch(`/api/groups/${selectedGroupId}/settings`, {
      method: 'POST',
      body: JSON.stringify({ welcomeEnabled, welcomeText }),
    });
    setMsg(res.ok ? t('settingsSaved') : `❌ ${t('failed')}: ${res.error}`);
  };

  const handleUpgradePro = async (mode: 'NORMAL' | 'TEST') => {
    if (!selectedGroupId) return setMsg(t('needGroup'));
    setMsg(t('proCreating'));
    const res = await apiFetch('/api/payments/pro-invoice', {
      method: 'POST',
      body: JSON.stringify({ groupId: Number(selectedGroupId), mode }),
    });
    if (!res.ok || !res.invoiceUrl) return setMsg(`❌ ${t('failed')}: ${res.error}`);

    const tg = window.Telegram?.WebApp;
    if (tg?.openInvoice) {
      tg.openInvoice(res.invoiceUrl, (status: string) => {
        if (status === 'paid') {
          setMsg(t('proPaid'));
          setTimeout(() => refreshAdmin(selectedGroupId), 1500);
        } else if (status === 'cancelled') {
          setMsg(t('proCancelled'));
        } else {
          setMsg(`${t('tip')}: ${status}`);
        }
      });
    } else {
      window.open(res.invoiceUrl, '_blank');
    }
  };

  
  const currentGroup = groups.find((g) => String(g.group_id) === selectedGroupId);
  const isPro = currentGroup?.plan === "PRO" || adminData?.group?.plan === "PRO";

  const AdSlot = ({ pos }: { pos: "TOP" | "BOTTOM" }) => {
    if (isPro) return null;
    const isTop = pos === "TOP";
    const title = isTop
      ? (lang === "zh" ? "🔥 顶部赞助广告位招租" : "🔥 Top Sponsor Slot Available")
      : (lang === "zh" ? "📢 底部品牌推广位 · 触达精准群友" : "📢 Bottom Ad Slot · Reach Active Members");
    const sub = isTop
      ? (lang === "zh" ? "点击联系商务投放 / 升级 Pro 免广告" : "Tap to advertise or upgrade to Pro")
      : (lang === "zh" ? "支持图文跳转频道、Bot 或官网" : "Direct link to your Channel, Bot or Website");
    const targetUrl = "https://t.me/grouppilot6299bot";

    return (
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px dashed rgba(128,128,128,0.4)",
          background: "rgba(128,128,128,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div
          onClick={() => window.open(targetUrl, "_blank")}
          style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "rgba(128,128,128,0.2)", opacity: 0.8 }}>
              {lang === "zh" ? "广告" : "AD"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{sub}</div>
        </div>
        <button
          onClick={() => { setTargetId(null); setRoute("ADMIN"); }}
          style={{
            padding: "4px 8px",
            borderRadius: 8,
            border: "none",
            background: "rgba(36,129,204,0.15)",
            color: "#2481cc",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {lang === "zh" ? "去广告" : "No Ads"}
        </button>
      </div>
    );
  };

  const GroupSelector = () => (
    <div style={{ padding: '8px 16px' }}>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{t('selectGroup')}</div>
      {groups.length > 0 ? (
        <select style={inputStyle} value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.group_id} value={g.group_id}>{g.title}</option>
          ))}
        </select>
      ) : (
        <div style={{ fontSize: 13, color: '#e53935' }}>{t('noGroup')}</div>
      )}
    </div>
  );

  return (
    <AppRoot>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={toggleLang}
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid rgba(128,128,128,0.35)',
              background: 'transparent',
              color: 'inherit',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🌐 {lang === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        <AdSlot pos="TOP" />

        <Banner
          header={`GroupPilot${tgUser ? ` · ${t('hello')}, ${tgUser.first_name}` : ''}`}
          subheader={`${t('subtitle')} (${t(apiState)})`}
        />

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(36,129,204,0.12)', fontSize: 14 }}>
            {msg}
          </div>
        )}

        {route === 'HOME' && (
          <>
            <Section header={t('secEngage')}>
              <Cell
                before={<span style={{ fontSize: 24 }}>🧧</span>}
                after={<Badge type="number">{t('pktBadge')}</Badge>}
                subtitle={t('pktSub')}
                onClick={() => { setTargetId(null); setRoute('PACKETS'); }}
              >
                {t('pktTitle')}
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>🎰</span>}
                after={<Badge type="number">2.0</Badge>}
                subtitle={t('rflSub')}
                onClick={() => { setTargetId(null); setRoute('RAFFLES'); }}
              >
                {t('rflTitle')}
              </Cell>
            </Section>

            <Section header={t('secCollab')}>
              <Cell before={<span style={{ fontSize: 24 }}>📅</span>} subtitle={t('evtSub')} onClick={() => { setTargetId(null); setRoute('EVENTS'); }}>
                {t('evtTitle')}
              </Cell>
              <Cell before={<span style={{ fontSize: 24 }}>📊</span>} subtitle={t('polSub')} onClick={() => { setTargetId(null); setRoute('POLLS'); }}>
                {t('polTitle')}
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>👑</span>}
                after={<Badge type="dot" />}
                subtitle={t('admSub')}
                onClick={() => { setTargetId(null); setRoute('ADMIN'); }}
              >
                {t('admTitle')}
              </Cell>
            </Section>
          </>
        )}

        {route !== 'HOME' && (
          <Button size="s" mode="bezeled" onClick={() => { setTargetId(null); setPktDetail(null); setRflDetail(null); setEvtDetail(null); setPolDetail(null); setRoute('HOME'); }}>
            {t('backHome')}
          </Button>
        )}

        {/* ==================== Red Packets ==================== */}
        {route === 'PACKETS' && !targetId && (
          <Section header={t('pktCreateHeader')}>
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={pktTitle} onChange={(e) => setPktTitle(e.target.value)} placeholder={t('pktPlaceholder')} />
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={unitBoxStyle}>
                  <input style={unitInputStyle} type="number" value={pktAmount} onChange={(e) => setPktAmount(e.target.value)} placeholder={t('pktAmountPh')} />
                  <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>{t('pktUnitPts')}</span>
                </div>
                <div style={unitBoxStyle}>
                  <input style={unitInputStyle} type="number" value={pktCount} onChange={(e) => setPktCount(e.target.value)} placeholder={t('pktCountPh')} />
                  <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>{t('pktUnitCnt')}</span>
                </div>
              </div>
              <select style={inputStyle} value={pktType} onChange={(e) => setPktType(e.target.value as any)}>
                <option value="LUCKY">{t('pktLucky')}</option>
                <option value="EQUAL">{t('pktEqual')}</option>
              </select>
              <Button stretched onClick={handleCreatePacket}>{t('pktSendBtn')}</Button>
            </div>
          </Section>
        )}

        {route === 'PACKETS' && targetId && pktDetail && (
          <Section header={`🧧 ${pktDetail.packet.title}`}>
            <Cell subtitle={`${t('pktClaimed')} ${pktDetail.packet.claimed_count} / ${pktDetail.packet.total_count} · ${t('pktStatus')}: ${pktDetail.packet.status}`}>
              {t('pktPool')}: {pktDetail.packet.total_amount} {t('pktUnitPtsFull')}
            </Cell>
            {pktDetail.packet.status === 'ACTIVE' && (
              <div style={{ padding: '8px 16px' }}>
                <Button stretched onClick={handleClaimPacket}>{t('pktClaimBtn')}</Button>
              </div>
            )}
            {pktDetail.claims.map((c: any, i: number) => (
              <Cell key={i} after={`${c.amount} PTS`}>
                {i === 0 ? '👑 ' : ''}{c.first_name || c.telegram_id}
              </Cell>
            ))}
          </Section>
        )}

        {/* ==================== Lucky Draw 2.0 ==================== */}
        {route === 'RAFFLES' && !targetId && (
          <Section header={t('rflCreateHeader')}>
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={rflTitle} onChange={(e) => setRflTitle(e.target.value)} placeholder={t('rflTitlePh')} />

              <div style={{ fontSize: 13, opacity: 0.7 }}>{t('rflTriggerLabel')}</div>
              <select style={inputStyle} value={rflTrigger} onChange={(e) => setRflTrigger(e.target.value as any)}>
                <option value="MANUAL">{t('rflManual')}</option>
                <option value="TIME">{t('rflTime')}</option>
                <option value="PARTICIPANTS">{t('rflPart')}</option>
              </select>

              {rflTrigger === 'TIME' && (
                <input style={inputStyle} type="datetime-local" value={rflDrawAt} onChange={(e) => setRflDrawAt(e.target.value)} />
              )}

              {rflTrigger === 'PARTICIPANTS' && (
                <div style={unitBoxStyle}>
                  <input style={unitInputStyle} type="number" value={rflTargetCount} onChange={(e) => setRflTargetCount(e.target.value)} placeholder={t('rflTargetPh')} />
                  <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>{t('rflTargetUnit')}</span>
                </div>
              )}

              <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{t('rflPrizesLabel')}</div>
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
                    placeholder={t('rflPrizePh')}
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
                    <span style={{ fontSize: 13, opacity: 0.65, marginLeft: 4 }}>{t('rflQuotaUnit')}</span>
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
                onClick={() => setRflPrizes([...rflPrizes, { prizeName: t('rflNewPrizeDef'), winnerQuota: '5' }])}
              >
                {t('rflAddPrize')}
              </Button>

              <Button stretched onClick={handleCreateRaffle}>{t('rflSendBtn')}</Button>
            </div>
          </Section>
        )}

        {route === 'RAFFLES' && targetId && rflDetail && (
          <Section header={`🎰 ${rflDetail.raffle.title}`}>
            <Cell subtitle={`${t('rflParticipants')}: ${rflDetail.raffle.participant_count} ${t('rflPersonUnit')} · ${t('rflMode')}: ${rflDetail.raffle.trigger_type} · ${rflDetail.raffle.status}`}>
              {t('rflPrizesPrefix')}{rflDetail.prizes.map((p: any) => `${p.prize_name}×${p.winner_quota}`).join(' / ')}
            </Cell>
            {rflDetail.raffle.status === 'OPEN' && (
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button stretched onClick={handleEnterRaffle}>{t('rflEnterBtn')}</Button>
                <Button stretched mode="outline" onClick={handleDrawRaffle}>{t('rflDrawBtn')}</Button>
              </div>
            )}
            {rflDetail.winners.map((w: any, i: number) => (
              <Cell key={i} subtitle={`${t('rflClaimCode')}${w.claim_code}`} after={w.prize_name}>
                🏆 {w.first_name || w.telegram_id}
              </Cell>
            ))}
          </Section>
        )}

        {/* ==================== Events ==================== */}
        {route === 'EVENTS' && !targetId && (
          <Section header={t('evtCreateHeader')}>
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={evtTitle} onChange={(e) => setEvtTitle(e.target.value)} placeholder={t('evtTitlePh')} />
              <input style={inputStyle} value={evtLoc} onChange={(e) => setEvtLoc(e.target.value)} placeholder={t('evtLocPh')} />
              <div style={unitBoxStyle}>
                <input style={unitInputStyle} type="number" value={evtMax} onChange={(e) => setEvtMax(e.target.value)} placeholder={t('evtMaxPh')} />
                <span style={{ fontSize: 14, opacity: 0.65, marginLeft: 6, whiteSpace: 'nowrap' }}>{t('rflPersonUnit') || 'pax'}</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={evtWaitlist} onChange={(e) => setEvtWaitlist(e.target.checked)} />
                {t('evtWaitlist')}
              </label>
              <Button stretched onClick={handleCreateEvent}>{t('evtSendBtn')}</Button>
            </div>
          </Section>
        )}

        {route === 'EVENTS' && targetId && evtDetail && (
          <Section header={`📅 ${evtDetail.event.title}`}>
            <Cell subtitle={`${t('evtLocLabel')}${evtDetail.event.location || t('evtLocDef')} · ${t('evtMaxLabel')}${evtDetail.event.max_participants || t('evtUnlimited')}`}>
              {t('evtCurrent')}{evtDetail.members.length} {t('rflPersonUnit')}
            </Cell>
            <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
              <Button stretched onClick={() => handleEventAction('join')}>{t('evtJoinBtn')}</Button>
              <Button stretched mode="outline" onClick={() => handleEventAction('cancel')}>{t('evtCancelBtn')}</Button>
            </div>
            {evtDetail.members.map((m: any, i: number) => (
              <Cell key={i} after={m.status === 'CONFIRMED' ? t('evtConfirmed') : t('evtWaitlisted')}>
                {i + 1}. {m.first_name || m.telegram_id}
              </Cell>
            ))}
          </Section>
        )}

        {/* ==================== Polls ==================== */}
        {route === 'POLLS' && !targetId && (
          <Section header={t('polCreateHeader')}>
            <GroupSelector />
            <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={inputStyle} value={polQuestion} onChange={(e) => setPolQuestion(e.target.value)} placeholder={t('polQPh')} />
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                value={polOptionsText}
                onChange={(e) => setPolOptionsText(e.target.value)}
                placeholder={t('polOptPh')}
              />
              <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={polMultiple} onChange={(e) => setPolMultiple(e.target.checked)} />
                  {t('polMulti')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={polAnonymous} onChange={(e) => setPolAnonymous(e.target.checked)} />
                  {t('polAnon')}
                </label>
              </div>
              <Button stretched onClick={handleCreatePoll}>{t('polSendBtn')}</Button>
            </div>
          </Section>
        )}

        {route === 'POLLS' && targetId && polDetail && (
          <Section header={`📊 ${polDetail.poll.question}`}>
            <Cell subtitle={`${polDetail.poll.is_multiple ? t('polMultiTag') : t('polSingle')} · ${polDetail.poll.is_anonymous ? t('polAnonTag') : t('polPublicTag')}`}>
              {t('polTapHint')}
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
                    <span style={{ opacity: 0.7 }}>{count} {t('polVoteUnit')}</span>
                  </div>
                );
              })}
              <Button stretched onClick={handleVotePoll}>{t('polVoteBtn')}</Button>
            </div>
          </Section>
        )}

        {/* ==================== Group Ops & Pro ==================== */}
        {route === 'ADMIN' && (
          <>
            <Section header={t('proHeader')}>
              <GroupSelector />
              <Cell
                after={<Badge type="number">{adminData?.group?.plan === 'PRO' ? 'PRO 👑' : 'FREE'}</Badge>}
                subtitle={adminData?.group?.plan === 'PRO' ? t('proActiveSub') : t('proFreeSub')}
              >
                {t('proPlanLabel')}
              </Cell>
              {adminData?.group?.plan !== 'PRO' && (
                <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button stretched onClick={() => handleUpgradePro('NORMAL')}>{t('proBuyBtn')}</Button>
                  <Button stretched mode="bezeled" onClick={() => handleUpgradePro('TEST')}>{t('proTestBtn')}</Button>
                </div>
              )}
            </Section>

            <Section header={t('welcomeHeader')}>
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input type="checkbox" checked={welcomeEnabled} onChange={(e) => setWelcomeEnabled(e.target.checked)} />
                  {t('welcomeEnable')}
                </label>
                <textarea
                  style={{ ...inputStyle, minHeight: 75 }}
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  placeholder={t('welcomePh')}
                />
                <Button stretched onClick={handleSaveSettings}>{t('saveSettings')}</Button>
              </div>
            </Section>

            <Section header={t('lbHeader')}>
              {adminData?.leaderboard?.length > 0 ? (
                adminData.leaderboard.map((u: any, i: number) => (
                  <Cell key={i} after={`${u.balance} ${t('pktUnitPts')}`}>
                    {i + 1}. {u.first_name || u.telegram_id}
                  </Cell>
                ))
              ) : (
                <Cell subtitle={t('lbEmptySub')}>{t('lbEmpty')}</Cell>
              )}
            </Section>
          </>
        )}
        <AdSlot pos="BOTTOM" />
      </div>
    </AppRoot>
  );
}
