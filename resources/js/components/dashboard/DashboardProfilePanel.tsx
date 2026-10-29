import { Link } from '@inertiajs/react';
import { Camera, ChevronRight, Crown, Eye, LockKeyhole } from 'lucide-react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import type { DashboardData } from '@/types/dashboard';

export function DashboardProfilePanel({ dashboard }: { dashboard: DashboardData }) {
    const { member, plan } = dashboard;
    const paid = plan !== 'free';
    return <section className="pm-dash-card pm-dash-profile-panel"><h2>My profile</h2>
        <div className="pm-dash-profile-identity"><div className="pm-dash-profile-photo"><DashboardAvatar name={member.name} size={79} demo={dashboard.isDemo}/><Link href="/settings/profile" aria-label="Change profile photo" className="pm-dash-camera"><Camera size={20}/></Link></div>
        <div><strong>{member.name}</strong><p>{paid && <Crown size={17} color="#ffb127" fill="#ffb127"/>}{paid ? `${plan === 'premium' ? 'Premium' : 'Pro'} member` : 'Free member'}</p></div></div>
        <div className="pm-dash-profile-progress"><div><span style={{ width: `${member.completion}%` }} /></div><small>{member.completion}% complete</small></div>
        {plan === 'free' ? <Link href="/settings/profile" className="pm-dash-btn pm-dash-btn-primary pm-dash-full">Complete profile</Link> : <Link href="/dashboard/features/public-profile" className="pm-dash-btn pm-dash-btn-outline pm-dash-full"><Eye size={22}/> View public profile</Link>}
        <Link href="/dashboard/features/public-profile" className={`pm-dash-panel-link ${paid ? 'is-hidden' : ''}`}><Eye size={23}/> View public profile <ChevronRight size={20}/></Link>
        <Link href="/settings/profile" className="pm-dash-panel-link"><LockKeyhole size={22}/> Manage privacy <ChevronRight size={20}/></Link>
    </section>;
}
