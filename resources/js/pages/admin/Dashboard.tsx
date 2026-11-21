import { Link, router } from '@inertiajs/react';
import { Activity, ArrowRight, Bell, BookOpen, BookOpenCheck, CalendarDays, CircleHelp, ClipboardCheck, Database, Flag, Gift, GraduationCap, Layers3, MessageSquare, Settings2, ShieldCheck, Sparkles, UploadCloud, UsersRound } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { DashboardCard } from '@/components/admin/dashboard/DashboardCard';
import { MetricCard } from '@/components/admin/dashboard/MetricCard';
import { ActivityChart } from '@/components/admin/dashboard/ActivityChart';
import { EngagementMix } from '@/components/admin/dashboard/EngagementMix';
import type { AdminDashboardProps } from '@/types/admin-dashboard';

const metrics = [
    { key: 'members', label: 'Total Members', icon: UsersRound },
    { key: 'learners', label: 'Active Learners', icon: GraduationCap },
    { key: 'questionSets', label: 'Interview Question Sets', icon: Layers3 },
    { key: 'aiRequestsToday', label: 'AI Requests Today', icon: Sparkles },
    { key: 'posts', label: 'Community Posts', icon: MessageSquare },
    { key: 'enrollments', label: 'Course Enrollments', icon: BookOpen },
] as const;
const quick = [
    { label: 'Add Question Set', href: '/admin/interview-preparation?tab=sets', icon: Layers3 },
    { label: 'Import Questions', href: '/admin/interview-preparation?tab=questions', icon: UploadCloud },
    { label: 'Review Reported Posts', href: '/admin/post-reports', icon: Flag },
    { label: 'Manage Rewards', href: '/admin/profile-rewards', icon: Gift },
    { label: 'Update Homepage', href: '/admin/homepage', icon: ClipboardCheck },
    { label: 'Add Course', href: '/admin/learning/courses/create', icon: BookOpenCheck },
] as const;
const eventIcons = { interview: Layers3, moderation: Flag, learning: BookOpen, homepage: ClipboardCheck } as const;
const number = (value: number) => value.toLocaleString('en-US');
const when = (date: string) => {
    const parsed = new Date(date.includes('T') ? date : `${date.replace(' ', 'T')}Z`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function Dashboard({ days, timezone, stats, series, mix, recent, pending, pendingReviewCount, health, interview }: AdminDashboardProps) {
    return <AdminLayout title="Dashboard" subtitle="Track platform health, learning engagement, interview readiness and content activity at a glance."
        active="/admin" dashboardHeader={{ pendingReviews: pendingReviewCount }} headingAction={
            <div className="pm-admin-overview-period"><CalendarDays size={18} aria-hidden="true"/>
                <AdminChoice id="pm-admin-overview-period" label="Reporting period" value={String(days)}
                    options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]}
                    onChange={value => router.get('/admin', { days: value }, { preserveScroll: true })}/>
            </div>}>
        <div className="pm-admin-overview" aria-label="Administration dashboard">
            <div className="pm-admin-overview-metrics">
                {metrics.map(item => <MetricCard key={item.key} label={item.label} metric={stats[item.key]} icon={item.icon}/>)}
            </div>
            <div className="pm-admin-overview-main-panels">
                <ActivityChart series={series} timezone={timezone}/>
                <EngagementMix items={mix}/>
                <DashboardCard title="Quick actions" subtitle="Common administrative actions" className="pm-admin-overview-quick-card">
                    <div className="pm-admin-overview-quick-grid">
                        {quick.map(({ label, href, icon: Icon }) => <Link key={label} href={href} className="pm-admin-overview-quick-link"><Icon size={22} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span></Link>)}
                    </div>
                </DashboardCard>
            </div>
            <div className="pm-admin-overview-secondary-panels">
                <DashboardCard title="Recent activity" subtitle="Latest recorded administrative and content updates">
                    {recent.length ? <div className="pm-admin-overview-event-list">{recent.map((event, idx) => {
                        const Icon = eventIcons[event.kind as keyof typeof eventIcons] ?? Activity;
                        return <Link key={`${event.kind}-${idx}-${event.at}`} href={event.href} className="pm-admin-overview-event">
                            <span className="pm-admin-overview-event-icon"><Icon size={19} aria-hidden="true"/></span>
                            <span className="pm-admin-overview-event-detail"><strong>{event.title}</strong><small>{event.detail}</small></span>
                            <time>{when(event.at)}</time>
                        </Link>;
                    })}</div> : <p className="pm-admin-overview-empty">No recent administrative activity was recorded.</p>}
                </DashboardCard>
                <DashboardCard title="System health" subtitle="Configuration and operational visibility">
                    <div className="pm-admin-overview-health">
                        <div className="pm-admin-overview-health-row"><span className="pm-admin-overview-event-icon"><Activity size={20}/></span><span><strong>Job queue</strong><small>{health.queue.driver} driver configured · Worker health not measured</small></span><em className="pm-admin-overview-status">{health.queue.status}</em></div>
                        <div className="pm-admin-overview-health-row"><span className="pm-admin-overview-event-icon"><Sparkles size={20}/></span><span><strong>AI service</strong><small>{number(health.ai.enabledFeatures)} enabled AI features · Live availability not tested</small></span><em className={`pm-admin-overview-status ${health.ai.configured ? 'is-success' : ''}`}>{health.ai.configured ? 'Configured' : 'Not configured'}</em></div>
                        <div className="pm-admin-overview-health-row"><span className="pm-admin-overview-event-icon"><ShieldCheck size={20}/></span><span><strong>Active plans</strong><small>{health.plans.length ? health.plans.map(plan => `${plan.name}: ${number(plan.members)}`).join(' · ') : 'No active paid subscriptions'}</small></span><em className="pm-admin-overview-status is-info">{number(health.plans.reduce((sum, plan) => sum + plan.members, 0))} total</em></div>
                        <div className="pm-admin-overview-health-row"><span className="pm-admin-overview-event-icon"><Database size={20}/></span><span><strong>Storage &amp; backups</strong><small>Backup telemetry is not connected</small></span><em className="pm-admin-overview-status">{health.backup.status}</em></div>
                    </div>
                </DashboardCard>
            </div>
            <div className="pm-admin-overview-bottom-panels">
                <DashboardCard title="Interview preparation snapshot" subtitle="Current interview preparation content" className="pm-admin-overview-interview-card"
                    action={<Link href="/admin/interview-preparation" className="pm-admin-overview-outline-link">Manage <ArrowRight size={15}/></Link>}>
                    <div className="pm-admin-overview-interview-stats">
                        {[
                            { label: 'Question sets', value: interview.sets, icon: Layers3 },
                            { label: 'Total questions', value: interview.questions, icon: CircleHelp },
                            { label: 'Question types', value: interview.types, icon: Settings2 },
                            { label: 'Answer modes', value: interview.modes, icon: MessageSquare },
                            { label: 'Recent imports', value: interview.recentImports, icon: UploadCloud },
                        ].map(({ label, value, icon: Icon }) => <div className="pm-admin-overview-interview-stat" key={label}>
                            <Icon size={22} aria-hidden="true"/><strong>{value === null ? '—' : number(value)}</strong><span>{label}</span>{value === null && <small>Not tracked</small>}
                        </div>)}
                    </div>
                </DashboardCard>
                <DashboardCard title="Upcoming tasks" subtitle="Pending moderation requiring attention" action={<Link href="/admin/post-reports" className="pm-admin-overview-text-link">View all <ArrowRight size={15}/></Link>}>
                    {pending.length ? <div className="pm-admin-overview-pending-list">{pending.map(item => <Link href={item.href} key={item.title} className="pm-admin-overview-pending">
                        <span className="pm-admin-overview-task-check"><Bell size={14}/></span>
                        <span>{item.title} <strong>({number(item.count)})</strong></span>
                        <em className={`pm-admin-overview-priority is-${item.severity}`}>{item.severity === 'high' ? 'High' : 'Medium'}</em>
                    </Link>)}</div> : <div className="pm-admin-overview-empty-success"><ShieldCheck size={22}/><span>No pending moderation tasks</span></div>}
                </DashboardCard>
            </div>
            <p className="pm-admin-overview-footnote">Dashboard activity uses recorded database events. Values update on refresh and may be cached for up to 60 seconds. Reporting dates use {timezone}. Unmonitored services are never marked healthy.</p>
        </div>
    </AdminLayout>;
}
