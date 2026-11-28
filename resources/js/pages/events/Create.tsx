import { Head, Link } from '@inertiajs/react';
import { EventEditor } from '@/components/events/EventEditor';
import type { EventPage, EventSummary } from '@/components/events/eventTypes';
import { LinkedPagination } from '@/components/pm/Pagination';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export default function CreateEvent({ submissions, notice }: { submissions: EventPage<EventSummary>; notice?: string }) {
    return <PublicLayout siteLayout homePrototype guideLayout eventPrototype memberBanner banner={{title: 'Create event', description: 'Submit a community event for administrator review.', parents: [{label: 'Community Events', href: '/events'}], titleId: 'pm-event-page-title'}}><Head title="Create event | PM Circle"/><div className="pm-events-page"><div className="pm-event-wrap pm-event-main pm-event-editor">
        {notice && <div className="pm-event-form-result" role="status">{notice}</div>}
        <EventEditor/>
        <section className="pm-event-detail-panel pm-event-editor"><h2>My event submissions</h2>{submissions.data.length ? submissions.data.map(event => <div key={event.id} className="pm-event-section-heading"><span>{event.status === 'published' ? <Link href={`/events/${event.slug}`}>{event.title}</Link> : event.title}</span><span>{event.status} · <Link href={`/events/host/${event.id}/registrants`}>Registrants</Link></span></div>) : <p>No events submitted yet.</p>}<LinkedPagination links={submissions.links} label="My event pages"/></section>
    </div></div></PublicLayout>;
}
