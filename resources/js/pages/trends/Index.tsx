import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { TrendReportRow } from '@/components/trends/TrendShared';
import { filterTrendReports, reportTopics, type ReportTopic } from '@/data/pm-trends';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import '../../../css/pm-trends-public.css';

const description = 'Weekly reports on project management, business analysis, technology, AI and other topics shaping how we work.';

function isSaved(slug: string): boolean {
    try {
        return typeof window !== 'undefined' && window.localStorage.getItem(`pm-trend-bookmark-${slug}`) === 'true';
    } catch {
        return false;
    }
}

function ReportListing({ initialSearch }: { initialSearch: string }) {
    const [search, setSearch] = useState(initialSearch);
    const [topic, setTopic] = useState<'All' | ReportTopic>('All');
    const [savedOnly, setSavedOnly] = useState(false);
    const visible = filterTrendReports(search, topic, savedOnly, isSaved);

    return <div className="pm-public-trends-wrap pm-public-trends-list">
        <p className="pm-public-trends-note">AI-generated sample reports for the PM Circle prototype.</p>
        <div className="pm-public-trends-filters" role="group" aria-label="Filter reports">
            <label className="pm-guide-field-label">Search reports
                <input className="pm-guide-control" type="search" placeholder="Search titles or topics" value={search} onChange={event => setSearch(event.target.value)}/>
            </label>
            <label className="pm-guide-field-label">Topic
                <select className="pm-guide-control" value={topic} onChange={event => setTopic(event.target.value as 'All' | ReportTopic)}>
                    <option value="All">All topics</option>
                    {reportTopics.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
            </label>
        </div>
        <label className="pm-public-trends-saved pm-guide-field-label">
            <input type="checkbox" checked={savedOnly} onChange={event => setSavedOnly(event.target.checked)}/>
            Saved reports only
        </label>
        <p className="pm-public-trends-count" role="status">{visible.length} {visible.length === 1 ? 'report' : 'reports'}</p>
        <div className="pm-public-trends-rows">
            {visible.length ? visible.map(report => <TrendReportRow key={report.slug} article={report}/>) :
                <p className="pm-public-trends-empty">{savedOnly ? 'No saved reports match your filters.' : 'No reports match your filters.'}</p>}
        </div>
    </div>;
}

export default function Index() {
    const initialSearch = new URLSearchParams(usePage().url.split('?')[1] ?? '').get('search') ?? '';
    return <PublicLayout siteLayout homePrototype guideLayout active="/pm-trends" banner={{title: 'Trends', description, titleId: 'pm-public-trends-title'}}>
        <Head title="Trends"><meta name="description" content={description}/></Head>
        <div className="pm-public-trends-page pm-guide-public-shell">
            <LegacyPageHeading><section className="pm-terms-banner" aria-labelledby="pm-public-trends-title">
                <div className="pm-public-trends-wrap">
                    <nav className="pm-terms-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">Trends</span></nav>
                    <h1 id="pm-public-trends-title">Trends</h1>
                    <p>{description}</p>
                </div>
            </section></LegacyPageHeading>
            <ReportListing key={initialSearch} initialSearch={initialSearch}/>
        </div>
    </PublicLayout>;
}
