'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Badge, Button, Card } from '@/components/ui';
import { Icon } from '@/components/icons';

interface Summary {
  products: number;
  scheduled: number;
  published: number;
  clicks7d: number;
  sales7d: number;
  revenue7d: number;
}

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      <DashboardBody />
    </AppShell>
  );
}

function DashboardBody() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [autopilot, setAutopilot] = useState<{ enabled: boolean; dailyPerPlatform: number } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    api<Summary>('/analytics/summary').then(setSummary).catch(() => {});
    api<any>('/settings').then((s) => setAutopilot(s.autopilot)).catch(() => {});
    api<any>('/content?limit=5').then((c) => setRecent(c.content ?? [])).catch(() => {});
  }, []);

  const cards = [
    { label: 'Products', value: summary?.products, href: '/products', icon: 'box', tone: 'text-sky-deep bg-sky-deep/10' },
    { label: 'Scheduled posts', value: summary?.scheduled, href: '/content', icon: 'calendar', tone: 'text-warn bg-warn/10' },
    { label: 'Published', value: summary?.published, href: '/content', icon: 'check', tone: 'text-success bg-success/10' },
    { label: 'Clicks (7d)', value: summary?.clicks7d, href: '/analytics', icon: 'eye', tone: 'text-sky-deep bg-sky-deep/10' },
    { label: 'Sales (7d)', value: summary?.sales7d, href: '/analytics', icon: 'zap', tone: 'text-success bg-success/10' },
    { label: 'Revenue (7d)', value: summary?.revenue7d, href: '/analytics', icon: 'chart', tone: 'text-navy bg-navy/5', money: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-3xl border border-white/70 bg-white/35 px-5 py-4 backdrop-blur-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/baymax-icon.png" alt="" className="h-12 w-12 rounded-2xl bg-white/80 p-1 shadow-sm" />
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-sky-deep">Baymax is ready</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-navy">What are we growing today?</h2>
          <p className="mt-0.5 text-xs text-navy/50">Your products, campaigns and affiliate performance in one workspace.</p>
        </div>
      </div>

      {/* autopilot banner */}
      <div className="rounded-2xl bg-gradient-to-r from-sky-deep to-sky p-5 md:p-6 text-white shadow-lg shadow-sky/25 flex flex-wrap items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Icon name="zap" className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-lg leading-tight">Autopilot</h2>
            <Badge tone={autopilot?.enabled ? 'green' : 'gray'}>
              {autopilot === null ? '…' : autopilot.enabled ? 'ON' : 'PAUSED'}
            </Badge>
          </div>
          <p className="text-white/85 text-sm mt-0.5">
            {autopilot?.enabled
              ? `Generating & scheduling up to ${autopilot.dailyPerPlatform} post(s)/platform/day to TikTok + YouTube.`
              : 'Turn autopilot on to let Baymax post for you.'}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/content">
            <Button variant="ghost" className="bg-white/20 text-white hover:bg-white/30 shadow-none">
              Content queue
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" className="bg-white text-sky-deep hover:bg-white/90 shadow-none">Settings</Button>
          </Link>
        </div>
      </div>

      {/* Action cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold tracking-tight text-navy">Quick actions</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-navy/35">Your next steps</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/products">
            <Card className="group flex h-full items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-deep/10 text-sky-deep"><Icon name="box" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-xs text-navy">Manage products</strong><span className="mt-1 block text-[10px] text-navy/45">Add or organize affiliate offers</span></span>
              <span className="text-navy/30 transition group-hover:translate-x-1">→</span>
            </Card>
          </Link>
          <Link href="/settings#connected-accounts">
            <Card className="group flex h-full items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600"><Icon name="external" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-xs text-navy">Connect a channel</strong><span className="mt-1 block text-[10px] text-navy/45">Authorize where Baymax can publish</span></span>
              <span className="text-navy/30 transition group-hover:translate-x-1">→</span>
            </Card>
          </Link>
          <Link href="/content?status=scheduled">
            <Card className="group flex h-full items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600"><Icon name="calendar" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-xs text-navy">Review schedule</strong><span className="mt-1 block text-[10px] text-navy/45">Check upcoming promotional posts</span></span>
              <span className="text-navy/30 transition group-hover:translate-x-1">→</span>
            </Card>
          </Link>
        </div>
      </section>

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="p-4 hover:shadow-md transition group cursor-pointer h-full">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${c.tone}`}>
                <Icon name={c.icon} className="w-[18px] h-[18px]" />
              </div>
              <div className="text-2xl font-extrabold text-navy tracking-tight">
                {summary === null ? '—' : c.money ? `$${Number(c.value ?? 0).toFixed(2)}` : c.value ?? 0}
              </div>
              <div className="text-xs font-semibold text-navy/45 mt-0.5 group-hover:text-sky-deep transition">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* recent content */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy/5">
          <h2 className="font-bold text-navy">Recent content</h2>
          <Link href="/content" className="text-xs font-semibold text-sky-deep hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-navy/45">
            Nothing yet — add a product and hit <b>Generate content</b>, or ask Baymax in chat.
          </div>
        ) : (
          <ul className="divide-y divide-navy/5">
            {recent.map((post) => (
              <li key={post.id} className="px-5 py-3.5 flex items-center gap-3">
                <span className="text-lg">{post.platform === 'tiktok' ? '🎵' : '▶️'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{post.title}</p>
                  <p className="text-xs text-navy/45 truncate">
                    {post.products?.title ?? '—'} · {post.platform}
                  </p>
                </div>
                <StatusBadge status={post.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'published' ? 'green' : status === 'scheduled' ? 'amber' : status === 'failed' ? 'red' : 'gray';
  return <Badge tone={tone as any}>{status}</Badge>;
}
