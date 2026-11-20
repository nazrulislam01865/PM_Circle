import { Link } from '@inertiajs/react';
import {
    Bookmark, BookOpen, ChevronDown, ClipboardCheck,
    Info, ListFilter, MessageCircle, Reply, Target, ThumbsUp, type LucideIcon,
} from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { ReactionGlyph } from '@/components/home/HomeEngagement';

export type ActivityType = 'exam' | 'post' | 'reply' | 'scenario' | 'save' | 'reaction' | 'lesson' | 'quiz';
export type ActivityFilters = { type: 'all' | ActivityType; range: 'all' | 'today' | '7days' | '30days' | '90days'; sort: 'newest' | 'oldest' };
export type ActivityEntry = {
    id: string; type: ActivityType; detail: string; occurredAt: string; href: string;
    score: number | null; target: 'above' | 'target' | 'below' | null;
};
export type ActivityPage = { items: ActivityEntry[]; nextCursor: string | null };

const activityMeta: Record<ActivityType, { title: string; icon: LucideIcon; tone: string }> = {
    exam: { title: 'Completed PMP mock exam', icon: ClipboardCheck, tone: 'success' },
    post: { title: 'Published a post', icon: MessageCircle, tone: 'blue' },
    reply: { title: 'Replied to a discussion', icon: Reply, tone: 'blue' },
    scenario: { title: 'Submitted a scenario response', icon: Target, tone: 'blue' },
    save: { title: 'Saved a post', icon: Bookmark, tone: 'blue' },
    reaction: { title: 'Reacted to a post', icon: ThumbsUp, tone: 'blue' },
    lesson: { title: 'Completed a lesson', icon: BookOpen, tone: 'blue' },
    quiz: { title: 'Finished a practice quiz', icon: ListFilter, tone: 'warning' },
};

/** One reusable PM Circle control geometry for all Activity Log dropdowns. */
export function ActivitySelect<T extends string>({ label, value, onChange, options, icon: Icon, disabled }: {
    label: string; value: T; onChange: (value: T) => void;
    options: ReadonlyArray<{ value: T; label: string }>;
    icon?: LucideIcon; disabled?: boolean;
}) {
    return <label className="pm-activity-select">
        <span className="sr-only">{label}</span>
        {Icon && <Icon className="pm-activity-select-icon" aria-hidden="true" />}
        <select className="pm-select" aria-label={label} value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value as T)} disabled={disabled}>
            {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="pm-activity-chevron" aria-hidden="true" />
    </label>;
}

function formatTime(date: string) {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}

export function activityDateKey(date: string) {
    const day = new Date(date);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

export function activityDateLabel(key: string) {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(date);
    return key === activityDateKey(new Date().toISOString()) ? `Today, ${formatted}` : formatted;
}

export function ActivityRow({ entry }: { entry: ActivityEntry }) {
    const { title, icon: Icon, tone } = activityMeta[entry.type];
    const isFocused = entry.type === 'exam' && entry.detail === 'Focused PMP practice';
    return <div className="pm-activity-row">
        <div className={`pm-activity-icon is-${tone}`} aria-hidden="true">{entry.type === 'reaction' ? <ReactionGlyph type="like" size={20}/> : <Icon strokeWidth={2} />}</div>
        <div className="pm-activity-row-copy">
            <Link href={entry.href} className="pm-activity-title">{isFocused ? 'Finished PMP practice quiz' : title}</Link>
            <p title={entry.detail}>{entry.detail}</p>
        </div>
        {entry.score !== null && entry.target && <span className={`pm-activity-score is-${entry.target}`}>
            {entry.target === 'above' ? 'Above Target' : entry.target === 'below' ? 'Below Target' : 'Target'} · {entry.score}%
        </span>}
        <time className="pm-activity-time" dateTime={entry.occurredAt}>{formatTime(entry.occurredAt)}</time>
    </div>;
}

export function ActivityGroup({ dateKey, children }: { dateKey: string; children: ReactNode }) {
    return <section className="pm-activity-day" aria-label={`Activity on ${activityDateLabel(dateKey)}`}>
        <h2 className="pm-activity-day-heading">{activityDateLabel(dateKey)}</h2>
        <div className="pm-activity-day-rows">{children}</div>
    </section>;
}

export function ActivityInfo() {
    return <div className="pm-activity-privacy-note"><Info aria-hidden="true" />
        <p>Clearing history hides past entries from your view. Admin records are retained.<br className="pm-activity-note-break" />Activity may be used to personalize recommendations and ads.</p>
    </div>;
}
