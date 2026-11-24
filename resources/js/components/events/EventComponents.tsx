import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { eventDateParts, eventHref, type EventPreview } from './eventTypes';

export function EventAction({ href, children, outline = false, className = '' }: {
    href: string; children: ReactNode; outline?: boolean; className?: string;
}) {
    return <Link href={href} className={`pm-guide-button${outline ? ' is-outline' : ''}${className ? ` ${className}` : ''}`}>{children}</Link>;
}

export function EventBanner({ title, description, crumb }: { title: string; description: string; crumb: string }) {
    return <section className="pm-event-banner" aria-labelledby="pm-event-page-title"><div className="pm-event-wrap">
        <nav className="pm-event-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span>
            {crumb === 'Community Events' ? <span aria-current="page">Community Events</span> : <><Link href="/events">Community Events</Link><span aria-hidden="true">/</span><span aria-current="page">{crumb}</span></>}
        </nav>
        <h1 id="pm-event-page-title">{title}</h1><p>{description}</p>
    </div></section>;
}

export function EventDateTile({ event }: { event: EventPreview }) {
    const date = eventDateParts(event.date);
    return <div className={`pm-event-date-tile pm-event-row-date${event.sponsored ? ' is-sponsored' : ''}`} aria-hidden="true"><strong>{date.day}</strong><span>{date.month}</span></div>;
}

export function EventListingRow({ event }: { event: EventPreview }) {
    const date = eventDateParts(event.date);
    return <article className={`pm-event-listing-row pm-event-row-layout${event.sponsored ? ' is-sponsored' : ''}`}>
        <EventDateTile event={event}/>
        <div className="pm-event-listing-copy pm-event-row-copy">
            {event.sponsored && <div className="pm-event-sponsor-meta"><span>Sponsored event</span><strong>{event.host} · Open to everyone</strong></div>}
            <h3><Link href={eventHref(event.slug)}>{event.title}</Link></h3>
            <p className="pm-event-meta">{date.full} · {event.time} · {event.location === 'Online' ? 'Online' : `In person · ${event.location}`}</p>
            <p>{event.description}</p>
        </div>
        <EventAction href={eventHref(event.slug)} className="pm-event-row-action">{event.sponsored ? 'View and register' : event.openToEveryone ? 'View event' : 'Join to view event'}</EventAction>
    </article>;
}
