import { Pagination } from '@/components/pm/Pagination';
import { Head } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EventAction, EventBanner, EventListingRow } from '@/components/events/EventComponents';
import type { EventPreview } from '@/components/events/eventTypes';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { usePage } from '@inertiajs/react';
import type { RewardPromotionData } from '@/types/reward';

const PAGE_SIZE = 10;
const advertisements: { company: string; initials: string; category: string; title: string; description: string; image: string; action: string; href: string }[] = [
    { company: 'PM Circle Community', initials: 'PM', category: 'Learning · Workshops', title: 'Learn with project professionals',
        description: 'Explore community practice and discussions with other project professionals.',
        image: '/images/home/prototype/stakeholder.webp', action: 'Explore learning', href: '/learning' },
];

function Advertisements() {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(true);
    useEffect(() => {
        if (!playing || advertisements.length < 2) return;
        const handle = window.setInterval(() => setIndex(current => (current + 1) % advertisements.length), 7000);
        return () => window.clearInterval(handle);
    }, [playing]);
    const ad = advertisements[index];
    return <section className="pm-event-ad-section" aria-label="Company advertisements">
        <div className="pm-event-ad-top"><span>Company advertisements · Sample placements</span>
            {advertisements.length > 1 && <div className="pm-event-ad-controls" aria-label="Advertisement controls">
                <button type="button" className="pm-guide-button is-outline" onClick={() => setIndex(i => (i + advertisements.length - 1) % advertisements.length)} aria-label="Previous advertisement"><ChevronLeft aria-hidden="true"/></button>
                <span aria-live="polite">{index + 1} / {advertisements.length}</span>
                <button type="button" className="pm-guide-button is-outline" onClick={() => setIndex(i => (i + 1) % advertisements.length)} aria-label="Next advertisement"><ChevronRight aria-hidden="true"/></button>
                <button type="button" className="pm-guide-button is-outline pm-event-ad-pause" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause advertisements' : 'Resume advertisements'}>{playing ? <><Pause aria-hidden="true"/> Pause</> : <><Play aria-hidden="true"/> Play</>}</button>
            </div>}
        </div>
        <article className="pm-event-ad-card" key={ad.title}>
            <div className="pm-event-ad-copy"><div className="pm-event-ad-brand"><span>{ad.initials}</span><strong>{ad.company}</strong></div>
                <p>{ad.category}</p><h2>{ad.title}</h2><p>{ad.description}</p>
                <EventAction href={ad.href} outline>{ad.action}</EventAction>
            </div>
            <img src={ad.image} alt="Project professionals collaborating around a table" width={700} height={400} loading="lazy" decoding="async"/>
        </article>
    </section>;
}

function HostPromotion() {
    return <aside className="pm-event-host-promo"><div><strong>Host an event or advertise with PM Circle</strong>
        <p>Contact PM Circle to arrange a company event or promote your products or services in the banner.</p></div>
        <EventAction href="/contact" outline>Contact PM Circle</EventAction></aside>;
}

export default function CommunityEvents({ events }: { events: EventPreview[] }) {
    const { rewardPromotion } = usePage<{ rewardPromotion?: RewardPromotionData | null }>().props;
    const [search, setSearch] = useState('');
    const [format, setFormat] = useState('all');
    const [sort, setSort] = useState('soonest');
    const [page, setPage] = useState(1);
    const filtered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return events.filter(event => (!query || [event.title, event.description, event.category, event.location, event.host ?? ''].join(' ').toLocaleLowerCase().includes(query))
            && (format === 'all' || (format === 'online' ? event.location === 'Online' : event.location !== 'Online')))
            .sort((left, right) => sort === 'latest' ? right.date.localeCompare(left.date) : left.date.localeCompare(right.date));
    }, [events, search, format, sort]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const start = (currentPage - 1) * PAGE_SIZE;
    const visibleEvents = filtered.slice(start, start + PAGE_SIZE);
    const updateSearch = (value: string) => { setSearch(value); setPage(1); };
    const updateFormat = (value: string) => { setFormat(value); setPage(1); };
    const updateSort = (value: string) => { setSort(value); setPage(1); };

    return <PublicLayout siteLayout homePrototype guideLayout eventPrototype homeOfferLabel={rewardPromotion?.discountLabel}>
        <Head title="Community Events | PM Circle"><meta name="description" content="Explore PM Circle community study sessions, discussions, and workshops."/></Head>
        <div className="pm-events-page">
            <EventBanner title="Community Events" crumb="Community Events" description="Browse upcoming study sessions, workshops and discussions. Join member events or register as a guest for events marked Open to everyone."/>
            <div className="pm-event-wrap pm-event-main">
                <Advertisements/>
                <section aria-labelledby="pm-events-heading" className="pm-event-list-section"><h2 id="pm-events-heading">Upcoming events</h2>
                    <div className="pm-event-filters" role="search" aria-label="Search and filter events">
                        <label className="pm-guide-field-label">Search events<input className="pm-guide-control" type="search" placeholder="Search by title or topic" value={search} onChange={e => updateSearch(e.target.value)}/></label>
                        <label className="pm-guide-field-label">Format<select className="pm-guide-control" value={format} onChange={e => updateFormat(e.target.value)}><option value="all">All formats</option><option value="online">Online</option><option value="in-person">In person</option></select></label>
                        <label className="pm-guide-field-label">Sort by<select className="pm-guide-control" value={sort} onChange={e => updateSort(e.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
                    </div>
                    <p className="pm-event-count" role="status" aria-live="polite">{filtered.length ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length} events` : 'No events match your filters'}</p>
                    <div className="pm-event-note"><span>Event listings are sample data for this prototype.</span><a href="/events/project-delivery-career">Preview Premium host view</a></div>
                    {visibleEvents.length > 0 ? <div className="pm-event-list">
                        {visibleEvents.map((event, index) => <div key={event.slug} className="pm-event-row-slot">
                            <EventListingRow event={event}/>
                            {index === 0 && currentPage === 1 && <HostPromotion/>}
                        </div>)}
                    </div> : <div className="pm-event-empty"><h3>No matching events</h3><p>Try a different title, topic or event format.</p>
                        <button type="button" className="pm-guide-button is-outline" onClick={() => { setSearch(''); setFormat('all'); setPage(1); }}>Clear filters</button></div>}
                    <Pagination current={currentPage} last={pageCount} label="Event pages" onPageChange={setPage}/>
                </section>
            </div>
        </div>
    </PublicLayout>;
}
