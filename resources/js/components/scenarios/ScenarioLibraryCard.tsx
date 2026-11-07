import { Link, router } from '@inertiajs/react';
import { ArrowRight, Bookmark, LockKeyhole, MessageCircle, ThumbsUp } from 'lucide-react';

export type LibraryScenario = {
    id: number;
    slug: string;
    title: string;
    summary: string;
    topics: string[];
    status: 'published' | 'closed';
    published_at: string;
    responses_count: number;
    likes_count: number;
    viewer_liked?: boolean;
    viewer_bookmarked?: boolean;
};

export function ScenarioLibraryCard({ scenario, featured, canInteract, onJoin, hrefBase = '/scenarios' }: {
    scenario: LibraryScenario;
    featured: boolean;
    canInteract: boolean;
    onJoin: () => void;
    hrefBase?: string;
}) {
    const open = scenario.status === 'published';
    const link = `${hrefBase}/${encodeURIComponent(scenario.slug)}`;
    const published = new Date(scenario.published_at);
    const month = Number.isNaN(published.getTime()) ? '—' : published.toLocaleDateString('en-US', { month: 'short' });
    const day = Number.isNaN(published.getTime()) ? '—' : published.getDate();
    const request = (url: string, isActive: boolean) => {
        if (!canInteract) { onJoin(); return; }
        const options = { preserveScroll: true, preserveState: true };
        if (isActive) router.delete(url, options);
        else router.post(url, url.endsWith('/reactions') ? { type: 'like' } : {}, options);
    };

    return <article className={`pm-challenge-item ${featured ? 'is-featured' : ''}`}>
        <div className="pm-challenge-date-wrap">
            <div className="pm-challenge-date"><span>{month}</span><strong>{day}</strong></div>
            {featured && <span className="pm-challenge-today">Today</span>}
        </div>
        <div className="pm-challenge-item-content">
            <div className="pm-challenge-item-title-row">
                <Link href={link} className="pm-challenge-item-title">{scenario.title}</Link>
                <span className={`pm-challenge-status ${open ? 'is-open' : 'is-closed'}`}>
                    {open ? <span className="pm-challenge-status-dot" aria-hidden="true" /> : <LockKeyhole size={12} aria-hidden="true" />}
                    {open ? 'Open for Discussion' : 'Discussion Closed'}
                </span>
            </div>
            <p className="pm-challenge-item-summary">{scenario.summary}</p>
            <div className="pm-challenge-item-bottom">
                <div className="pm-challenge-topics">{scenario.topics?.map(topic => <span className="pm-challenge-topic" key={topic}>{topic}</span>)}</div>
                {featured ? <Link className="pm-button pm-challenge-read" href={link}>Read &amp; Discuss <ArrowRight size={16} aria-hidden="true" /></Link>
                    : <div className="pm-challenge-metrics">
                        <Link href={link} aria-label={`${scenario.responses_count} responses`}><MessageCircle size={19} /><span>{scenario.responses_count}</span></Link>
                        <button type="button" className={scenario.viewer_liked ? 'is-selected' : ''} aria-label={scenario.viewer_liked ? 'Unlike scenario' : 'Like scenario'} aria-pressed={!!scenario.viewer_liked} onClick={() => request(`/scenarios/${scenario.id}/reactions`, !!scenario.viewer_liked)}><ThumbsUp size={19} /><span>{scenario.likes_count}</span></button>
                        <button type="button" className={scenario.viewer_bookmarked ? 'is-selected' : ''} aria-label={scenario.viewer_bookmarked ? 'Remove bookmark' : 'Bookmark scenario'} aria-pressed={!!scenario.viewer_bookmarked} onClick={() => request(`/scenarios/${scenario.id}/bookmark`, !!scenario.viewer_bookmarked)}><Bookmark size={21} fill={scenario.viewer_bookmarked ? 'currentColor' : 'none'} /></button>
                    </div>}
            </div>
        </div>
    </article>;
}
