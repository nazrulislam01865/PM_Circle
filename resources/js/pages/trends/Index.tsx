import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { TrendReportRow } from '@/components/trends/TrendShared';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { LinkedPagination } from '@/components/pm/Pagination';
import type { TrendArticle } from '@/data/pm-trends';
import type { PageResult, TrendListingSettings } from '@/types/public-content';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import '../../../css/pm-trends-public.css';

type Filters = { search: string; topic: string };
type Props = { content: { title: string; description: string }; listing: TrendListingSettings; reports: PageResult<TrendArticle>; topics: string[]; filters: Filters };

function ReportListing({ listing, reports, topics, filters }: Omit<Props, 'content'>) {
    const [search, setSearch] = useState(filters.search);
    function apply(topic: string) {
        router.get('/pm-trends', { search, topic }, { preserveScroll: true, replace: true, only: ['reports', 'filters', 'topics'] });
    }
    return <div className="pm-public-trends-wrap pm-public-trends-list">
        <form className="pm-public-trends-filters" role="search" aria-label="Filter reports" onSubmit={event => { event.preventDefault(); apply(filters.topic); }}>
            <label className="pm-guide-field-label">{listing.searchLabel}<input className="pm-guide-control" type="search" maxLength={120} placeholder={listing.searchPlaceholder} value={search} onChange={event => setSearch(event.target.value)}/></label>
            <div><label htmlFor="trend-topic" className="pm-guide-field-label">{listing.topicLabel}</label><PMDropdown id="trend-topic" value={filters.topic} required placeholder={listing.allTopics} options={[{value: 'all', label: listing.allTopics}, ...topics.map(topic => ({value: topic, label: topic}))]} onValueChange={apply}/></div>
            <button type="submit" className="pm-guide-button is-outline">{listing.searchAction}</button>
        </form>
        <div className="pm-public-trends-results-meta"><p className="pm-public-trends-count" role="status" aria-live="polite">{reports.total} {reports.total === 1 ? 'report' : 'reports'}</p>{(filters.search || filters.topic !== 'all') && <button className="pm-guide-button is-outline" type="button" onClick={() => router.get('/pm-trends', {}, {preserveScroll: true, replace: true, only: ['reports', 'filters', 'topics']})}>{listing.clearAction}</button>}</div>
        <div className="pm-public-trends-rows">{reports.data.length ? reports.data.map(report => <TrendReportRow key={report.slug} article={report}/>) : <p className="pm-public-trends-empty">{listing.emptyText}</p>}</div>
        <LinkedPagination links={reports.links} label="Report pages"/>
    </div>;
}

export default function Index({ content, ...props }: Props) {
    return <PublicLayout siteLayout homePrototype guideLayout active="/pm-trends" banner={{...content, titleId: 'pm-public-trends-title'}}>
        <Head title={content.title}><meta name="description" content={content.description}/></Head>
        <div className="pm-public-trends-page pm-guide-public-shell">
            <LegacyPageHeading><section className="pm-terms-banner" aria-labelledby="pm-public-trends-title"><div className="pm-public-trends-wrap"><nav className="pm-terms-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span aria-current="page">{content.title}</span></nav><h1 id="pm-public-trends-title">{content.title}</h1><p>{content.description}</p></div></section></LegacyPageHeading>
            <ReportListing key={`${props.filters.search}:${props.filters.topic}`} {...props}/></div>
    </PublicLayout>;
}
