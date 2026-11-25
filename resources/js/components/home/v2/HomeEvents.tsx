import { Link, usePage } from '@inertiajs/react';
import { HomeAction, HomeSectionTitle } from './HomeUi';
import { referenceText } from './reference';
import { eventDateParts, eventHref, type EventPreview } from '@/components/events/eventTypes';
import type { HomeContent } from '@/types/home';

export function HomeEvents({ join, events }: { join?: NonNullable<HomeContent['careers']>['join']; events: EventPreview[] }) {
    const { auth } = usePage<{auth: {user: {is_admin: boolean} | null}}>().props;
    return <section className="pm-v2-section pm-v2-container pm-v2-events-section" id="pm-v2-events-title" aria-labelledby="pm-v2-event-heading">
        <HomeSectionTitle id="pm-v2-event-heading" title="Community events"
            description="Join study sessions, practical workshops and discussions hosted by members." actions={<div className="pm-v2-events-heading-actions"><Link href="/events" className="pm-v2-text-link">View all events</Link><Link className="pm-v2-button" href={auth.user?.is_admin ? '/admin/events/create' : '/events/create'}>Create event</Link></div>}/>
        <div className="pm-v2-events-list">{events.map(item => { const date = eventDateParts(item.date); return <article className="pm-v2-event pm-event-row-layout" key={item.slug}>
            <div className="pm-v2-event-date pm-event-row-date"><strong>{date.day}</strong><span>{date.month}</span></div>
            <div className="pm-v2-event-copy pm-event-row-copy"><h3>{item.title}</h3><p>{date.full} · {item.time} · {item.location}</p><span>{item.description}</span></div>
            <Link className="pm-v2-button pm-event-row-action" href={eventHref(item.slug)}>View event</Link>
        </article>; })}{!events.length && <p>No upcoming events at the moment.</p>}</div>
        <div className="pm-v2-join-banner"><div><h2>{referenceText(join?.heading, "Don't just manage projects. Grow with people who do.", 'Grow with people who do what you do.')}</h2>
            <p>{referenceText(join?.description, 'Start with one discussion, one lesson, one connection.', 'Join PM Circle and take your first step in learning, practice, or discussion.')}</p></div>
            <HomeAction href={join?.button_url || '/register'}>{referenceText(join?.button_label, 'Become a member — free', 'Join PM Circle free')}</HomeAction>
        </div>
    </section>;
}
