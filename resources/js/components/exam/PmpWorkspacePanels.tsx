import { Link } from '@inertiajs/react';
import {
    ArrowRight, Bookmark, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight,
    CircleHelp, Clock3, Coins, FileCheck2, Info, Layers3, Play, Sparkles, Target,
} from 'lucide-react';
import { Fragment, useState, type FormEvent, type ReactNode } from 'react';
import { examResult, examReview } from '@/components/exam/ExamShared';

export type PmpWorkspaceAttempt = {
    id: number;
    status: string;
    mode?: string | null;
    total_questions: number;
    correct_count: number | null;
    started_at: string;
    expires_at: string;
    finished_at: string | null;
    answered_count: number;
    flagged_count: number;
};
export type PmpPlanDetails = {
    code: string; source: 'subscription' | 'complimentary' | 'none';
    starts_at: string | null; ends_at: string | null;
};
export type PmpAiUsageData = {
    allocated: number; used: number; reserved?: number; remaining: number;
    configured?: boolean; reset_at?: string;
    activity: { kind: string; tokens: number }[];
};
export type PmpTopicRow = { attemptId: number; topic: string; total: number; correct: number };
export type PmpDashboardTab = 'overview' | 'performance' | 'history' | 'ai';

const tabs: { id: PmpDashboardTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'history', label: 'Exam History' },
    { id: 'ai', label: 'AI Usage' },
];

export function PmpWorkspaceTabs({ active, onChange }: {
    active: PmpDashboardTab; onChange: (next: PmpDashboardTab) => void;
}) {
    return <nav className="pm-pmp-tabs" aria-label="PMP simulator dashboard tabs" role="tablist">
        {tabs.map((tab, index) => <span key={tab.id} className="pm-pmp-tab-wrap">
            {index > 0 && <span className="pm-pmp-tab-divider" aria-hidden="true"/>}
            <button type="button" role="tab" id={`pm-pmp-tab-${tab.id}`}
                aria-controls="pmp-dashboard-content" aria-selected={active === tab.id}
                tabIndex={active === tab.id ? 0 : -1}
                onKeyDown={event => {
                    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                    if (!offset && event.key !== 'Home' && event.key !== 'End') return;
                    event.preventDefault();
                    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                        : (index + offset + tabs.length) % tabs.length;
                    onChange(tabs[nextIndex].id);
                    const items = event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                    items?.[nextIndex]?.focus();
                }}
                className={active === tab.id ? 'is-active' : undefined}
                onClick={() => onChange(tab.id)}>{tab.label}</button>
        </span>)}
    </nav>;
}

function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <section className={`pm-pmp-surface${className ? ` ${className}` : ''}`}>{children}</section>;
}
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <div className={`pm-pmp-panel${className ? ` ${className}` : ''}`}>{children}</div>;
}
function IconTile({ children }: { children: ReactNode }) {
    return <span className="pm-pmp-icon-tile" aria-hidden="true">{children}</span>;
}
function PagePill({ children }: { children: ReactNode }) {
    return <span className="pm-pmp-page-pill">{children}</span>;
}
function PrimaryAction({ children, onClick, disabled = false }: {
    children: ReactNode; onClick: () => void; disabled?: boolean;
}) {
    return <button className="pm-pmp-primary" type="button" onClick={onClick} disabled={disabled}>{children}</button>;
}
function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
    return <Link className="pm-pmp-secondary" href={href}>{children}</Link>;
}
function PercentBar({ percent }: { percent: number }) {
    return <div className="pm-pmp-progress" role="progressbar" aria-label="Progress"
        aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}/>
    </div>;
}
function valuePercent(attempt: PmpWorkspaceAttempt): number {
    return attempt.total_questions > 0 && attempt.correct_count !== null
        ? Math.round(100 * attempt.correct_count / attempt.total_questions) : 0;
}
function storageDate(value: string): Date {
    const iso = value.replace(' ', 'T');
    return new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : `${iso}Z`);
}
function dateLabel(value: string | null, withYear = false): string {
    return value ? new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}),
    }).format(storageDate(value)) : '—';
}
function timeLabel(value: string | null): string {
    return value ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit',
    }).format(storageDate(value)) : '—';
}
function minutesBetween(start: string, end: string): number {
    return Math.max(0, Math.round((storageDate(end).getTime() - storageDate(start).getTime()) / 60000));
}
function readableDuration(minutes: number): string {
    if (!Number.isFinite(minutes)) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}
function isResumable(attempt: PmpWorkspaceAttempt): boolean {
    return attempt.status === 'in_progress' && storageDate(attempt.expires_at).getTime() > Date.now();
}
function studyTopics(topics: PmpTopicRow[], completed: PmpWorkspaceAttempt[], maxAttempts: number) {
    const included = new Set(completed.slice(0, maxAttempts).map(a => a.id));
    const totals = new Map<string, { correct: number; total: number }>();
    for (const topic of topics) {
        if (!included.has(topic.attemptId)) continue;
        const previous = totals.get(topic.topic) ?? { correct: 0, total: 0 };
        previous.correct += topic.correct;
        previous.total += topic.total;
        totals.set(topic.topic, previous);
    }
    return [...totals.entries()].map(([topic, counts]) => ({ topic, ...counts,
        percent: counts.total ? Math.round(100 * counts.correct / counts.total) : 0,
    })).sort((a, b) => a.percent - b.percent);
}

export function PmpOverview({ attempts, planCode, planDetails, targetExamDate, attemptTotals, aiUsage,
    topics, availableQuestions, fullLength, fullQuestionCount, focusedQuestionCount, onStart, onFocus, starting, onAi }: {
    attempts: PmpWorkspaceAttempt[]; planCode: string; planDetails: PmpPlanDetails;
    targetExamDate: string | null; attemptTotals: { completed: number; inProgress: number; practiceCompleted: number; latestScore: number | null };
    aiUsage: PmpAiUsageData;
    topics: PmpTopicRow[]; availableQuestions: number; fullLength: boolean; fullQuestionCount: number; focusedQuestionCount: number;
    onStart: () => void; onFocus: (domain: string) => void; starting: boolean; onAi: () => void;
}) {
    const activeAttempt = attempts.find(isResumable);
    const completed = attempts.filter(attempt => attempt.status === 'completed');
    const latest = completed[0];
    const weakest = studyTopics(topics, completed, 5)[0];
    const [editingDate, setEditingDate] = useState(false);
    const [targetDate, setTargetDate] = useState(targetExamDate ?? '');
    const [dateSaving, setDateSaving] = useState(false);
    const [dateError, setDateError] = useState('');
    const answered = activeAttempt?.answered_count ?? 0;
    const progress = activeAttempt ? Math.round(100 * answered / Math.max(1, activeAttempt.total_questions)) : 0;
    const startedAt = planDetails.starts_at ? storageDate(planDetails.starts_at).getTime() : 0;
    const endsAt = planDetails.ends_at ? storageDate(planDetails.ends_at).getTime() : 0;
    const usedDays = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 86400000)) : null;
    const daysLeft = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 86400000)) : null;

    const saveDate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (dateSaving) return;
        setDateError('');
        setDateSaving(true);
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch('/exams/pmp/target-date', {
                method: 'PUT', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ targetDate: targetDate || null }),
            });
            if (!response.ok) {
                if (response.status === 419) throw new Error('Session expired. Refresh the page.');
                if (response.status === 422) throw new Error('Choose today or a future date.');
                throw new Error('Could not save your exam date. Please try again.');
            }
            const result: { targetDate: string | null } = await response.json();
            setTargetDate(result.targetDate ?? '');
            setEditingDate(false);
        } catch (error) {
            setDateError(error instanceof Error ? error.message : 'Unable to save exam date.');
        } finally {
            setDateSaving(false);
        }
    };

    return <Surface>
        <div className="pm-pmp-overview-heading">
            <div><PagePill>OVERVIEW</PagePill><h1>My PMP Exam Simulator</h1>
                <span className="pm-pmp-sample-tag"><Info size={13}/> Your exam activity</span></div>
            <div className="pm-pmp-heading-action"><PrimaryAction onClick={onStart} disabled={!availableQuestions || starting}>
                <Play size={17} fill="currentColor"/> {starting ? 'Starting exam...' : 'Start a New Mock Exam'}
            </PrimaryAction><span>{fullLength ? `Unlimited ${fullQuestionCount}-question mock attempts with active access` : `${availableQuestions} active practice questions available`}</span></div>
        </div>
        <div className="pm-pmp-overview-cards">
            <Panel><div className="pm-pmp-card-title"><IconTile><CalendarDays/></IconTile><strong>Current Plan · {planCode.toUpperCase()}</strong></div>
                <div className="pm-pmp-plan-dates"><span>Activated <strong>{dateLabel(planDetails.starts_at, true)}</strong></span>
                    <span>Expires <strong>{dateLabel(planDetails.ends_at, true)}</strong></span></div>
                <div className="pm-pmp-dual-stats"><div><strong>{usedDays ?? '—'}</strong><small>days used</small></div>
                    <div><strong>{daysLeft ?? '—'}</strong><small>days remaining</small></div></div>
                {planDetails.source === 'complimentary' && <p className="pm-pmp-muted">Complimentary access has no billed activation or expiry dates.</p>}
                <SecondaryLink href="/membership">Manage Plan</SecondaryLink>
            </Panel>
            <Panel><div className="pm-pmp-card-title"><IconTile><Layers3/></IconTile><strong>Mock Exams</strong></div>
                <div className="pm-pmp-dual-stats"><div><strong>{attemptTotals.completed}</strong><small>completed</small></div>
                    <div><strong>{attemptTotals.inProgress}</strong><small>in progress</small></div></div>
                <p className="pm-pmp-muted">Latest score: <strong>{attemptTotals.latestScore !== null ? `${attemptTotals.latestScore}%` : 'No completed mock yet'}</strong></p>
                {attemptTotals.practiceCompleted > 0 && <p className="pm-pmp-muted">Focused practice completed: <strong>{attemptTotals.practiceCompleted}</strong></p>}
            </Panel>
            <Panel><div className="pm-pmp-card-title"><IconTile><Sparkles/></IconTile><strong>AI Tokens</strong></div>
                <div className="pm-pmp-dual-stats"><div><strong>{aiUsage.used.toLocaleString('en-US')}</strong><small>used</small></div>
                    <div><strong>{aiUsage.remaining.toLocaleString('en-US')}</strong><small>remaining</small></div></div>
                <p className="pm-pmp-muted">{aiUsage.configured === false
                    ? 'AI token usage has not been configured for this plan.'
                    : `${aiUsage.allocated.toLocaleString('en-US')} tokens allocated for this billing cycle.`}</p>
                <button type="button" className="pm-pmp-secondary" onClick={onAi}>View AI Usage</button>
            </Panel>
        </div>
        <Panel className="pm-pmp-continue"><h2>Continue your mock</h2>
            {activeAttempt ? <div className="pm-pmp-continue-row"><IconTile><FileCheck2/></IconTile>
                <strong>{activeAttempt.mode === 'full' || (!activeAttempt.mode && activeAttempt.total_questions === fullQuestionCount) ? 'Full Mock' : 'Practice'} #{activeAttempt.id}</strong>
                <div className="pm-pmp-continue-progress"><div><span>{answered} of {activeAttempt.total_questions} answered</span><span>{progress}%</span></div>
                    <PercentBar percent={progress}/></div>
                <SecondaryLink href={`/exams/pmp/attempts/${activeAttempt.id}`}>Resume Exam <ArrowRight size={15}/></SecondaryLink>
            </div> : <div className="pm-pmp-no-attempt">No resumable mock. Starting a new mock never removes saved attempts or answers.</div>}
        </Panel>
        <Panel className="pm-pmp-study"><h2>Your Study Plan</h2>
            <div className="pm-pmp-study-date"><CalendarDays size={20}/><span>Target exam date:
                <strong> {targetDate ? new Date(`${targetDate}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Not set'}</strong></span>
                {!editingDate && <button type="button" className="pm-pmp-secondary" onClick={() => setEditingDate(true)}>{targetDate ? 'Change exam date' : 'Set exam date'}</button>}
            </div>
            {editingDate && <form className="pm-pmp-date-form" onSubmit={saveDate}>
                <label htmlFor="pm-pmp-target-date">Target PMP exam date</label>
                <input id="pm-pmp-target-date" type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)}/>
                <button type="submit" className="pm-pmp-primary" disabled={dateSaving}>{dateSaving ? 'Saving...' : 'Save date'}</button>
                <button type="button" className="pm-pmp-secondary" onClick={() => { setTargetDate(targetExamDate ?? ''); setEditingDate(false); setDateError(''); }}>Cancel</button>
            </form>}
            {dateError && <p className="pm-pmp-action-error" role="alert">{dateError}</p>}
            <div className="pm-pmp-study-actions">
                {latest ? <Link href={`${examReview(latest.id)}?filter=missed`}><Target size={19}/>Review missed questions<ChevronRight size={18}/></Link>
                    : <span><Target size={19}/>Complete your first mock to review missed questions<ChevronRight size={18}/></span>}
                {weakest ? <button type="button" onClick={() => onFocus(weakest.topic)} disabled={starting}>
                    <Layers3 size={19}/>Practice {focusedQuestionCount} questions in {weakest.topic}<ChevronRight size={18}/></button>
                    : <span><Layers3 size={19}/>Complete a mock to identify weaker topics<ChevronRight size={18}/></span>}
                <button type="button" onClick={onStart} disabled={!availableQuestions || starting}><Clock3 size={19}/>Take a timed mock<ChevronRight size={18}/></button>
            </div>
        </Panel>
    </Surface>;
}

function ScoreTrend({ completed }: { completed: PmpWorkspaceAttempt[] }) {
    const points = [...completed].reverse();
    if (!points.length) return <p className="pm-pmp-empty">Finish a mock exam to see your score trend.</p>;
    const x = (index: number) => 48 + index * (474 / Math.max(1, points.length - 1));
    const y = (score: number) => 178 - score * 1.38;
    const coords = points.map((attempt, i) => `${x(i)},${y(valuePercent(attempt))}`);
    const outline = `M ${coords.join(' L ')}`;
    const area = `${outline} L ${x(points.length - 1)},178 L ${x(0)},178 Z`;
    return <svg className="pm-pmp-chart" viewBox="0 0 570 230" role="img"
        aria-label={`Exam score trend: ${points.map(a => `${dateLabel(a.finished_at, true)} ${valuePercent(a)} percent`).join('; ')}`}>
        <defs><linearGradient id="pmp-dashboard-score-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity=".18"/><stop offset="100%" stopColor="var(--blue)" stopOpacity="0"/>
        </linearGradient></defs>
        {[0, 20, 40, 60, 80, 100].map(n => <g key={n}><line x1="42" x2="535" y1={y(n)} y2={y(n)} stroke="var(--border)" strokeDasharray="3 5"/>
            <text x="35" y={y(n) + 4} textAnchor="end" className="pm-pmp-axis-text">{n}%</text></g>)}
        <path d={area} fill="url(#pmp-dashboard-score-fill)"/>
        <path d={outline} stroke="var(--blue)" strokeWidth="2.4" fill="none" strokeLinejoin="round"/>
        {points.map((attempt, index) => <g key={attempt.id}>
            <title>{`${dateLabel(attempt.finished_at, true)} · ${valuePercent(attempt)}% · Mock #${attempt.id}`}</title>
            <circle cx={x(index)} cy={y(valuePercent(attempt))} r="4.5" stroke="var(--blue)" strokeWidth="2" fill="var(--surface)"/>
            <text x={x(index)} y={y(valuePercent(attempt)) - 12} textAnchor="middle" className="pm-pmp-point-label">{valuePercent(attempt)}%</text>
            <text x={x(index)} y="207" textAnchor="middle" className="pm-pmp-axis-text">{dateLabel(attempt.finished_at)}</text>
        </g>)}
    </svg>;
}

export function PmpPerformance({ attempts, topics, onStart, onFocus, starting, canStart, fullQuestionCount }: {
    attempts: PmpWorkspaceAttempt[]; topics: PmpTopicRow[]; onStart: () => void;
    onFocus: (domain: string) => void; starting: boolean; canStart: boolean; fullQuestionCount: number;
}) {
    const [limit, setLimit] = useState(5);
    const [mode, setMode] = useState<'full' | 'short'>('full');
    const completed = attempts.filter(a => a.status === 'completed' && (mode === 'full' ? (a.mode === 'full' || (!a.mode && a.total_questions === fullQuestionCount)) : (a.mode === 'focused' || (!a.mode && a.total_questions !== fullQuestionCount))));
    const group = completed.slice(0, limit);
    const average = group.length ? Math.round(group.reduce((sum, a) => sum + valuePercent(a), 0) / group.length) : 0;
    const change = group.length > 1 ? valuePercent(group[0]) - valuePercent(group[group.length - 1]) : 0;
    const answeredQuestions = group.reduce((sum, a) => sum + a.answered_count, 0);
    const elapsedSeconds = group.reduce((sum, a) => sum + (a.finished_at ? Math.max(0,
        Math.min(storageDate(a.finished_at).getTime(), storageDate(a.expires_at).getTime()) - storageDate(a.started_at).getTime()) / 1000 : 0), 0);
    const paceSeconds = answeredQuestions ? Math.round(elapsedSeconds / answeredQuestions) : 0;
    const breakdown = studyTopics(topics, completed, limit);
    const weakest = breakdown[0];
    const latest = completed[0];
    const stats = [
        { label: 'Latest score', value: latest ? `${valuePercent(latest)}%` : '—' },
        { label: 'Average score', value: group.length ? `${average}%` : '—' },
        { label: 'Improvement', value: group.length > 1 ? `${change > 0 ? '+' : ''}${change} pts` : '—' },
        { label: 'Avg. pace', value: answeredQuestions ? `${Math.floor(paceSeconds / 60)}m ${String(paceSeconds % 60).padStart(2, '0')}s` : '—' },
        { label: 'Completed mocks', value: `${group.length}` },
    ];
    return <Surface>
        <div className="pm-pmp-section-heading"><div><PagePill>PERFORMANCE</PagePill><h2>Performance and Preparation</h2>
            <div className="pm-pmp-performance-filters"><select aria-label="Exam category" value={mode} onChange={e => setMode(e.target.value as 'full' | 'short')}>
                <option value="full">Full mocks ({fullQuestionCount} questions)</option><option value="short">Short practice</option>
            </select><select aria-label="Performance history range" value={limit} onChange={e => setLimit(Number(e.target.value))}>
                <option value={5}>Last 5 completed</option><option value={10}>Last 10 completed</option><option value={20}>Last 20 completed</option>
            </select></div></div><span className="pm-pmp-sample-tag"><Info size={14}/> Your practice data</span></div>
        <div className="pm-pmp-metric-grid">{stats.map(stat => <Panel key={stat.label} className="pm-pmp-metric"><small>{stat.label}</small><strong>{stat.value}</strong></Panel>)}</div>
        <div className="pm-pmp-analysis-grid"><Panel><h2>Score Trend</h2><ScoreTrend completed={group}/></Panel>
            <Panel><h2>Topic Accuracy</h2>{breakdown.length ? <div className="pm-pmp-table-scroll"><table className="pm-pmp-topic-table"><thead><tr>
                <th>Topic</th><th>Accuracy</th><th>Correct (out of)</th></tr></thead><tbody>
                {breakdown.map(topic => <tr key={topic.topic}><td>{topic.topic}</td><td><strong>{topic.percent}%</strong></td><td>{topic.correct}/{topic.total}</td></tr>)}
            </tbody></table></div> : <p className="pm-pmp-empty">No results for this exam type. Complete a {mode === 'full' ? 'full mock' : 'short practice'} to see accuracy.</p>}</Panel>
        </div>
        <div className="pm-pmp-summary-strip"><Panel><span>Unanswered last mock</span><strong>{latest ? Math.max(0, latest.total_questions - latest.answered_count) : '—'}</strong></Panel>
            <Panel><span>Flagged last mock</span><strong>{latest ? latest.flagged_count : '—'}</strong></Panel></div>
        <div className="pm-pmp-insight"><Sparkles size={28}/><div><h2>Study Insights</h2>
            <p>{latest ? `Based on completed attempt #${latest.id} (${dateLabel(latest.finished_at, true)}). Educational guidance only, not an official pass prediction.` : 'Finish your first exam to receive evidence-based study suggestions.'}</p></div>
            <div><small>Next action</small><strong>{weakest ? `Practice ${weakest.topic} (${weakest.percent}% accuracy)` : 'Start your first mock exam.'}</strong></div>
            {weakest ? <PrimaryAction onClick={() => onFocus(weakest.topic)} disabled={starting || !canStart}>Start Focused Practice <ArrowRight size={16}/></PrimaryAction>
                : <PrimaryAction onClick={onStart} disabled={starting || !canStart}>Start a Mock <ArrowRight size={16}/></PrimaryAction>}
        </div>
    </Surface>;
}

export function PmpHistory({ attempts, initialNextCursor, onStart, starting, canStart, fullQuestionCount }: {
    attempts: PmpWorkspaceAttempt[]; initialNextCursor: number | null;
    onStart: () => void; starting: boolean; canStart: boolean; fullQuestionCount: number;
}) {
    const [status, setStatus] = useState('all');
    const [kind, setKind] = useState('all');
    const [period, setPeriod] = useState('all');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [older, setOlder] = useState<PmpWorkspaceAttempt[]>([]);
    const [nextCursor, setNextCursor] = useState(initialNextCursor);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const now = Date.now();
    const allAttempts = [...attempts, ...older];
    const rows = allAttempts.filter(attempt => {
        const expired = attempt.status === 'in_progress' && !isResumable(attempt);
        if (status !== 'all' && (status === 'expired' ? !expired : attempt.status !== status || expired)) return false;
        if (kind === 'full' && !(attempt.mode === 'full' || (!attempt.mode && attempt.total_questions === fullQuestionCount))) return false;
        if (kind === 'short' && !(attempt.mode === 'focused' || (!attempt.mode && attempt.total_questions !== fullQuestionCount))) return false;
        if (period !== 'all' && now - storageDate(attempt.started_at).getTime() > Number(period) * 86400000) return false;
        return true;
    });
    const loadOlder = async () => {
        if (loadingOlder || !nextCursor) return;
        setLoadingOlder(true);
        setHistoryError('');
        try {
            const response = await fetch(`/exams/pmp/history?before=${nextCursor}`, {
                method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Could not load older exams. Please try again.');
            const page: { attempts: PmpWorkspaceAttempt[]; nextCursor: number | null } = await response.json();
            if (!Array.isArray(page.attempts)) throw new Error('The history response was invalid.');
            setOlder(current => {
                const known = new Set([...attempts, ...current].map(item => item.id));
                return [...current, ...page.attempts.filter(item => !known.has(item.id))];
            });
            setNextCursor(page.nextCursor);
        } catch (error) {
            setHistoryError(error instanceof Error ? error.message : 'Could not load older exams.');
        } finally {
            setLoadingOlder(false);
        }
    };
    return <Surface>
        <div className="pm-pmp-history-heading"><div><h2>Exam History</h2><p>All dates and times in Bangladesh time (Asia/Dhaka, UTC+06:00).</p></div>
            <PrimaryAction onClick={onStart} disabled={starting || !canStart}><Play size={16} fill="currentColor"/>Start a New Mock Exam</PrimaryAction>
        </div>
        <div className="pm-pmp-history-filters">
            <label><Layers3 size={17}/><select aria-label="Exam type" value={kind} onChange={e => setKind(e.target.value)}>
                <option value="all">All exam types</option><option value="full">Full mocks</option><option value="short">Short practice</option>
            </select><ChevronDown size={16}/></label>
            <label><CheckCircle2 size={17}/><select aria-label="Exam status" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="all">All statuses</option><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="expired">Expired</option>
            </select><ChevronDown size={16}/></label>
            <label><CalendarDays size={17}/><select aria-label="Exam date range" value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="all">Date range</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
            </select><ChevronDown size={16}/></label>
            <span className="pm-pmp-sample-tag"><Info size={14}/> Your own attempts</span>
        </div>
        <div className="pm-pmp-table-scroll"><table className="pm-pmp-history-table"><thead><tr>
            <th>Exam</th><th>Date</th><th>Started</th><th>Finished</th><th>Time Allowed</th><th>Time Used</th><th>Time Left</th><th>Score</th><th>Status</th><th>Action</th>
        </tr></thead><tbody>{rows.map(attempt => {
            const active = isResumable(attempt);
            const expired = attempt.status === 'in_progress' && !active;
            const end = Math.min(storageDate(attempt.expires_at).getTime(),
                attempt.finished_at ? storageDate(attempt.finished_at).getTime() : now);
            const duration = minutesBetween(attempt.started_at, attempt.expires_at);
            const elapsed = Math.min(duration, Math.max(0, Math.round((end - storageDate(attempt.started_at).getTime()) / 60000)));
            return <Fragment key={attempt.id}><tr className={expanded === attempt.id ? 'is-expanded' : undefined}>
                <td><button className="pm-pmp-row-expand" type="button" aria-expanded={expanded === attempt.id}
                    onClick={() => setExpanded(old => old === attempt.id ? null : attempt.id)}>
                    <ChevronDown size={16} className={expanded === attempt.id ? 'is-open' : undefined}/>
                    {attempt.mode === 'full' || (!attempt.mode && attempt.total_questions === fullQuestionCount) ? 'Full Mock' : 'Practice'} #{attempt.id}</button></td>
                <td>{dateLabel(attempt.started_at, true)}</td><td>{timeLabel(attempt.started_at)}</td><td>{timeLabel(attempt.finished_at)}</td>
                <td>{readableDuration(duration)}</td><td>{readableDuration(elapsed)}</td><td>{readableDuration(Math.max(0, duration - elapsed))}</td>
                <td><strong>{attempt.status === 'completed' ? `${valuePercent(attempt)}%` : '—'}</strong></td>
                <td><span className={`pm-pmp-status ${active ? 'is-progress' : 'is-completed'}`}>{expired ? 'Expired' : active ? 'In Progress' : 'Completed'}</span></td>
                <td><SecondaryLink href={active ? `/exams/pmp/attempts/${attempt.id}` : expired ? examResult(attempt.id) : examReview(attempt.id)}>
                    {active ? 'Resume' : expired ? 'View Result' : 'Review'}</SecondaryLink></td>
            </tr>{expanded === attempt.id && <tr className="pm-pmp-details-row"><td colSpan={10}>
                <div className="pm-pmp-history-details" aria-label="Expanded attempt summary">
                    <div><IconTile><Check/></IconTile><span>Answered <strong>{attempt.answered_count} of {attempt.total_questions}</strong></span></div>
                    <div><IconTile><CircleHelp/></IconTile><span>Unanswered <strong>{Math.max(0, attempt.total_questions - attempt.answered_count)}</strong></span></div>
                    <div><IconTile><Bookmark/></IconTile><span>Flagged <strong>{attempt.flagged_count}</strong></span></div>
                </div>
            </td></tr>}</Fragment>;
        })}</tbody></table>{rows.length === 0 && <p className="pm-pmp-empty">No attempts match these filters.</p>}</div>
        {nextCursor && <button type="button" className="pm-pmp-secondary pm-pmp-load-older" onClick={() => void loadOlder()} disabled={loadingOlder}>
            {loadingOlder ? 'Loading...' : 'Load Older Attempts'}
        </button>}
        {historyError && <p className="pm-pmp-action-error" role="alert">{historyError}</p>}
        <p className="pm-pmp-muted">The exam timer runs continuously; there is no pause feature. Elapsed time is capped at the attempt deadline.</p>
    </Surface>;
}

export function PmpAiUsage({ usage, onRefresh, loading = false, error = '' }: {
    usage: PmpAiUsageData; onRefresh?: () => void; loading?: boolean; error?: string;
}) {
    const percent = usage.allocated ? Math.min(100, Math.round(usage.used / usage.allocated * 100)) : 0;
    const labels: Record<string, string> = {
        question_explanation: 'Question explanations', follow_up: 'Follow-up questions',
    };
    return <Surface className="pm-pmp-ai-surface">
        <div className="pm-pmp-ai-top"><span>PMP® Exam Simulator</span><span className="pm-pmp-status is-completed">AI Usage</span>
            <small><Info size={14}/> Server-recorded token activity</small></div>
        <Panel><div className="pm-pmp-ai-lead"><IconTile><Sparkles/></IconTile><div><h2>AI Usage</h2>
            <p>Track the PMP AI tokens allocated and consumed during your current billing cycle.</p></div>
            {onRefresh && <button type="button" className="pm-pmp-secondary pm-pmp-ai-refresh" onClick={onRefresh} disabled={loading}>
                {loading ? 'Refreshing…' : 'Refresh usage'}
            </button>}</div>
            {error && <p className="pm-pmp-action-error" role="alert">{error}</p>}
            {usage.configured === false ? <p className="pm-pmp-muted" role="status">
                AI usage information is unavailable until your plan's PMP AI limits are configured.
            </p> : <>
                <div className="pm-pmp-ai-stats">{[
                    { label: 'Allocated', value: usage.allocated, icon: <Layers3/> },
                    { label: 'Used', value: usage.used, icon: <Coins/> },
                    { label: 'Remaining', value: usage.remaining, icon: <Clock3/> },
                ].map(item => <div key={item.label}><IconTile>{item.icon}</IconTile><span>
                    <strong>{item.value.toLocaleString('en-US')}</strong><small>{item.label}</small></span></div>)}</div>
                <div className="pm-pmp-ai-usage"><div><strong>{percent}% usage</strong>
                    <span>{usage.used.toLocaleString('en-US')} of {usage.allocated.toLocaleString('en-US')} allocated tokens used</span></div>
                    <PercentBar percent={percent}/></div>
                <Panel className="pm-pmp-ai-ledger"><h2>Activity Ledger</h2><p>Completed PMP tutoring requests in this billing cycle.</p>
                    <div className="pm-pmp-ai-ledger-head"><span>AI feature</span><span>Tokens used</span></div>
                    {(['question_explanation', 'follow_up'] as const).map(kind => {
                        const tokens = usage.activity.find(item => item.kind === kind)?.tokens ?? 0;
                        return <div className="pm-pmp-ai-ledger-row" key={kind}><IconTile><CircleHelp/></IconTile>
                            <div><strong>{labels[kind]}</strong></div><b>{tokens.toLocaleString('en-US')}</b>
                        </div>;
                    })}
                </Panel>
                {Boolean(usage.reserved) && <p className="pm-pmp-muted" role="status">{(usage.reserved ?? 0).toLocaleString('en-US')} tokens are temporarily reserved for replies in progress.</p>}
            </>}
        </Panel>
    </Surface>;
}
