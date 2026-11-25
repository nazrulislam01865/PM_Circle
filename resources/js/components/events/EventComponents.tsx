import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { eventDateParts, eventHref, type EventPreview } from './eventTypes';

export function EventAction({ href, children, outline = false, className = '' }: {
    href: string; children: ReactNode; outline?: boolean; className?: string;
}) {
    if (href.startsWith('https://')) return <a href={href} target="_blank" rel="noopener noreferrer" className={`pm-guide-button${outline ? ' is-outline' : ''}${className ? ` ${className}` : ''}`}>{children}</a>;
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
            {event.sponsored && <div className="pm-event-sponsor-meta"><span>Sponsored event</span><strong>{event.host} · {event.openToEveryone ? 'Open to everyone' : 'For members'}</strong></div>}
            <h3><Link href={eventHref(event.slug)}>{event.title}</Link></h3>
            <p className="pm-event-meta">{date.full} · {event.time} · {event.format === 'online' ? 'Online' : `In person · ${event.location}`}</p>
            <p>{event.description}</p>
        </div>
        <EventAction href={eventHref(event.slug)} className="pm-event-row-action">{event.openToEveryone ? 'View and register' : 'View event'}</EventAction>
    </article>;
}

export function EventFormErrors({ errors }: { errors: object }) {
    const messages = [...new Set(Object.values(errors).flatMap(value => Array.isArray(value) ? value : [value]).filter((value): value is string => typeof value === 'string' && value.length > 0))];
    return messages.length ? <div className="pm-event-input-error" role="alert">{messages.map(message => <p key={message}>{message}</p>)}</div> : null;
}
