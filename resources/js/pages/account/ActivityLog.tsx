import { Head, Link, router } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, ListFilter, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
    ActivityGroup, ActivityInfo, ActivityRow, ActivitySelect, activityDateKey,
    type ActivityEntry, type ActivityFilters, type ActivityPage,
} from '@/components/activity/ActivityLogParts';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

const typeOptions: ReadonlyArray<{ value: ActivityFilters['type']; label: string }> = [
    { value: 'all', label: 'All activity types' },
    { value: 'exam', label: 'Mock exams' },
    { value: 'post', label: 'Published posts' },
    { value: 'reply', label: 'Discussions' },
    { value: 'scenario', label: 'Scenario responses' },
    { value: 'save', label: 'Saved posts' },
    { value: 'reaction', label: 'Post reactions' },
    { value: 'lesson', label: 'Completed lessons' },
    { value: 'quiz', label: 'Practice quizzes' },
];
const dateOptions: ReadonlyArray<{ value: ActivityFilters['range']; label: string }> = [
    { value: 'all', label: 'All dates' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 days' },
    { value: '30days', label: 'Last 30 days' },
    { value: '90days', label: 'Last 90 days' },
];
const sortOptions: ReadonlyArray<{ value: ActivityFilters['sort']; label: string }> = [
    { value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' },
];

type Group = { dateKey: string; items: ActivityEntry[] };

export default function ActivityLog({ activity, filters }: { activity: ActivityPage; filters: ActivityFilters }) {
    const [entries, setEntries] = useState(activity.items);
    const [cursor, setCursor] = useState(activity.nextCursor);
    const [currentFilters, setCurrentFilters] = useState(filters);
    const [busy, setBusy] = useState<'filter' | 'load' | 'clear' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const requestId = useRef(0);

    const groups = useMemo(() => entries.reduce<Group[]>((result, entry) => {
        const dateKey = activityDateKey(entry.occurredAt);
        const latest = result[result.length - 1];
        if (latest?.dateKey === dateKey) latest.items.push(entry);
        else result.push({ dateKey, items: [entry] });
        return result;
    }, []), [entries]);

    function updateFilters(next: ActivityFilters) {
        if (busy) return;
        const token = ++requestId.current;
        setBusy('filter');
        setError(null);
        setNotice(null);
        router.get('/activity-log', next, {
            only: ['activity', 'filters'], replace: true, preserveScroll: true, preserveState: true,
            onSuccess: (page) => {
                if (requestId.current !== token) return;
                const result = page.props.activity as ActivityPage;
                setEntries(result.items);
                setCursor(result.nextCursor);
                setCurrentFilters(next);
            },
            onError: () => { if (requestId.current === token) setError('Unable to filter activity. Please try again.'); },
            onFinish: () => { if (requestId.current === token) setBusy(null); },
        });
    }

    async function loadMore() {
        if (busy || !cursor) return;
        setBusy('load');
        setError(null);
        const query = new URLSearchParams({ ...currentFilters, cursor });
        try {
            const response = await fetch(`/activity-log/entries?${query}`, {
                credentials: 'same-origin', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) throw new Error('Unable to load additional activity.');
            const page: ActivityPage = await response.json();
            setEntries(previous => {
                const existing = new Set(previous.map(entry => entry.id));
                return [...previous, ...page.items.filter(entry => !existing.has(entry.id))];
            });
            setCursor(page.nextCursor);
        } catch {
            setError('Unable to load additional activity. Please try again.');
        } finally {
            setBusy(null);
        }
    }

    async function clearHistory() {
        if (busy || !entries.length) return;
        if (!window.confirm('Clear your activity history? Previous activity will be hidden only from your view. This cannot be undone.')) return;
        setBusy('clear');
        setError(null);
        setNotice(null);
        try {
            const response = await fetch('/activity-log/history', {
                method: 'DELETE', credentials: 'same-origin', headers: {
                    Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
            });
            if (!response.ok) throw new Error('Could not clear activity history.');
            setEntries([]);
            setCursor(null);
            setNotice('Activity history cleared from your view.');
        } catch {
            setError('Could not clear history. Please try again.');
        } finally {
            setBusy(null);
        }
    }

    return <PublicLayout><Head title="Activity Log" />
        <div className="pm-container pm-page pm-activity-page">
            <div className="pm-activity-heading">
                <div>
                    <nav aria-label="Breadcrumb" className="pm-activity-breadcrumb"><Link href="/settings/profile">Profile</Link><span aria-hidden="true">/</span><span aria-current="page">Activity Log</span></nav>
                    <h1>Activity Log</h1>
                    <p>Review your activity across PM Circle.</p>
                </div>
                <button type="button" className="pm-button pm-button-outline pm-activity-clear" onClick={clearHistory} disabled={busy !== null || !entries.length}>
                    <Trash2 aria-hidden="true" />{busy === 'clear' ? 'Clearing...' : 'Clear history'}
                </button>
            </div>
            <div className="pm-activity-card" aria-busy={busy !== null}>
                <div className="pm-activity-toolbar">
                    <div className="pm-activity-filter-group">
                        <ActivitySelect label="Filter by activity type" value={currentFilters.type} options={typeOptions}
                            onChange={type => updateFilters({ ...currentFilters, type })} disabled={busy !== null}/>
                        <ActivitySelect label="Filter by date" value={currentFilters.range} options={dateOptions} icon={CalendarDays}
                            onChange={range => updateFilters({ ...currentFilters, range })} disabled={busy !== null}/>
                    </div>
                    <ActivitySelect label="Sort activity" value={currentFilters.sort} options={sortOptions} icon={ListFilter}
                        onChange={sort => updateFilters({ ...currentFilters, sort })} disabled={busy !== null}/>
                </div>
                {error && <p role="alert" className="pm-activity-message is-error">{error}</p>}
                {notice && <p role="status" className="pm-activity-message is-success"><CheckCircle2 aria-hidden="true"/>{notice}</p>}
                {entries.length ? <div className="pm-activity-list">
                    {groups.map(group => <ActivityGroup key={group.dateKey} dateKey={group.dateKey}>
                        {group.items.map(item => <ActivityRow key={item.id} entry={item}/>)}
                    </ActivityGroup>)}
                </div> : <div className="pm-activity-empty" role="status">
                    <h2>No activity found</h2>
                    <p>Your recorded activity will appear here. Try a different filter or participate in the community.</p>
                </div>}
                {cursor && <div className="pm-activity-load-more"><button type="button" className="pm-button pm-button-outline pm-activity-more-button" disabled={busy !== null} onClick={loadMore}>{busy === 'load' ? 'Loading...' : 'Load more'}</button></div>}
                <ActivityInfo />
            </div>
        </div>
    </PublicLayout>;
}
