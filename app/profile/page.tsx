'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AppShell } from '@/components/AppShell';
import { Icon } from '@/components/icons';

const groups = [
  [
    { title: 'Profile', href: '/settings#profile', icon: 'user' },
    { title: 'Scheduled Tasks', href: '/content?status=scheduled', icon: 'clock' },
    { title: 'Connected Accounts', href: '/connected-accounts', icon: 'link' },
    { title: 'Wallet', href: '/analytics', icon: 'wallet' },
  ],
  [
    { title: 'Security', href: '/settings#security', icon: 'shield' },
    { title: 'System Preferences', href: '/settings#appearance', icon: 'sliders' },
    { title: 'Content', href: '/content', icon: 'file' },
    { title: 'Analytics', href: '/analytics', icon: 'chart' },
    { title: 'About', href: '/about', icon: 'info' },
  ],
];

function ProfileBody() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(
    () => groups.map((group) => group.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()))).filter((group) => group.length > 0),
    [search],
  );

  async function signOut() {
    if (window.localStorage.getItem('baymax-demo-session') === 'active') {
      window.localStorage.removeItem('baymax-demo-session');
    } else {
      await api('/auth/logout', { method: 'POST' }).catch(() => {});
    }
    router.replace('/');
  }

  return (
    <div className="baymax-profile-page">
      <div className="baymax-profile-identity">
        <h2>Baymax workspace</h2>
        <p>Your affiliate workspace</p>
      </div>

      <div className="baymax-profile-groups">
        {filteredGroups.length > 0 ? filteredGroups.map((group, groupIndex) => (
          <section className="baymax-profile-group" key={groupIndex} aria-label={groupIndex === 0 ? 'Account' : 'Preferences and workspace'}>
            {group.map((item) => (
              <Link href={item.href} className="baymax-profile-row" key={item.title}>
                <Icon name={item.icon} className="baymax-profile-row-icon" />
                <span>{item.title}</span>
                <Icon name="chevron-right" className="baymax-profile-chevron" />
              </Link>
            ))}
          </section>
        )) : (
          <p className="baymax-profile-empty">No matching settings found.</p>
        )}
      </div>

      <button type="button" onClick={signOut} className="baymax-profile-signout">
        <Icon name="logout" className="baymax-profile-row-icon" />
        <span>Sign Out</span>
        <Icon name="chevron-right" className="baymax-profile-chevron" />
      </button>

      <label className="baymax-profile-search">
        <Icon name="search" className="baymax-profile-search-icon" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search profile settings"
        />
      </label>
    </div>
  );
}

export default function ProfilePage() {
  return <AppShell title="Profile"><ProfileBody /></AppShell>;
}
