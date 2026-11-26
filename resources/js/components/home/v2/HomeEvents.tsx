import { Link, usePage } from '@inertiajs/react';
import { HomeAction, HomeSectionTitle } from './HomeUi';
import { eventDateParts, eventHref, type EventPreview } from '@/components/events/eventTypes';
import type { HomepagePresentation } from '@/types/homepage-presentation';

export function HomeEvents({ content, events }: { content: HomepagePresentation['events']; events: EventPreview[] }) {
    const { auth } = usePage<{auth: {user: {is_admin: boolean} | null}}>().props;
    return <section className="pm-v2-section pm-v2-container pm-v2-events-section" id="pm-v2-events-title" aria-labelledby="pm-v2-event-heading">
        <HomeSectionTitle id="pm-v2-event-heading" title={content.heading}
            description={content.description} actions={<div className="pm-v2-events-heading-actions"><Link href="/events" className="pm-v2-text-link">{content.view_label}</Link><Link className="pm-v2-button" href={auth.user?.is_admin ? '/admin/events/create' : '/events/create'}>{content.create_label}</Link></div>}/>
        <div className="pm-v2-events-list">{events.map(item => { const date = eventDateParts(item.date); return <article className="pm-v2-event pm-event-row-layout" key={item.slug}>
            <div className="pm-v2-event-date pm-event-row-date"><strong>{date.day}</strong><span>{date.month}</span></div>
            <div className="pm-v2-event-copy pm-event-row-copy"><h3>{item.title}</h3><p>{date.full} · {item.time} · {item.location}</p><span>{item.description}</span></div>
            <Link className="pm-v2-button pm-event-row-action" href={eventHref(item.slug)}>{content.card_button}</Link>
        </article>; })}{!events.length && <p>{content.empty_message}</p>}</div>
    </section>;
}

export function HomeJoin({content}: {content: HomepagePresentation['join']}) {
    return <section className="pm-v2-container pm-v2-join-section"><div className="pm-v2-join-banner"><div><h2>{content.heading}</h2><p>{content.description}</p></div>
        <HomeAction href={content.button_url}>{content.button_label}</HomeAction>
    </div></section>;
}
