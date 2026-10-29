import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, ClipboardList, Clock3, Compass, FileText, Search, ShieldCheck, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LearningLayout, LearningPanel, LearningProgress, PathCard, levels, practiceFormats } from '@/components/learning/LearningShared';
import type { LearningPathCardData, LearningShell } from '@/types/learning';
import { learningActivityHref, learningPathHref } from '@/types/learning';

type CatalogProps = { shell: LearningShell; paths: LearningPathCardData[];
    stats: { completedActivities: number; completedPaths: number; minutes: number }; recent: LearningPathCardData | null };
type CatalogTab = 'my' | 'explore' | 'practice';

export default function Catalog({ shell, paths, stats, recent }: CatalogProps) {
    const pageUrl = usePage().url;
    const initial = new URLSearchParams(pageUrl.split('?')[1] || '');
    const [tab, setTab] = useState<CatalogTab>(initial.get('tab') === 'my-learning' ? 'my' : initial.get('tab') === 'practice' ? 'practice' : 'explore');
    const [level, setLevel] = useState('All levels');
    const [term, setTerm] = useState(initial.get('search') || '');
    const [format, setFormat] = useState('all');
    const filtered = useMemo(() => paths.filter(path =>
        (level === 'All levels' || level === path.level) &&
        (tab !== 'my' || path.completed > 0) &&
        `${path.title} ${path.level} ${path.summary}`.toLowerCase().includes(term.toLowerCase()) &&
        (format === 'all' || format === 'mcq' || (format === 'scenario' && path.practiceCount > 0) || (format === 'short_answer' && path.practiceCount > 0)),
    ), [paths, level, tab, term, format]);
    const minutes = stats.minutes;
    const hoursLabel = `${Math.floor(minutes/60)} h${minutes%60 ? ` ${minutes%60} m`:''}`;
    const current = recent;
    return <LearningLayout shell={shell}><Head title="Learn & practice" />
        <div className="pm-learn-page-title"><div><h1>Learn & practice</h1><p>Build your skills at every stage of your project management career.</p></div>
            <button type="button" className="pm-dash-btn pm-dash-btn-white" onClick={() => setTab('my')}><ChartNoAxesColumnIncreasing size={20}/>My learning record</button></div>
        <div className="pm-learn-tabs" role="tablist" aria-label="Learning views">
            {([['my','My learning'],['explore','Explore paths'],['practice','Practice library']] as const).map(([value,label]) =>
                <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
        </div>
        <div className="pm-learn-continue pm-learn-panel"><div className="pm-learn-continue-icon"><BookOpen size={40}/></div><div className="pm-learn-continue-main"><small>{current ? 'Continue where you left off' : 'Ready to begin learning?'}</small>
            <strong>{current?.title || 'Start your project management journey'}</strong><p>{current ? `${current.level} path · Continue your progress` : 'Student & Beginner path · Module 1 of 6'}</p>
            <div className="pm-learn-continue-progress"><LearningProgress percent={current?.progress ?? 0}/></div></div>
            <Link className="pm-dash-btn pm-dash-btn-primary" href={current ? learningPathHref(current.slug) : '/learning/student-beginner'}>{current ? 'Continue learning' : 'Start learning'}</Link>
            <div className="pm-learn-continue-stats"><div><Clock3 size={28}/><b>{hoursLabel}</b><small>learned</small></div><div><ClipboardList size={28}/><b>{stats.completedActivities}</b><small>activities completed</small></div><div><Trophy size={28}/><b>{stats.completedPaths}</b><small>paths completed</small></div></div></div>
        <div className="pm-learn-levels" role="group" aria-label="Learning levels">{levels.map(value => <button type="button" key={value} className={level === value ? 'active' : ''} onClick={() => setLevel(value)}>{value}</button>)}</div>
        <div className="pm-learn-filters"><label className="pm-learn-search"><Search size={20}/><span className="sr-only">Search learning paths</span><input placeholder="Search skills, courses or learning paths..." value={term} onChange={event => setTerm(event.target.value)}/></label>
            <label className="pm-learn-select"><span className="sr-only">Filter formats</span><select value={format} onChange={event => setFormat(event.target.value)}><option value="all">All formats</option><option value="mcq">MCQ</option><option value="short_answer">Short answers</option><option value="scenario">Scenarios</option></select></label></div>
        <div className="pm-learn-columns"><div className="pm-learn-main-col">
            {tab !== 'practice' && <><div className="pm-learn-section-heading"><h2>{tab === 'my' ? 'Your learning paths' : 'Choose your next learning path'}</h2><button type="button" onClick={() => { setLevel('All levels'); setTerm(''); setTab('explore'); }}>View all <ArrowRight size={17}/></button></div>
                <div className="pm-learn-path-grid">{filtered.map(item => <PathCard key={item.slug} item={item}/>)}
                    {tab === 'explore' && level === 'All levels' && !term && <div className="pm-learn-panel pm-learn-discover"><span className="pm-learn-discover-icon"><Compass size={40}/></span><div><h3>Not sure where to begin?</h3><p>Answer a short skills check to find a suitable starting path.</p><small><FileText size={16}/> 10 questions · About 5 minutes</small></div><Link className="pm-dash-btn pm-dash-btn-white" href="/learning/student-beginner">Find my starting point</Link></div>}</div>
                {filtered.length === 0 && <div className="pm-learn-panel pm-learn-empty">{tab === 'my' ? 'No started learning paths yet. Explore the paths to begin.' : 'No paths match your filters.'}</div>}</>}
            <div className="pm-learn-section-heading pm-learn-practice-heading"><h2>Pick a practice session</h2></div>
            <div className="pm-learn-practice-grid">{practiceFormats.map(item => { const Icon=item.icon; return <Link href={learningActivityHref('student-beginner',1,item.type==='mcq'?2:item.type==='short_answer'?3:item.type==='scenario'?4:1)} key={item.type} className="pm-learn-panel pm-learn-practice-card"><div className={`pm-learn-practice-icon type-${item.type}`}><Icon size={27}/></div><div><strong>{item.title}</strong><p>{item.description}</p><small><Clock3 size={13}/>{item.duration}</small><span>Start practice <ArrowRight size={14}/></span></div></Link>; })}</div>
        </div><aside className="pm-learn-side-col" aria-label="Learning progress and achievements">
            <LearningPanel title="Your learning progress"><div className="pm-learn-stat-triplet"><div><Clock3/> <strong>{hoursLabel}</strong><small>Learning time</small></div><div><FileText/><strong>{stats.completedActivities}</strong><small>Completed activities</small></div><div><BookOpen/><strong>{stats.completedPaths}</strong><small>Paths completed</small></div></div>
                <div className="pm-learn-division"/><small>PM Circle learning level</small><p><strong>Level {Math.max(1,Math.floor(stats.completedActivities / 8) + 1)}</strong></p><div className="pm-learn-xp-label">Decision Explorer <span>{stats.completedActivities*40} / 1,500 XP</span></div><LearningProgress percent={Math.min(100,Math.floor(stats.completedActivities*40 / 1500*100))}/><button className="pm-learn-text-link" onClick={() => setTab('my')}>View learning history <ArrowRight size={17}/></button></LearningPanel>
            <LearningPanel title="Achievements" action={<Link className="pm-learn-small-link" href="/dashboard/features/achievements">View all medals <ArrowRight size={14}/></Link>}><div className="pm-learn-medals"><div><span>☆</span><b>First Decision</b><small>Completed your first practice session</small></div><div><span>⬡</span><b>Risk Spotter</b><small>Identified key risks in a scenario</small></div><div><span>♧</span><b>Helpful Voice</b><small>Contributed to the community</small></div></div><div className="pm-learn-division"/><strong className="pm-learn-next-heading">⚑ &nbsp; Next: Change Navigator</strong><small>{stats.completedActivities} / 5 activities</small><LearningProgress percent={Math.min(100,stats.completedActivities*20)}/></LearningPanel>
            <LearningPanel title="On your professional profile"><div className="pm-learn-profile-summary"><BookOpen size={24}/><strong>Learning & practice summary</strong></div><p className="pm-learn-profile-line">{stats.completedActivities} completed activities</p><p className="pm-learn-profile-line">{stats.completedActivities > 0 ? "Practised: Stakeholders, Risk, Scope" : "No practice topics completed yet"}</p><p className="pm-learn-profile-line">{stats.completedPaths} completed learning paths</p><p className="pm-learn-muted-note">Your learning history is private until you choose to share it.</p><Link className="pm-learn-text-link" href="/settings/profile">Manage profile visibility <ArrowRight size={17}/></Link></LearningPanel>
        </aside></div>
        <div className="pm-learn-bottom-note"><strong><ChartNoAxesColumnIncreasing size={24}/>Learn → Practice → Review feedback → Improve</strong><span>Track completion, review mistakes and build evidence of your learning.</span><em><ShieldCheck size={18}/> Learning levels and medals recognise platform progress, not professional certification.</em></div>
    </LearningLayout>;
}
