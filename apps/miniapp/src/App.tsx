import React, { useEffect, useState } from 'react';
import { AppRoot, Section, Cell, Button, Badge, Banner } from '@telegram-apps/telegram-ui';

const API_BASE = 'https://grouppilot-worker.zhangbanzhuan.workers.dev';

declare global {
  interface Window {
    Telegram?: any;
  }
}

export default function App() {
  const [route, setRoute] = useState<'HOME' | 'EVENTS' | 'PACKETS' | 'RAFFLES' | 'POLLS' | 'ADMIN'>('HOME');
  const [tgUser, setTgUser] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<string>('检测中...');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTgUser(tg.initDataUnsafe?.user || null);

      const startParam: string = tg.initDataUnsafe?.start_param || '';
      if (startParam.startsWith('pkt_')) setRoute('PACKETS');
      else if (startParam.startsWith('rfl_')) setRoute('RAFFLES');
      else if (startParam.startsWith('evt_')) setRoute('EVENTS');
    }

    fetch(API_BASE)
      .then((r) => r.json())
      .then((d) => setApiStatus(d.ok ? '已连接云端' : '异常'))
      .catch(() => setApiStatus('连接失败'));
  }, []);

  return (
    <AppRoot>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Banner
          header={`GroupPilot${tgUser ? ` · 你好，${tgUser.first_name}` : ''}`}
          subheader={`活动 · 积分红包 · 幸运抽奖 · 群协作 (${apiStatus})`}
        />

        {route === 'HOME' && (
          <>
            <Section header="社群激励与互动">
              <Cell
                before={<span style={{ fontSize: 24 }}>🧧</span>}
                after={<Badge type="number">1.0 积分版</Badge>}
                subtitle="拼手气 / 均分 / 任务积分红包（2.0 支持 Gifts）"
                onClick={() => setRoute('PACKETS')}
              >
                红包中心
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>🎰</span>}
                after={<Badge type="dot" />}
                subtitle="群主自定义奖品 · 定时/满人/手动开奖"
                onClick={() => setRoute('RAFFLES')}
              >
                幸运抽奖
              </Cell>
            </Section>

            <Section header="群组协作与管理">
              <Cell
                before={<span style={{ fontSize: 24 }}>📅</span>}
                subtitle="名额上限 · 候补队列 · 取消自动递补"
                onClick={() => setRoute('EVENTS')}
              >
                活动报名
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>📊</span>}
                subtitle="单选 / 多选 / 真匿名投票"
                onClick={() => setRoute('POLLS')}
              >
                群组投票
              </Cell>
              <Cell
                before={<span style={{ fontSize: 24 }}>⚙️</span>}
                subtitle="群积分排行榜 · 入群欢迎语 · 管理员同步"
                onClick={() => setRoute('ADMIN')}
              >
                群组运营与设置
              </Cell>
            </Section>
          </>
        )}

        {route !== 'HOME' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Button size="s" mode="bezeled" onClick={() => setRoute('HOME')}>
              ← 返回首页
            </Button>
            <Section header={`当前模块：${route}`}>
              <Cell subtitle="后端 API 已就绪，下一步我们在这里接入具体创建与领取表单！">
                模块占位页（联调成功）
              </Cell>
            </Section>
          </div>
        )}
      </div>
    </AppRoot>
  );
}
