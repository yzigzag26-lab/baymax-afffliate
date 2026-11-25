'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, type AuthStatus } from '@/lib/api';
import { Icon } from './icons';
import { Tour } from './Tour';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: 'dashboard' },
  { href: '/chat', label: 'Chat', icon: 'chat' },
  { href: '/products', label: 'Product', icon: 'box' },
];



const DEMO_SESSION_KEY = 'baymax-demo-session';

export function AppShell({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(DEMO_SESSION_KEY) === 'active') {
      setDemoMode(true);
      setStatus({ needsSetup: false, tourCompleted: true, authenticated: true });
      return;
    }
    api<AuthStatus>('/auth/status')
      .then((s) => {
        setStatus(s);
        if (!s.authenticated) router.replace('/');
      })
      .catch(() => router.replace('/'));
  }, [router]);

  if (!status?.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/baymax-icon.png" alt="" className="w-12 h-12 animate-pulse bg-white rounded-xl" />
          <p className="text-sm text-navy/50 font-medium">Opening Baymax…</p>
        </div>
      </div>
    );
  }

  async function logout() {
    if (demoMode) {
      window.localStorage.removeItem(DEMO_SESSION_KEY);
    } else {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    router.replace('/');
  }

  const activeNav = (href: string) => pathname === href || (href === '/dashboard' && pathname === '/');

  return (
    <div className="baymax-app min-h-screen text-navy">
      <div className="baymax-atmosphere" aria-hidden="true">
        <span className="baymax-cloud cloud-one" />
        <span className="baymax-cloud cloud-two" />
        <span className="baymax-cloud cloud-three" />
        <span className="baymax-glow glow-one" />
        <span className="baymax-glow glow-two" />
      </div>

      <header className="baymax-topbar">
        <nav className="baymax-nav baymax-nav-desktop" aria-label="Primary navigation">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={`baymax-nav-link ${activeNav(item.href) ? 'is-active' : ''}`}>
              <Icon name={item.icon} className="w-[17px] h-[17px]" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="baymax-top-actions">
          {demoMode && <span className="baymax-demo-pill">DEMO MODE</span>}
          {actions}
          <Link href="/profile" className="baymax-avatar-button" aria-label="Open profile page">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/baymax-icon.png" alt="" />
            <span className="baymax-online-dot" />
          </Link>
        </div>
      </header>

      <main className={`baymax-main ${title === 'Chat' ? 'baymax-main-chat' : ''}`}>
        {title !== 'Chat' && title !== 'Profile' && title !== 'Dashboard' && <div className="baymax-page-heading">
          <div>
            <p className="baymax-eyebrow">YOUR AFFILIATE WORKSPACE</p>
            <h1>{title === 'Dashboard' ? 'Home' : title === 'Products' ? 'Product' : title}</h1>
          </div>
        </div>}
        {children}
      </main>

      <nav className="baymax-nav baymax-nav-mobile" aria-label="Primary navigation" hidden>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={`baymax-nav-link ${activeNav(item.href) ? 'is-active' : ''}`}>
            <Icon name={item.icon} className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {!demoMode && !status.tourCompleted && <Tour onDone={() => setStatus((s) => s && { ...s, tourCompleted: true })} />}
    </div>
  );
}
