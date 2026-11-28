import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { LinkedPagination } from '@/components/pm/Pagination';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EventAction, EventBanner, EventListingRow } from '@/components/events/EventComponents';
import type { EventAdvertisement, EventPage, EventPageContent, EventPreview } from '@/components/events/eventTypes';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import type { RewardPromotionData } from '@/types/reward';

function Advertisements({ advertisements }: { advertisements: EventAdvertisement[] }) {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(true);
    useEffect(() => {
        if (!playing || advertisements.length < 2) return;
        const handle = window.setInterval(() => setIndex(current => (current + 1) % advertisements.length), 7000);
        return () => window.clearInterval(handle);
    }, [playing, advertisements.length]);
    const ad = advertisements[index % Math.max(1, advertisements.length)];
    if (!ad) return null;
    return <section className="pm-event-ad-section" aria-label="Company advertisements">
        <div className="pm-event-ad-top"><span>Company advertisements</span>
            {advertisements.length > 1 && <div className="pm-event-ad-controls" aria-label="Advertisement controls">
                <button type="button" className="pm-guide-button is-outline" onClick={() => setIndex(i => (i + advertisements.length - 1) % advertisements.length)} aria-label="Previous advertisement"><ChevronLeft aria-hidden="true"/></button>
                <span aria-live="polite">{(index % advertisements.length) + 1} / {advertisements.length}</span>
                <button type="button" className="pm-guide-button is-outline" onClick={() => setIndex(i => (i + 1) % advertisements.length)} aria-label="Next advertisement"><ChevronRight aria-hidden="true"/></button>
                <button type="button" className="pm-guide-button is-outline pm-event-ad-pause" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause advertisements' : 'Resume advertisements'}>{playing ? <><Pause aria-hidden="true"/> Pause</> : <><Play aria-hidden="true"/> Play</>}</button>
            </div>}
        </div>
        <article className="pm-event-ad-card" key={ad.title}>
            <div className="pm-event-ad-copy"><div className="pm-event-ad-brand"><span>{ad.initials}</span><strong>{ad.company}</strong></div>
                <p>{ad.category}</p><h2>{ad.title}</h2><p>{ad.description}</p>
                <EventAction href={ad.href} outline>{ad.action}</EventAction>
            </div>
            <img src={ad.image} alt={ad.title} width={700} height={400} loading="lazy" decoding="async" referrerPolicy="no-referrer"/>
        </article>
    </section>;
}

function HostPromotion({ content }: { content: EventPageContent }) {
    return content.host_visible ? <aside className="pm-event-host-promo"><div><strong>{content.host_title}</strong>
        <p>{content.host_description}</p></div><EventAction href="/contact" outline>{content.host_action}</EventAction></aside> : null;
}
type Filters = { search: string; format: string; sort: string };
export default function CommunityEvents({ events, filters, content }: { events: EventPage<EventPreview>; filters: Filters; content: EventPageContent }) {
    const { rewardPromotion, auth, memberShell } = usePage<{ rewardPromotion?: RewardPromotionData | null; auth: { user: { is_admin: boolean } | null }; memberShell?: {featureAccess?: {events?: boolean}} }>().props;
    const [search, setSearch] = useState(filters.search);
    const [format, setFormat] = useState(filters.format);
    const [sort, setSort] = useState(filters.sort);
    useEffect(() => { setSearch(filters.search); setFormat(filters.format); setSort(filters.sort); }, [filters.search, filters.format, filters.sort]);
    function apply(next: Filters) { router.get('/events', next, { preserveState: true, preserveScroll: true, replace: true }); }
    return <PublicLayout siteLayout homePrototype guideLayout eventPrototype homeOfferLabel={rewardPromotion?.discountLabel} banner={{title: content.title, description: content.description, currentLabel: 'Community Events', titleId: 'pm-event-page-title'}}>
        <Head title={`${content.title} | PM Circle`}><meta name="description" content={content.description}/></Head>
        <div className="pm-events-page">
            <LegacyPageHeading><EventBanner title={content.title} crumb="Community Events" description={content.description}/></LegacyPageHeading>
            <div className="pm-event-wrap pm-event-main">
                <Advertisements advertisements={content.advertisements}/>
                <section aria-labelledby="pm-events-heading" className="pm-event-list-section"><div className="pm-event-section-heading"><h2 id="pm-events-heading">Upcoming events</h2><EventAction href={auth.user?.is_admin ? "/admin/events/create" : !auth.user ? "/register" : memberShell?.featureAccess?.events ? "/events/create" : "/membership"}>Create event</EventAction></div>
                    <form className="pm-event-filters" role="search" aria-label="Search and filter events" onSubmit={e => { e.preventDefault(); apply({ search, format, sort }); }}>
                        <label className="pm-guide-field-label">Search events<input className="pm-guide-control" type="search" placeholder="Search by title or topic" maxLength={120} value={search} onChange={e => setSearch(e.target.value)}/></label>
                        <div><label htmlFor="event-filter-format" className="pm-guide-field-label">Format</label><PMDropdown id="event-filter-format" value={format} required placeholder="All formats" options={[{value: 'all', label: 'All formats'}, {value: 'online', label: 'Online'}, {value: 'in-person', label: 'In person'}]} onValueChange={value => { setFormat(value); apply({ search, format: value, sort }); }}/></div>
                        <div><label htmlFor="event-filter-sort" className="pm-guide-field-label">Sort by</label><PMDropdown id="event-filter-sort" value={sort} required placeholder="Sort by" options={[{value: 'soonest', label: 'Soonest first'}, {value: 'latest', label: 'Latest first'}]} onValueChange={value => { setSort(value); apply({ search, format, sort: value }); }}/></div>
                        <button className="pm-guide-button is-outline" type="submit">Search</button>
                    </form>
                    {events.data.length > 0 && <p className="pm-event-count" role="status" aria-live="polite">Showing {events.from}–{events.to} of {events.total} events</p>}
                    {events.data.length > 0 ? <div className="pm-event-list">
                        {events.data.map((event, index) => <div key={event.slug} className="pm-event-row-slot">
                            <EventListingRow event={event}/>
                            {index === 0 && events.current_page === 1 && <HostPromotion content={content}/>}
                        </div>)}
                    </div> : <div className="pm-event-empty"><h3>No matching events</h3><p>Try a different title, topic or event format.</p>
                        <button type="button" className="pm-guide-button is-outline" onClick={() => { setSearch(''); setFormat('all'); setSort('soonest'); apply({ search: '', format: 'all', sort: 'soonest' }); }}>Clear filters</button></div>}
                    {!events.data.length && <HostPromotion content={content}/>}
                    <LinkedPagination links={events.links} label="Event pages"/>
                </section>
            </div>
        </div>
    </PublicLayout>;
}
