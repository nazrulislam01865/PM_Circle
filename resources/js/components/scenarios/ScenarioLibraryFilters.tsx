import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export type ChallengeFilters = {
    tab: 'library' | 'open' | 'discussed' | 'mine';
    search: string;
    topic: string;
    status: 'all' | 'open' | 'closed';
    time: 'all' | '30d' | '3m' | 'year';
    sort: 'latest' | 'oldest' | 'discussed';
};

export function ScenarioLibraryFilters({ filters, topics, statusCounts, onChange, onReset }: {
    filters: ChallengeFilters;
    topics: { name: string; total: number }[];
    statusCounts: { open: number; closed: number };
    onChange: (changes: Partial<ChallengeFilters>) => void;
    onReset: () => void;
}) {
    const [showAll, setShowAll] = useState(false);
    const [expanded, setExpanded] = useState({ topics: true, status: true, time: true });
    const toggle = (name: keyof typeof expanded) => setExpanded(current => ({ ...current, [name]: !current[name] }));
    const visibleTopics = showAll ? topics : topics.slice(0, 5);
    return <aside className="pm-challenge-filter-panel" aria-label="Filter scenarios">
        <h2>Filter Scenarios</h2>
        <div className="pm-challenge-filter-body">
            <section className="pm-challenge-filter-section">
                <button className="pm-challenge-filter-heading" type="button" aria-expanded={expanded.topics} onClick={() => toggle('topics')}>Topic {expanded.topics ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}</button>
                {expanded.topics && <>
                    <div className="pm-challenge-checks">{visibleTopics.map(topic => <label key={topic.name} className="pm-challenge-check"><input type="checkbox" checked={filters.topic === topic.name} onChange={() => onChange({ topic: filters.topic === topic.name ? '' : topic.name })} /><span>{topic.name}</span><span className="pm-challenge-count">({topic.total})</span></label>)}</div>
                    {topics.length > 5 && <button type="button" className="pm-challenge-show-more" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : 'Show more'} {showAll ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}</button>}
                </>}
            </section>
            <section className="pm-challenge-filter-section">
                <button className="pm-challenge-filter-heading" type="button" aria-expanded={expanded.status} onClick={() => toggle('status')}>Status {expanded.status ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}</button>
                {expanded.status && <div className="pm-challenge-checks">
                    <label className="pm-challenge-check"><input type="checkbox" checked={filters.status === 'open'} onChange={() => onChange({ status: filters.status === 'open' ? 'all' : 'open', tab: 'library' })}/><span>Open</span><span className="pm-challenge-count">({statusCounts.open})</span></label>
                    <label className="pm-challenge-check"><input type="checkbox" checked={filters.status === 'closed'} onChange={() => onChange({ status: filters.status === 'closed' ? 'all' : 'closed', tab: 'library' })}/><span>Closed</span><span className="pm-challenge-count">({statusCounts.closed})</span></label>
                </div>}
            </section>
            <section className="pm-challenge-filter-section">
                <button className="pm-challenge-filter-heading" type="button" aria-expanded={expanded.time} onClick={() => toggle('time')}>Time {expanded.time ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}</button>
                {expanded.time && <div className="pm-challenge-checks pm-challenge-radios">
                    {([['all', 'All Time'], ['30d', 'Last 30 Days'], ['3m', 'Last 3 Months'], ['year', 'This Year']] as const).map(([value, label]) => <label className="pm-challenge-check" key={value}><input type="radio" name="challenge-time" checked={filters.time === value} onChange={() => onChange({ time: value })}/><span>{label}</span></label>)}
                </div>}
            </section>
        </div>
        <div className="pm-challenge-filter-footer"><button type="button" onClick={onReset}><RotateCcw size={18} aria-hidden="true"/> Reset Filters</button></div>
    </aside>;
}
