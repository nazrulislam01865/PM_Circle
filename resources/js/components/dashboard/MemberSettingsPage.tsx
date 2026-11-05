import { Link, usePage } from '@inertiajs/react';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';
import type { ReactNode } from 'react';

/** All authenticated settings pages use the same PM Circle navigation shell. */
export function MemberSettingsPage({ active, children }: { active: 'security' | 'appearance'; children: ReactNode }) {
    const { memberShell } = usePage<{ memberShell?: DashboardShellData }>().props;
    const shell: DashboardShellData = memberShell ?? {
        plan: 'free', member: { name: 'Member', role: '', completion: 0 }, isDemo: false,
    };
    return <MemberDashboardLayout dashboard={shell}>
        <div className="pm-member-settings">
            <header className="pm-member-settings-heading">
                <h1>Settings</h1><p>Manage your account and preferences.</p>
            </header>
            <nav className="pm-member-settings-tabs" aria-label="Account settings">
                <Link href="/settings/profile" >My profile</Link>
                <Link href="/settings/security" className={active === 'security' ? 'is-active' : ''} aria-current={active === 'security' ? 'page' : undefined}>Security</Link>
                <Link href="/settings/appearance" className={active === 'appearance' ? 'is-active' : ''} aria-current={active === 'appearance' ? 'page' : undefined}>Appearance</Link>
            </nav>
            <div className="pm-member-settings-panels">{children}</div>
        </div>
    </MemberDashboardLayout>;
}
