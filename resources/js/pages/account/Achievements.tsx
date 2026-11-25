import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { AchievementPanel, AchievementProgress, BadgeGrid, BadgeMedal, LearningPathways, LatestBadgeCards, achievementDate, badgeProgressText, badgeRequirement, badgeStatusLabel } from '@/components/achievements/AchievementCards';
import { sampleActions, sampleSnapshot, simulate, filterBadges, nearestBadges } from '@/components/achievements/achievementState';
import type { AchievementBadge, AchievementMember, AchievementRecord, AchievementSnapshot } from '@/components/achievements/types';

const views = [['overview', 'Overview'], ['collection', 'Badge collection'], ['record', 'Learning record'], ['profile', 'Profile Overview']] as const;
type View = typeof views[number][0];
const outline = 'pm-button pm-button-sm pm-button-outline';
function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (dialog && !dialog.open) dialog.showModal();
        return () => { if (dialog?.open) dialog.close(); previous?.focus({ preventScroll: true }); };
    }, []);
    return <dialog ref={ref} className="pm-ach-dialog" aria-labelledby="pm-ach-dialog-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
        {children}<div className="pm-ach-dialog-actions"><button type="button" className={outline} onClick={onClose}>Close</button></div>
    </dialog>;
}
function BadgeDetails({ badge, badges }: { badge: AchievementBadge; badges: AchievementBadge[] }) {
    const tiers = badges.filter(item => item.metric === badge.metric);
    return <><div className="pm-ach-dialog-title"><BadgeMedal badge={badge}/><h2 id="pm-ach-dialog-title">{badge.name}</h2></div><p>{badge.category} · Step {badge.tier} · {badgeStatusLabel[badge.status]}</p>
        <p><strong>Unlock requirement</strong> · {badgeRequirement(badge)}</p><AchievementProgress value={badge.value} max={badge.target} label={`${badge.name} progress`} earned={badge.status === 'earned'}/><p>{badgeProgressText(badge)}.</p>
        {!badge.available && <p className="pm-ach-meta">Activity tracking for this badge is not available yet.</p>}
        {tiers.length > 1 && <><h3>Badge progression</h3><ol>{tiers.map(tier => <li key={tier.id}>{tier.name} · {badgeRequirement(tier)} <strong>{badgeStatusLabel[tier.status]}</strong></li>)}</ol></>}
    </>;
}
function RecordPanel({ records, limit }: { records: AchievementRecord[]; limit: number }) {
    const [filter, setFilter] = useState('all');
    const types = [...new Set(records.map(record => record.type))];
    const rows = records.filter(record => filter === 'all' || record.type === filter).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return <AchievementPanel title="Recorded activity" action={<label className="pm-ach-field pm-ach-record-filter">Activity type<select className="pm-select" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All activity</option>{types.map(type => <option key={type}>{type}</option>)}</select></label>}>
        {rows.length ? rows.map(record => <article className="pm-ach-record pm-ach-between" key={record.id}><div><h3>{record.name}</h3><p className="pm-ach-meta">{record.type} · {record.detail}</p></div><time className="pm-ach-meta" dateTime={record.date}>{achievementDate(record.date)}</time></article>) : <p className="pm-ach-empty">No recorded activity yet.</p>}
        {records.length >= limit && <p className="pm-ach-meta pm-ach-record-note">Showing up to {limit} recent records per activity source. <Link href="/activity-log">View activity log</Link></p>}
    </AchievementPanel>;
}
export default function Achievements({ snapshot, member }: { snapshot: AchievementSnapshot; member: AchievementMember }) {
    const initialView = new URL(usePage().url, 'https://pm-circle.local').searchParams.get('view');
    const [view, setView] = useState<View>(() => views.find(([key]) => key === initialView)?.[0] ?? 'overview');
    const [category, setCategory] = useState('all');
    const [status, setStatus] = useState('all');
    const [query, setQuery] = useState('');
    const [modal, setModal] = useState<AchievementBadge | 'sample' | null>(null);
    const [sample, setSample] = useState<AchievementSnapshot | null>(null);
    const [notice, setNotice] = useState('');
    const tabsRef = useRef<HTMLElement>(null);
    const data = sample ?? snapshot;
    const profile = view === 'profile';
    const title = profile ? 'My profile' : 'Achievements & Learning Record';
    const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'instant' }); requestAnimationFrame(() => tabsRef.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus({ preventScroll: true })); };
    const categories = [...new Set(data.badges.map(badge => badge.category))];
    const filtered = filterBadges(data.badges, category, status, query);
    const earned = data.badges.filter(badge => badge.status === 'earned').length;
    const nearest = nearestBadges(data.badges);
    const metrics = [[earned, 'Badges earned'], [data.badges.length - earned, 'Badges to unlock'], [Number((data.metrics.minutes / 60).toFixed(1)), 'Learning hours'], [data.metrics.certificates, 'Course certificates']] as const;
    const showDetails = (badge: AchievementBadge) => setModal(badge);
    function tryActivity(action: typeof sampleActions[number]) {
        const previous = sample ?? sampleSnapshot(snapshot);
        if (action[0] === 'profile' && previous.metrics.profile === 100) { setNotice('The sample profile is already complete.'); setModal(null); return; }
        const next = simulate(previous, action);
        const unlocked = next.badges.filter(badge => badge.status === 'earned' && previous.badges.find(item => item.id === badge.id)?.status !== 'earned');
        setSample(next); setModal(null); setNotice(unlocked.length ? `Unlocked ${unlocked.map(badge => badge.name).join(', ')}.` : 'Activity recorded. Badge progress updated.');
    }
    return <PublicLayout guideLayout><Head title={title}/><div className="pm-achievements-page pm-ach-workspace">
        <header className="pm-ach-heading"><nav className="pm-ach-crumb" aria-label="Breadcrumb"><Link href="/dashboard">Home</Link><span>/</span><span>Profile &amp; career</span><span>/</span><span aria-current="page">{profile ? 'My profile' : 'Achievements'}</span></nav><h1>{title}</h1><p>{profile ? 'Member profile preview' : 'Track learning progress and see what unlocks your next badge.'}</p></header>
        <nav ref={tabsRef} className="pm-ach-tabs" aria-label="Achievement views">{views.map(([key, label]) => <button type="button" key={key} aria-current={view === key ? 'page' : undefined} className={`pm-button pm-button-sm${view === key ? '' : ' pm-button-outline'}`} onClick={() => navigate(key)}>{label}</button>)}<button className={outline} type="button" onClick={() => setModal('sample')}>Try a sample activity</button></nav>
        {sample && <div className="pm-ach-sample pm-ach-between"><p><strong>Sample activity preview</strong> · No real progress is changed.</p><button type="button" className={outline} onClick={() => { setSample(null); setNotice('Returned to your actual achievement record.'); }}>Exit sample preview</button></div>}
        {notice && <p className="pm-ach-notice" role="status">{notice}</p>}
        {view === 'overview' && <><div className="pm-ach-metrics">{metrics.map(([value, label]) => <div className="pm-ach-metric" key={label}><strong>{value}</strong><span className="pm-ach-meta">{label}</span></div>)}</div>
            <LearningPathways paths={data.paths} onRecord={() => navigate('record')}/>
            <AchievementPanel title="Latest badges" action={<button className={outline} type="button" onClick={() => navigate('profile')}>Profile preview</button>}><BadgeGrid badges={data.latest} onDetails={showDetails} empty="No activity badges earned yet."/></AchievementPanel>
            <AchievementPanel title="Closest to unlocking" action={<button className={outline} type="button" onClick={() => navigate('collection')}>All badges</button>}><BadgeGrid badges={nearest} onDetails={showDetails} empty="No partially completed badges."/></AchievementPanel></>}
        {view === 'collection' && <AchievementPanel title="Badge collection" description="Badges unlock automatically when the recorded activity reaches the required milestone."><div className="pm-ach-filters">
            <label className="pm-ach-field">Feature<select className="pm-select" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All features</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
            <label className="pm-ach-field">Status<select className="pm-select" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All badges</option><option value="earned">Earned</option><option value="progress">In progress</option><option value="locked">Locked / not yet earned</option><option value="new">New badges</option></select></label>
            <label className="pm-ach-field">Search badges<input className="pm-input" type="search" placeholder="Try course, profile or simulator" value={query} onChange={event => setQuery(event.target.value)}/></label>
            </div><p className="pm-ach-meta pm-ach-result-count" aria-live="polite">{filtered.length} of {data.badges.length} badges</p><BadgeGrid badges={filtered} onDetails={showDetails} empty="No badges match these filters."/></AchievementPanel>}
        {view === 'record' && <><LearningPathways paths={data.paths} onRecord={() => navigate('record')}/><RecordPanel key={sample ? 'sample' : 'real'} records={data.records} limit={data.recordLimit}/></>}
        {profile && <><div className="pm-ach-profile-cover"><DashboardAvatar name={member.name} src={member.avatar} size={51}/><div><h2>{member.name}</h2><p>{[member.role, member.location].filter(Boolean).join(' · ')}</p></div></div><LatestBadgeCards badges={data.latest} action={<button className={outline} type="button" onClick={() => navigate('overview')}>View achievements</button>}/></>}
        <p className="pm-ach-foot">PM Circle activity badges recognise participation and platform milestones. Professional certifications are issued separately by their certifying bodies.</p>
        {modal && <Modal onClose={() => setModal(null)}>{modal === 'sample' ? <><h2 id="pm-ach-dialog-title">Try a sample activity</h2><p className="pm-ach-meta">Adds activity to an isolated demo account and updates badges automatically. No real activity or certificates are created.</p>{sampleActions.map(action => <div key={action[0]} className="pm-ach-record pm-ach-between"><div><strong>{action[1]}</strong><p className="pm-ach-meta">{action[2]}</p></div><button type="button" className={outline} onClick={() => tryActivity(action)}>Try it</button></div>)}</> : <BadgeDetails badge={modal} badges={data.badges}/>}</Modal>}
    </div></PublicLayout>;
}
