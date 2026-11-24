import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';

export function AccountPage({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    const { memberShell } = usePage<{ memberShell: DashboardShellData }>().props;
    return <MemberDashboardLayout dashboard={memberShell}><Head title={title}/><div className="pm-account-page"><h1>{title}</h1>{description && <p className="pm-account-lead">{description}</p>}{children}</div></MemberDashboardLayout>;
}
